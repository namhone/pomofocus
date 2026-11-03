import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Zap,
  HelpCircle,
  FileText,
  Copy,
  Check,
  RotateCcw,
  X,
  AlertTriangle,
  Bot,
  User,
  Paperclip,
  FileCheck,
  Play
} from 'lucide-react';
import { useAiStore, AiActionType, AI_CREDIT_COSTS } from '../stores/useAiStore';
import { useNoteStore } from '../stores/useNoteStore';
import { useAuthStore } from '../stores/useAuthStore';
import { AiChatService, AiAttachmentInfo } from '../services/aiChatService';
import { AiCreditsTopupModal } from './AiCreditsTopupModal';
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
    initConversation
  } = useAiStore();

  const notesContent = useNoteStore((s) => {
    const active = s.notes.find((n) => n.id === s.activeNoteId) || s.notes[0];
    return active?.contentMarkdown || '';
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedNoteId, setInsertedNoteId] = useState<string | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showMobileShortcuts, setShowMobileShortcuts] = useState(false);

  // Attachment state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentInfo, setAttachmentInfo] = useState<AiAttachmentInfo | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasUserMessages = messages.length > 1 || messages.some((m) => m.role === 'user');

  // Khởi tạo cuộc trò chuyện khi widget mở và user đã đăng nhập
  useEffect(() => {
    if (isOpen && user?.id) {
      initConversation(user.id);
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

  if (!isOpen) return null;

  const getPlanBadge = () => {
    switch (aiPlan) {
      case 'lifetime':
        return '★ 1.000⚡/tuần';
      case 'yearly':
        return '20.000⚡/năm';
      case 'monthly':
        return '1.500⚡/tháng';
      case 'free':
      default:
        return '50⚡/tháng';
    }
  };

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

  const handleSend = async (action: AiActionType = 'chat', customText?: string) => {
    const effectiveAction = attachmentInfo ? 'multimodal' : action;
    const cost = AI_CREDIT_COSTS[effectiveAction];

    if (aiCreditsBalance < cost) {
      setShowCreditsModal(true);
      return;
    }

    const textToSend = customText !== undefined ? customText : inputPrompt;
    if (!textToSend.trim() && !attachmentInfo) return;

    const attachmentPayload = attachmentInfo || undefined;

    // Reset input fields
    setInputPrompt('');
    handleRemoveFile();

    try {
      await sendMessage(textToSend, effectiveAction, attachmentPayload);
    } catch (e) {
      console.warn('Lỗi gửi tin nhắn AI:', e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend('chat');
    }
  };

  return (
    <div
      data-testid="ai-companion-drawer"
      className="fixed top-14 bottom-0 right-0 z-40 w-full sm:w-[420px] max-w-full bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right"
    >
      {/* Modal Nạp Điểm AI Credits Lẻ */}
      <AiCreditsTopupModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />

      {/* 1. Header 1 Hàng Ngang Tinh Gọn (Loại bỏ nhồi nhét) */}
      <div className="h-14 px-3 sm:px-4 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Sparkles size={15} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-zinc-950 rounded-full" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight whitespace-nowrap">AI Study Companion</h2>
            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium whitespace-nowrap shrink-0">
              {aiPlan === 'lifetime' ? '★ 1.000⚡/tuần' : getPlanBadge()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Cụm hiển thị số dư ⚡ (Bấm để nạp thêm điểm) */}
          <button
            type="button"
            data-testid="ai-credits-topup-btn"
            onClick={() => setShowCreditsModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition cursor-pointer"
            title="Bấm để nạp thêm AI Credits (Chiết khấu tới 45%)"
          >
            <Zap size={12} className="fill-amber-400 text-amber-400 shrink-0" />
            <span data-testid="ai-hud-credits">
              <span data-testid="ai-credits-badge">{aiCreditsBalance}⚡</span>
            </span>
          </button>

          {/* Nút Làm mới phiên chat */}
          <button
            type="button"
            data-testid="ai-clear-chat-btn"
            onClick={clearChat}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition cursor-pointer"
            title="Làm mới cuộc trò chuyện"
          >
            <RotateCcw size={15} />
          </button>

          {/* Nút đóng ✕ */}
          <button
            type="button"
            data-testid="ai-close-drawer-btn ai-btn-close-drawer"
            onClick={() => toggleOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition cursor-pointer"
            title="Đóng (Esc)"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* 2. Lối Tắt Tác Vụ Nhanh (Chỉ hiện khi chưa có tin nhắn hoặc người dùng bấm mở) */}
      {(!hasUserMessages || showMobileShortcuts) && (
        <div className="p-3 border-b border-zinc-800/60 bg-zinc-950/40 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Lối tắt tác vụ học tập:
            </span>
            {hasUserMessages && (
              <button
                type="button"
                onClick={() => setShowMobileShortcuts(false)}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                Ẩn bớt ✕
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="ai-action-summarize ai-quick-explain"
              onClick={() =>
                handleSend(
                  'summarize',
                  notesContent
                    ? 'Hãy tóm tắt ngắn gọn và làm nổi bật các ý chính của ghi chú hiện tại.'
                    : 'Hãy tóm tắt phương pháp học tập Pomodoro và kỹ thuật Feynman.'
                )
              }
              disabled={isLoading || aiCreditsBalance < 5}
              className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/50 hover:border-cyan-500/40 text-left transition disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-200 group-hover:text-cyan-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <FileText size={14} className="text-cyan-400" />
                  Tóm tắt ghi chú
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400">
                  -5⚡
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 line-clamp-1">Trích xuất 3-5 ý cốt lõi từ ghi chú</p>
            </button>

            <button
              type="button"
              data-testid="ai-action-quiz"
              onClick={() =>
                handleSend('quiz', 'Tạo 10 câu trắc nghiệm ôn tập về Pomodoro và kỹ năng tập trung sâu.')
              }
              disabled={isLoading || aiCreditsBalance < 10}
              className="p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/50 hover:border-amber-500/40 text-left transition disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-200 group-hover:text-amber-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-amber-400" />
                  Bộ 10 câu trắc nghiệm
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400">
                  -10⚡
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 line-clamp-1">10 câu hỏi A/B/C/D kèm đáp án</p>
            </button>
          </div>
        </div>
      )}

      {/* Nút bật lại Lối tắt khi đang trò chuyện */}
      {hasUserMessages && !showMobileShortcuts && (
        <div className="px-3 pt-2 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={() => setShowMobileShortcuts(true)}
            className="text-[10px] text-cyan-400/80 hover:text-cyan-300 font-medium cursor-pointer"
          >
            + Mở lối tắt tác vụ (-5⚡ / -10⚡)
          </button>
        </div>
      )}

      {/* 3. Vùng Cuộn Tin Nhắn (Scrollable Messages Area) */}
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
                      <span className="text-[10px] text-zinc-500 ml-auto">Đề cương đính kèm</span>
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
                    <span className="ml-1 text-zinc-500">Gia sư đang phân tích...</span>
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

                      {/* Nhãn mờ Đã dùng -1⚡ */}
                      <span className="text-[10px] text-zinc-500 font-mono">
                        Đã dùng -{msg.creditsUsed || 1}⚡
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

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
                  onClick={() => setShowCreditsModal(true)}
                  className="font-bold underline text-amber-300 hover:text-amber-200 cursor-pointer block text-[11px]"
                >
                  Nạp thêm AI Credits ngay chỉ từ 19.000đ →
                </button>
              )}
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
            if (aiCreditsBalance < 1) {
              setShowCreditsModal(true);
              return;
            }
            handleSend('chat');
          }}
          className="relative flex items-center gap-1.5 rounded-xl bg-[#0e0e10] border border-zinc-800 focus-within:border-cyan-500/60 px-2 py-1.5 transition-all"
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
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 resize-none max-h-24 py-1.5 focus:outline-none leading-normal min-h-[34px]"
          />

          <button
            type="submit"
            data-testid="ai-submit-btn"
            disabled={(!inputPrompt.trim() && !selectedFile) || isLoading || isProcessingFile}
            className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-500 transition cursor-pointer disabled:cursor-not-allowed shrink-0 flex items-center justify-center font-semibold shadow-xs"
            title="Gửi câu hỏi (Enter)"
          >
            <Send size={14} />
          </button>
        </form>

        {/* Chân Trang: Thông tin chi phí minh bạch */}
        <div className="flex items-center justify-between pt-1.5 px-1 text-[10px] text-zinc-500">
          <span className="truncate">Hỏi: 1⚡ • Tóm tắt: 5⚡ • Đề cương: 5⚡ • Quiz: 10⚡</span>
          <span className="text-emerald-400 font-medium shrink-0 ml-2">⚡ Phản hồi tức thì</span>
        </div>
      </div>
    </div>
  );
};
