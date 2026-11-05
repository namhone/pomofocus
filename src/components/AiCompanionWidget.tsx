import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Zap,
  Copy,
  Check,
  RotateCcw,
  X,
  AlertTriangle,
  Bot,
  User,
  Paperclip,
  FileCheck,
  Play,
  Plus,
  History,
  Trash2
} from 'lucide-react';
import { useAiStore, AiActionType, AI_CREDIT_COSTS, isOwnerAiUser } from '../stores/useAiStore';
import { useNoteStore } from '../stores/useNoteStore';
import { useAuthStore } from '../stores/useAuthStore';
import { AiChatService, AiAttachmentInfo } from '../services/aiChatService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/**
 * Trình phân giải & kết xuất công thức toán học KaTeX và Markdown chuẩn mực cho AI Companion
 */
export const FormattedAiMessage: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="prose prose-invert max-w-none text-xs leading-relaxed select-text font-sans break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-zinc-200">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1 text-zinc-200">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-zinc-200">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => <h3 className="text-sm font-bold text-cyan-300 mt-2.5 mb-1">{children}</h3>,
          h2: ({ children }) => <h3 className="text-sm font-bold text-cyan-300 mt-2 mb-1">{children}</h3>,
          h3: ({ children }) => <h3 className="text-xs font-bold text-cyan-300 mt-2 mb-1">{children}</h3>,
          h4: ({ children }) => <h4 className="text-xs font-semibold text-cyan-200 mt-1.5 mb-1">{children}</h4>,
          hr: () => <hr className="border-zinc-800 my-2" />,
          code: ({ className, children, ...props }: any) => {
            const isBlock = Boolean(className) || String(children).includes('\n');
            return isBlock ? (
              <pre className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg overflow-x-auto my-2 text-xs font-mono text-emerald-300">
                <code {...props}>{children}</code>
              </pre>
            ) : (
              <code className="bg-zinc-800/80 px-1.5 py-0.5 rounded text-[11px] font-mono text-pink-300 border border-zinc-700/50" {...props}>
                {children}
              </code>
            );
          },
          span: ({ className, children, ...props }: any) => {
            if (className?.includes('katex-display')) {
              return (
                <div data-testid="ai-latex-block" className="my-2 p-2 rounded-xl bg-zinc-950/80 border border-cyan-500/30 overflow-x-auto text-center shadow-inner select-all">
                  <span className={className} {...props}>{children}</span>
                </div>
              );
            }
            if (className?.includes('katex')) {
              return (
                <span data-testid="ai-latex-inline" className={`${className} select-all`} {...props}>
                  {children}
                </span>
              );
            }
            return <span className={className} {...props}>{children}</span>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const AiCompanionWidget: React.FC = () => {
  const { user } = useAuthStore();
  const isOwner = Boolean(
    (user && (user.email === 'namho03052k9@gmail.com' || user.email === 'huyentrantt09@gmail.com' || user.email === 'tony31082009@gmail.com')) ||
    isOwnerAiUser()
  );
  const {
    isOpen,
    toggleOpen,
    aiCreditsBalance,
    aiPlan,
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    continueGenerating,
    clearChat,
    initConversation,
    sessions,
    createNewSession,
    loadSession,
    deleteSession,
    openTopupModal
  } = useAiStore();

  const [inputPrompt, setInputPrompt] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedNoteId, setInsertedNoteId] = useState<string | null>(null);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    prompt: string;
    actionType: AiActionType;
    cost: number;
  } | null>(null);

  // Attachment state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentInfo, setAttachmentInfo] = useState<AiAttachmentInfo | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Khởi tạo cuộc trò chuyện khi widget mở và user đã đăng nhập
  useEffect(() => {
    if (isOpen && user?.id) {
      initConversation(user.id);
      useAiStore.getState().refreshCreditsFromCloud(user.id);
    }
  }, [isOpen, user?.id]);

  // Tự động cuộn xuống đáy khi có tin nhắn mới hoặc streaming
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
    }
  }, [messages, isOpen, isLoading, isStreaming]);

  // Focus ô nhập khi mở
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // if (!isOpen) return null; // Giữ trong DOM để kích hoạt CSS Transition trượt mượt mà (slide-over animation)

  
  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.warn('Lỗi sao chép văn bản:', err);
    }
  };

  const handleInsertToNote = async (text: string, msgId: string) => {
    try {
      const store = useNoteStore.getState();
      let targetNote = store.notes.find((n) => n.id === store.activeNoteId) || store.notes[0];

      if (!targetNote) {
        targetNote = await store.createNote('Ghi chú từ AI Companion');
      }

      const separator = targetNote.contentMarkdown ? '\n\n---\n### 💡 Trợ lý AI giải đáp:\n' : '### 💡 Trợ lý AI giải đáp:\n';
      const updatedContent = `${targetNote.contentMarkdown}${separator}${text}`;

      store.updateNoteContent(targetNote.id, updatedContent);
      await store.saveNow(targetNote.id);

      setInsertedNoteId(msgId);
      setTimeout(() => setInsertedNoteId(null), 2500);
    } catch (err) {
      console.warn('Lỗi chèn vào ghi chú:', err);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setIsProcessingFile(true);
    try {
      const processed = await AiChatService.processAttachment(file, user?.id || 'guest');
      setSelectedFile(file);
      setAttachmentInfo(processed);
    } catch (err: any) {
      setFileError(err.message || 'Lỗi xử lý file đính kèm.');
      setSelectedFile(null);
      setAttachmentInfo(null);
    } finally {
      setIsProcessingFile(false);
      // Reset input value để chọn lại file cũ được
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setAttachmentInfo(null);
    setFileError(null);
  };

  const executeSendMessage = async (
    textToSend: string,
    effectiveAction: AiActionType,
    attachmentPayload?: AiAttachmentInfo
  ) => {
    const cost = isOwner ? 0 : (AI_CREDIT_COSTS[effectiveAction] || 1);
    if (!isOwner && aiCreditsBalance < cost) {
      openTopupModal();
      return;
    }

    setInputPrompt('');
    handleRemoveFile();

    try {
      await sendMessage(textToSend, effectiveAction, attachmentPayload);
    } catch (e) {
      console.warn('Lỗi gửi tin nhắn AI:', e);
    }
  };

  const handleSend = async (action: AiActionType = 'chat', customText?: string) => {
    const textToSend = customText !== undefined ? customText : inputPrompt;
    if (!textToSend.trim() && !attachmentInfo) return;

    const effectiveAction = attachmentInfo ? 'multimodal' : action;
    const lower = textToSend.toLowerCase();
    const isHighCost =
      effectiveAction === 'summarize' ||
      effectiveAction === 'quiz' ||
      lower.includes('tóm tắt') ||
      lower.includes('trắc nghiệm') ||
      lower.includes('quiz') ||
      lower.includes('đề thi');

    if (isHighCost && !customText && !attachmentInfo) {
      const determinedAction: AiActionType =
        lower.includes('trắc nghiệm') || lower.includes('quiz') ? 'quiz' : 'summarize';
      const cost = AI_CREDIT_COSTS[determinedAction];
      setPendingConfirmation({
        prompt: textToSend,
        actionType: determinedAction,
        cost
      });
      return;
    }

    await executeSendMessage(textToSend, effectiveAction, attachmentInfo || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend('chat');
    }
  };

  return (
    <>
      {/* Lớp nền mờ tối khi mở AI trên màn hình nhỏ (Mobile Backdrop) */}
      <div
        data-testid="ai-backdrop"
        className={`fixed inset-0 top-14 z-30 bg-black/50 backdrop-blur-xs transition-opacity duration-300 sm:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => toggleOpen(false)}
        aria-hidden="true"
      />

      {/* Khung chat AI Companion với hiệu ứng trượt mượt mà (Linear / Apple slide-over) */}
      <div
        data-testid="ai-companion-drawer"
        aria-hidden={!isOpen}
        className={`fixed top-14 bottom-0 right-0 z-40 w-full sm:w-[420px] max-w-full bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800 shadow-[-20px_0_50px_rgba(0,0,0,0.6)] flex flex-col will-change-transform transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
          isOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : 'translate-x-full opacity-0 pointer-events-none'
        }`}
      >
      {/* 1. Header 1 Hàng Ngang Tinh Gọn (Tránh chèn ép, đảm bảo khoảng cách thông thoáng) */}
      <div className="h-14 px-3 sm:px-4 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 shrink-0 gap-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <div className="relative shrink-0">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Sparkles size={14} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-zinc-950 rounded-full" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate" title="AI Study Companion">
              AI Study Companion
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Cụm hiển thị số dư ⚡ Gom 1 Badge Duy Nhất Monospace Không Đè Text */}
          <button
            type="button"
            data-testid="ai-credits-topup-btn"
            onClick={openTopupModal}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 text-[11px] font-medium cursor-pointer transition-all select-none shrink-0"
            title="Bấm để nạp thêm AI Credits (Chiết khấu tới 45%)"
          >
            <Zap size={11} className="fill-amber-400 text-amber-400 shrink-0" />
            <span className="font-mono text-[11px] font-semibold" data-testid="ai-hud-credits">
              <span data-testid="ai-credits-badge">
                {isOwner
                  ? '⚡ ∞ / Vô Hạn'
                  : aiPlan === 'lifetime'
                  ? `VIP ${aiCreditsBalance.toLocaleString('vi-VN')}⚡`
                  : `${aiCreditsBalance.toLocaleString('vi-VN')}⚡`}
              </span>
            </span>
          </button>

          {/* Nút Tạo đoạn chat mới */}
          <button
            type="button"
            data-testid="ai-new-chat-btn"
            onClick={() => createNewSession()}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition cursor-pointer"
            title="Tạo đoạn chat mới"
          >
            <Plus size={14} />
          </button>

          {/* Nút Lịch sử trò chuyện */}
          <button
            type="button"
            data-testid="ai-history-btn"
            onClick={() => setShowHistoryDropdown((prev) => !prev)}
            className={`p-1 rounded-md transition cursor-pointer ${
              showHistoryDropdown
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
            title="Lịch sử cuộc trò chuyện"
          >
            <History size={14} />
          </button>

          {/* Nút Làm mới phiên chat */}
          <button
            type="button"
            data-testid="ai-clear-chat-btn"
            onClick={clearChat}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition cursor-pointer"
            title="Làm mới cuộc trò chuyện"
            aria-label="Làm mới cuộc trò chuyện"
          >
            <RotateCcw size={14} />
          </button>

          {/* Nút đóng ✕ */}
          <button
            type="button"
            data-testid="ai-close-drawer-btn ai-btn-close-drawer"
            onClick={() => toggleOpen(false)}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition cursor-pointer ml-0.5"
            title="Đóng (Esc)"
            aria-label="Đóng cửa sổ"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Dropdown Lịch Sử Cuộc Trò Chuyện Kính Mờ */}
      {showHistoryDropdown && (
        <div
          data-testid="ai-history-dropdown"
          className="absolute top-14 right-3 w-72 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-2xl p-2.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1.5"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-xs font-semibold text-zinc-300">
            <span className="flex items-center gap-1.5">
              <History size={13} className="text-cyan-400" />
              Lịch sử trò chuyện
            </span>
            <button
              type="button"
              onClick={() => {
                createNewSession();
                setShowHistoryDropdown(false);
              }}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
            >
              + Tạo mới
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {(!sessions || sessions.length === 0) ? (
              <div className="text-[11px] text-zinc-400 text-center py-4">
                Chưa có phiên trò chuyện nào được lưu.
              </div>
            ) : (
              sessions.map((sess) => (
                <div
                  key={sess.id}
                  data-testid={`ai-session-item-${sess.id}`}
                  className="group flex items-center justify-between p-2 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-xs transition cursor-pointer"
                  onClick={() => {
                    loadSession(sess.id);
                    setShowHistoryDropdown(false);
                  }}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="text-zinc-200 font-medium truncate text-xs">
                      {sess.title || 'Cuộc trò chuyện'}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {new Date(sess.createdAt).toLocaleDateString('vi-VN')} {new Date(sess.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid={`ai-delete-session-${sess.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(sess.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                    title="Xóa phiên này"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. Vùng Cuộn Tin Nhắn (Scrollable Messages Area) */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-3.5">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          if (isUser) {
            return (
              <div key={msg.id} className="flex gap-2.5 justify-end">
                <div className="max-w-[85%] rounded-2xl p-3.5 bg-zinc-800/80 border border-zinc-700/50 text-zinc-100 text-xs leading-relaxed shadow-sm">
                  {/* File đính kèm nếu có */}
                  {msg.attachmentName && (
                    <div className="mb-2 bg-zinc-900/80 border border-cyan-500/30 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 text-cyan-300">
                      <FileCheck size={13} className="text-cyan-400 shrink-0" />
                      <span className="font-medium truncate max-w-[200px]">{msg.attachmentName}</span>
                      <span className="text-[10px] text-zinc-400 ml-auto">Đề cương đính kèm</span>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap select-text">{msg.content}</div>
                </div>

                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={13} />
                </div>
              </div>
            );
          }

          // AI Message
          const isThinking = !msg.content;

          return (
            <div key={msg.id} className="flex gap-2.5 justify-start">
              <div className="w-6 h-6 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={13} />
              </div>

              <div className="max-w-[85%] rounded-2xl p-3.5 bg-zinc-900/40 border border-zinc-800/50 text-zinc-200 text-xs leading-relaxed shadow-xs">
                {isThinking ? (
                  <div className="flex items-center gap-1.5 text-zinc-400 text-xs py-1">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse delay-100">●</span>
                    <span className="animate-pulse delay-200">●</span>
                    <span className="ml-1 text-zinc-400">Gia sư đang phân tích...</span>
                  </div>
                ) : (
                  <>
                    <FormattedAiMessage content={msg.content} />

                    {/* Nút Viết Tiếp... Nếu chạm trần Tokens */}
                    {msg.isTruncated && (
                      <div className="pt-2 mt-2 border-t border-zinc-800/80">
                        <button
                          type="button"
                          data-testid="ai-continue-btn"
                          onClick={continueGenerating}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition cursor-pointer"
                        >
                          <Play size={12} className="fill-cyan-300" />
                          ▶️ Viết tiếp câu trả lời...
                        </button>
                      </div>
                    )}

                    {/* Chân phản hồi AI: Cụm nút hành động tinh tế nằm gọn ở góc dưới */}
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/[0.06] text-[11px] text-zinc-400">
                      <div className="flex items-center gap-2">
                        {/* Nút Sao chép */}
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition cursor-pointer"
                          title="Sao chép câu trả lời"
                          aria-label="Sao chép vào bộ nhớ tạm"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={11} className="text-emerald-400" />
                              <span className="text-[10px] text-emerald-400">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span className="text-[10px]">Sao chép</span>
                            </>
                          )}
                        </button>

                        {/* Nút 📌 Chèn vào Ghi chú */}
                        <button
                          type="button"
                          data-testid="ai-insert-note-btn"
                          onClick={() => handleInsertToNote(msg.content, msg.id)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition cursor-pointer"
                          title="Chèn nội dung giải đáp này vào Ghi chú đang mở"
                        >
                          {insertedNoteId === msg.id ? (
                            <>
                              <Check size={11} className="text-emerald-400" />
                              <span className="text-[10px] text-emerald-400">Đã chèn vào Ghi chú</span>
                            </>
                          ) : (
                            <span className="text-[10px]">📌 Chèn vào Ghi chú</span>
                          )}
                        </button>
                      </div>

                      {/* Nhãn mờ Đã dùng -X⚡ (Chỉ hiện khi trợ lý trừ điểm > 0) */}
                      {msg.role === 'assistant' && typeof msg.creditsUsed === 'number' && msg.creditsUsed > 0 && (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Đã dùng -{msg.creditsUsed}⚡
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* 3 Quick Suggestion Chips khi mới bắt đầu cuộc trò chuyện */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-8">
            <button
              type="button"
              onClick={() => {
                setInputPrompt('Giải bài tập: ');
                inputRef.current?.focus();
              }}
              className="px-2.5 py-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-300 hover:text-white text-[11px] transition cursor-pointer whitespace-nowrap shrink-0"
            >
              📐 Giải bài tập
            </button>
            <button
              type="button"
              onClick={() => {
                setInputPrompt('Tóm tắt bài học: ');
                inputRef.current?.focus();
              }}
              className="px-2.5 py-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-300 hover:text-white text-[11px] transition cursor-pointer whitespace-nowrap shrink-0"
            >
              📝 Tóm tắt
            </button>
            <button
              type="button"
              onClick={() => {
                setInputPrompt('Tạo 5 câu trắc nghiệm ôn thi: ');
                inputRef.current?.focus();
              }}
              className="px-2.5 py-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-300 hover:text-white text-[11px] transition cursor-pointer whitespace-nowrap shrink-0"
            >
              ❓ Tạo trắc nghiệm
            </button>
          </div>
        )}

        {/* Loading fallback nếu isLoading mà chưa có assistant message trong danh sách */}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-6 h-6 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
              <Bot size={13} />
            </div>
            <div className="max-w-[85%] rounded-2xl p-3.5 bg-zinc-900/40 border border-zinc-800/50 text-zinc-200 text-xs leading-relaxed shadow-xs">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs py-1">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse delay-100">●</span>
                <span className="animate-pulse delay-200">●</span>
                <span className="ml-1 text-zinc-500">Gia sư đang phân tích...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>{error}</p>
              {aiCreditsBalance <= 0 && (
                <button
                  type="button"
                  data-testid="ai-error-billing-link"
                  onClick={openTopupModal}
                  className="font-bold underline text-amber-300 hover:text-amber-200 cursor-pointer block text-[11px]"
                >
                  Nạp thêm AI Credits ngay chỉ từ 19.000đ →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Inline Confirmation Card khi có yêu cầu tốn nhiều credits */}
        {pendingConfirmation && (
          <div
            data-testid="ai-confirmation-box"
            className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-cyan-500/10 border border-amber-500/30 text-xs shadow-lg space-y-2.5 animate-in fade-in"
          >
            <div className="flex items-start gap-2">
              <Zap size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-zinc-100">
                  Xác nhận thực hiện tác vụ chuyên sâu
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Tác vụ này yêu cầu <span className="font-bold text-amber-300">-{pendingConfirmation.cost}⚡ Credits</span>. Bạn có muốn tiếp tục không?
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                data-testid="ai-confirm-action-btn"
                onClick={() => {
                  const { prompt, actionType } = pendingConfirmation;
                  setPendingConfirmation(null);
                  executeSendMessage(prompt, actionType);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              >
                <Zap size={12} className="fill-zinc-950" />
                <span>⚡ Xác nhận thực hiện (-{pendingConfirmation.cost}⚡)</span>
              </button>
              <button
                type="button"
                data-testid="ai-cancel-action-btn"
                onClick={() => setPendingConfirmation(null)}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition cursor-pointer"
              >
                Để sau
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Khung Nhập Liệu & Đính Kèm File (Safe Area Mobile & Clean Desktop) */}
      <div className="relative z-10 p-3 pb-4 bg-zinc-950/98 backdrop-blur-2xl border-t border-zinc-800/80 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {/* File Preview Pill nếu có file được chọn */}
        {selectedFile && (
          <div className="mb-2 p-2 rounded-xl bg-zinc-900 border border-cyan-500/40 flex items-center justify-between text-xs text-zinc-200">
            <div className="flex items-center gap-2 truncate max-w-[340px]">
              <Paperclip size={14} className="text-cyan-400 shrink-0" />
              <span className="font-medium truncate">{selectedFile.name}</span>
              <span className="text-[10px] text-zinc-500">
                ({(selectedFile.size / 1024).toFixed(0)} KB)
              </span>
              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                -5⚡
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              title="Xóa file đính kèm"
              aria-label="Xóa file đính kèm"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {fileError && (
          <div className="mb-2 text-[11px] text-rose-400 px-1">
            ⚠️ {fileError}
          </div>
        )}

        {/* Input ẩn để chọn file */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.doc,.jpg,.jpeg,.png,.webp,.pdf,text/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isOwner && aiCreditsBalance < 1) {
              openTopupModal();
              return;
            }
            handleSend('chat');
          }}
          className="relative flex items-center gap-1.5 rounded-xl bg-[#0e0e10] border border-zinc-800 focus-within:border-cyan-500/60 px-2.5 py-2 transition-all"
        >
          {/* Nút Ghim Đính Kèm File */}
          <button
            type="button"
            data-testid="ai-attach-file-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isProcessingFile}
            className={`p-2 rounded-lg transition cursor-pointer shrink-0 flex items-center justify-center ${
              selectedFile
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Đính kèm đề cương / tài liệu ôn tập (.docx, .pdf, ảnh tối đa 10MB)"
            aria-label="Đính kèm đề cương / tài liệu ôn tập"
          >
            <Paperclip size={16} />
          </button>

          <textarea
            ref={inputRef}
            data-testid="ai-prompt-input"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              aiCreditsBalance < 1
                ? 'Hết điểm AI Credits. Bấm để nạp thêm...'
                : selectedFile
                ? `Yêu cầu phân tích "${selectedFile.name}"... (Enter để gửi)`
                : 'Nhập câu hỏi bài tập, khái niệm cần giải thích... (Enter để gửi)'
            }
            rows={1}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none max-h-24 min-h-[50px] py-2.5 px-3.5 leading-normal focus:outline-none"
          />

          <button
            type="submit"
            data-testid="ai-submit-btn"
            disabled={(!inputPrompt.trim() && !selectedFile) || isLoading || isProcessingFile}
            className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-500 transition cursor-pointer disabled:cursor-not-allowed shrink-0 flex items-center justify-center font-semibold shadow-xs"
            title="Gửi câu hỏi (Enter)"
            aria-label="Gửi câu hỏi"
          >
            <Send size={14} />
          </button>
        </form>

        {/* Chân Trang: Thông tin chi phí minh bạch */}
        <div className="flex items-center justify-between pt-1.5 px-1 text-[10px] text-zinc-400">
          <span className="truncate whitespace-nowrap shrink-0 text-zinc-400">1⚡ / câu hỏi</span>
          <span className="text-emerald-400 font-medium shrink-0 ml-2">⚡ Phản hồi tức thì</span>
        </div>
      </div>
    </div>
    </>
  );
};
