/**
 * AI CHAT & STORAGE SERVICE (SUPABASE PERSISTENCE & MULTIMODAL)
 * ==============================================================================
 * Quản lý đồng bộ lịch sử hội thoại trên Cloud Supabase (ai_conversations, ai_messages)
 * và upload tài liệu/đề cương lên bucket ai-attachments.
 */

import { supabase } from '../lib/supabase';

export interface AiConversation {
  id: string;
  user_id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
}

export interface AiMessageRecord {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  action_type?: string;
  credits_used?: number;
  attachment_url?: string;
  attachment_name?: string;
  is_truncated?: boolean;
  created_at?: string;
}

export interface AiAttachmentInfo {
  fileName: string;
  mimeType: string;
  base64Data: string;
  fileSize: number;
  publicUrl?: string;
}

export class AiChatService {
  private static activeConversationId: string | null = null;

  /**
   * Khởi tạo hoặc lấy cuộc trò chuyện đang hoạt động của người dùng
   */
  static async getOrCreateActiveConversation(userId: string): Promise<string> {
    if (this.activeConversationId) {
      return this.activeConversationId;
    }

    try {
      // 1. Tìm cuộc trò chuyện mới nhất
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (!error && Array.isArray(data) && data.length > 0 && data[0].id) {
        this.activeConversationId = data[0].id;
        return this.activeConversationId!;
      }

      // 2. Nếu chưa có, tạo mới
      const newConvId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const { data: created } = await supabase.from('ai_conversations').insert({
        id: newConvId,
        user_id: userId,
        title: 'Phiên học tập mới',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      this.activeConversationId = created?.id || newConvId;
      return this.activeConversationId!;
    } catch (err) {
      console.warn('[AiChatService] Không thể kết nối Supabase ai_conversations, dùng ID cục bộ:', err);
      this.activeConversationId = `local_conv_${Date.now()}`;
      return this.activeConversationId;
    }
  }

  /**
   * Tải danh sách tin nhắn của cuộc trò chuyện
   */
  static async loadConversationMessages(conversationId: string): Promise<AiMessageRecord[]> {
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error || !Array.isArray(data)) {
        return [];
      }

      return data as AiMessageRecord[];
    } catch (err) {
      console.warn('[AiChatService] Lỗi nạp tin nhắn từ Supabase:', err);
      return [];
    }
  }

  /**
   * Lưu tin nhắn lên Supabase Cloud
   */
  static async saveMessage(record: Omit<AiMessageRecord, 'created_at'>): Promise<AiMessageRecord | null> {
    const payload: AiMessageRecord = {
      ...record,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('ai_messages').insert(payload);
      if (error) {
        console.warn('[AiChatService] Lỗi lưu tin nhắn Supabase:', error.message);
        return payload;
      }

      // Cập nhật updated_at cho conversation
      try {
        await supabase
          .from('ai_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', record.conversation_id);
      } catch {}

      return (data as AiMessageRecord) || payload;
    } catch (err) {
      console.warn('[AiChatService] Không thể ghi tin nhắn Supabase:', err);
      return payload;
    }
  }

  /**
   * Chuyển đổi File sang Base64 và upload lên Supabase Storage
   */
  static async processAttachment(file: File, userId: string): Promise<AiAttachmentInfo> {
    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error(`Kích thước file (${(file.size / 1024 / 1024).toFixed(1)}MB) vượt quá giới hạn cho phép (tối đa 10MB).`);
    }

    // Đọc Base64 data
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Bỏ data URI prefix: data:mimeType;base64,...
        const commaIdx = result.indexOf(',');
        resolve(commaIdx !== -1 ? result.substring(commaIdx + 1) : result);
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });

    // Upload lên bucket ai-attachments
    let publicUrl: string | undefined;
    try {
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${userId}/${Date.now()}_${cleanFileName}`;
      const { error: uploadError } = await supabase.storage
        .from('ai-attachments')
        .upload(storagePath, file, { contentType: file.type, upsert: true });

      if (!uploadError) {
        const { data } = supabase.storage.from('ai-attachments').getPublicUrl(storagePath);
        publicUrl = data.publicUrl;
      }
    } catch (storageErr) {
      console.warn('[AiChatService] Upload bucket ai-attachments bỏ qua hoặc chưa khởi tạo:', storageErr);
    }

    return {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      base64Data,
      fileSize: file.size,
      publicUrl
    };
  }
}
