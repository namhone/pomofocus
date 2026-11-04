/**
 * Nén ảnh Client-side bằng HTMLCanvasElement xuống tối đa 1600px và ~200-300KB
 * Giúp triệt tiêu lỗi sập trần 4.5MB Payload của Vercel Serverless Function
 */
async function compressImageClient(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.8
): Promise<{ blob: Blob; base64: string }> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      // Môi trường Node.js kiểm thử: fallback đọc trực tiếp
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const comma = res.indexOf(',');
        resolve({ blob: file, base64: comma !== -1 ? res.substring(comma + 1) : res });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const res = reader.result as string;
          const comma = res.indexOf(',');
          return resolve({ blob: file, base64: comma !== -1 ? res.substring(comma + 1) : res });
        }

        ctx.drawImage(img, 0, 0, width, height);

        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              const res = reader.result as string;
              const comma = res.indexOf(',');
              return resolve({ blob: file, base64: comma !== -1 ? res.substring(comma + 1) : res });
            }
            const dataUrl = canvas.toDataURL(mime, quality);
            const comma = dataUrl.indexOf(',');
            const base64 = comma !== -1 ? dataUrl.substring(comma + 1) : dataUrl;
            resolve({ blob, base64 });
          },
          mime,
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

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

  static setActiveConversationId(id: string | null): void {
    this.activeConversationId = id;
  }

  static getActiveConversationId(): string | null {
    return this.activeConversationId;
  }

  /**
   * Tải toàn bộ danh sách phiên chat của người dùng từ Supabase Cloud
   */
  static async fetchConversations(userId: string): Promise<AiConversation[]> {
    if (!userId) return [];
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error || !Array.isArray(data)) {
        return [];
      }
      return data as AiConversation[];
    } catch (err) {
      console.warn('[AiChatService] Lỗi fetchConversations:', err);
      return [];
    }
  }

  /**
   * Tạo cuộc trò chuyện mới trên Supabase Cloud
   */
  static async createConversation(userId: string, title: string = 'Phiên học tập mới'): Promise<AiConversation> {
    const newConvId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newConv: AiConversation = {
      id: newConvId,
      user_id: userId,
      title: title.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const { data } = await supabase.from('ai_conversations').insert(newConv);
      this.activeConversationId = (data as AiConversation)?.id || newConvId;
      return (data as AiConversation) || newConv;
    } catch (err) {
      console.warn('[AiChatService] Lỗi createConversation:', err);
      this.activeConversationId = newConvId;
      return newConv;
    }
  }

  /**
   * Xóa một cuộc trò chuyện trên Supabase Cloud
   */
  static async deleteConversation(conversationId: string): Promise<boolean> {
    if (!conversationId) return false;
    try {
      if (this.activeConversationId === conversationId) {
        this.activeConversationId = null;
      }
      await supabase.from('ai_messages').delete().eq('conversation_id', conversationId);
      const { error } = await supabase.from('ai_conversations').delete().eq('id', conversationId);
      return !error;
    } catch (err) {
      console.warn('[AiChatService] Lỗi deleteConversation:', err);
      return false;
    }
  }

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
      const created = await this.createConversation(userId, 'Phiên học tập mới');
      this.activeConversationId = created.id;
      return this.activeConversationId;
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

      // Cập nhật updated_at và tự động đặt tiêu đề gợi nhớ nếu là câu hỏi đầu tiên
      try {
        if (record.role === 'user' && record.content) {
          const shortTitle = record.content.trim().slice(0, 36);
          await supabase
            .from('ai_conversations')
            .update({
              title: shortTitle,
              updated_at: new Date().toISOString()
            })
            .eq('id', record.conversation_id)
            .eq('title', 'Phiên học tập mới');
        } else {
          await supabase
            .from('ai_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', record.conversation_id);
        }
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

    // Nếu là file ảnh: Tự động nén qua Canvas xuống tối đa 1600px và ~200-300KB
    let uploadPayload: File | Blob = file;
    let base64Data: string;

    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageClient(file, 1600, 0.8);
        uploadPayload = compressed.blob;
        base64Data = compressed.base64;
      } catch {
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const commaIdx = result.indexOf(',');
            resolve(commaIdx !== -1 ? result.substring(commaIdx + 1) : result);
          };
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });
      }
    } else {
      base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const commaIdx = result.indexOf(',');
          resolve(commaIdx !== -1 ? result.substring(commaIdx + 1) : result);
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    }

    // Upload lên bucket ai-attachments
    let publicUrl: string | undefined;
    try {
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${userId}/${Date.now()}_${cleanFileName}`;
      const { error: uploadError } = await supabase.storage
        .from('ai-attachments')
        .upload(storagePath, uploadPayload, { contentType: file.type, upsert: true });

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
