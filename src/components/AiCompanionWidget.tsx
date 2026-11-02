import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Zap,
  BookOpen,
  HelpCircle,
  FileText,
  Copy,
  Check,
  RotateCcw,
  X,
  AlertTriangle,
  Bot,
  User,
  ArrowUpRight
} from 'lucide-react';
import { useAiStore, AI_PLAN_LIMITS, AiActionType } from '../stores/useAiStore';
import { useRouter } from '../services/router';
import { useNoteStore } from '../stores/useNoteStore';

export const AiCompanionWidget: React.FC = () => {
  const router = useRouter();
  const {
    isOpen,
    toggleOpen,
    aiCreditsBalance,
    aiPlan,
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat
  } = useAiStore();

  const notesContent = useNoteStore((s) => {
    const active = s.notes.find((n) => n.id === s.activeNoteId) || s.notes[0];
    return active?.contentMarkdown || '';
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Tự động cuộn xuống đáy khi có tin nhắn mới
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus ô nhập khi mở
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maxCredits = AI_PLAN_LIMITS[aiPlan] || 50;
  const isLifetime = aiPlan === 'lifetime';

  const getPlanBadge = () => {
    switch (aiPlan) {
      case 'lifetime':
        return '★ Nạp lại vào Thứ Hai';
      case 'yearly':
        return 'Gói Năm: 20.000⚡/năm';
      case 'monthly':
        return 'Gói Tháng: 1.500⚡/tháng';
      case 'free':
      default:
        return 'Miễn phí: 50⚡/tháng';
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

  const handleSend = async (action: AiActionType = 'chat', customText?: string) => {
    const textToSend = customText !== undefined ? customText : inputPrompt;
    if (!textToSend.trim() && action !== 'summarize' && action !== 'quiz') return;

    setInputPrompt('');
    try {
      await sendMessage(
        textToSend.trim() ||
          (action === 'summarize'
            ? 'Tóm tắt nội dung ghi chú hiện tại'
            : 'Tạo 10 câu trắc nghiệm ôn tập Pomodoro'),
        action
      );
    } catch {
      // Error đã được lưu trong store
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
      className="fixed top-12 right-0 bottom-0 w-full sm:w-[420px] max-w-full bg-[#09090b]/95 border-l border-zinc-800 text-zinc-100 shadow-2xl backdrop-blur-2xl z-50 flex flex-col select-none transition-all duration-300 animate-in slide-in-from-right"
    >
      {/* 1. Header HUD & Số Dư Điểm */}
      <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-950/70 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shadow-xs">
              <Bot size={16} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-xs text-white tracking-wide">PomoFocus AI Companion</h3>
                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono font-bold uppercase">
                  v1.1 Flash
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">Gia sư học tập đồng hành thông minh</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="ai-btn-clear-chat"
              onClick={clearChat}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/50 transition cursor-pointer"
              title="Làm mới đoạn chat"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              data-testid="ai-btn-close-drawer"
              onClick={() => toggleOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/50 transition cursor-pointer"
              title="Đóng bảng AI"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* HUD Thẻ Số Dư Credits */}
        <div
          data-testid="ai-hud-credits"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800/90 text-xs"
        >
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-amber-400/20 text-amber-300">
              <Zap size={14} className="fill-amber-400 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {aiCreditsBalance.toLocaleString()}
                </span>
                <span className="text-zinc-500 text-[11px]">/ {maxCredits.toLocaleString()} Credits</span>
              </div>
              <span className={`text-[10px] font-medium block ${isLifetime ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {getPlanBadge()}
              </span>
            </div>
          </div>

          <button
            type="button"
            data-testid="ai-btn-upgrade-credits"
            onClick={() => {
              toggleOpen(false);
              router.navigate('/billing');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 font-medium text-[10px] transition cursor-pointer shadow-xs active:scale-95"
          >
            <span>Nạp thêm</span>
            <ArrowUpRight size={11} />
          </button>
        </div>
      </div>

      {/* 2. 3 Nút Quick-Actions Kích Hoạt Nhanh */}
      <div className="px-3 py-2 border-b border-zinc-800/60 bg-zinc-950/40 shrink-0 space-y-1.5">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
          Lối tắt tác vụ học tập:
        </span>
        <div className="grid grid-cols-1 gap-1 text-[11px]">
          <button
            type="button"
            data-testid="ai-quick-explain"
            disabled={isLoading || aiCreditsBalance < 1}
            onClick={() =>
              handleSend('chat', 'Giải thích ngắn gọn, súc tích và sư phạm về khái niệm cốt lõi này')
            }
            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-left flex items-center justify-between text-zinc-300 hover:text-cyan-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 truncate">
              <HelpCircle size={13} className="text-cyan-400 shrink-0" />
              <span className="truncate">💡 Giải thích khái niệm này ngắn gọn</span>
            </div>
            <span className="font-mono text-[10px] text-amber-400 font-bold shrink-0">1⚡</span>
          </button>

          <button
            type="button"
            data-testid="ai-quick-summarize"
            disabled={isLoading || aiCreditsBalance < 5}
            onClick={() => handleSend('summarize')}
            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-left flex items-center justify-between text-zinc-300 hover:text-cyan-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 truncate">
              <FileText size={13} className="text-indigo-400 shrink-0" />
              <span className="truncate">
                📄 Tóm tắt nhanh ghi chú hiện tại {notesContent ? `(${notesContent.length} ký tự)` : ''}
              </span>
            </div>
            <span className="font-mono text-[10px] text-amber-400 font-bold shrink-0">5⚡</span>
          </button>

          <button
            type="button"
            data-testid="ai-quick-quiz"
            disabled={isLoading || aiCreditsBalance < 10}
            onClick={() => handleSend('quiz')}
            className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-left flex items-center justify-between text-zinc-300 hover:text-cyan-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 truncate">
              <BookOpen size={13} className="text-emerald-400 shrink-0" />
              <span className="truncate">🎯 Tạo 10 câu trắc nghiệm ôn tập Pomodoro</span>
            </div>
            <span className="font-mono text-[10px] text-amber-400 font-bold shrink-0">10⚡</span>
          </button>
        </div>
      </div>

      {/* 3. Danh Sách Khung Chat (Scrollable Message List) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 select-text">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-6 h-6 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={13} />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed transition-all shadow-sm ${
                  isUser
                    ? 'bg-cyan-500/20 text-cyan-50 border border-cyan-500/40 rounded-tr-xs'
                    : 'bg-zinc-900/90 text-zinc-200 border border-zinc-800/90 rounded-tl-xs'
                }`}
              >
                {/* Header message meta */}
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/[0.06] text-[10px] text-zinc-400">
                  <span className="font-medium">
                    {isUser ? 'Bạn' : 'PomoFocus AI'}
                  </span>
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="flex items-center gap-1 text-zinc-400 hover:text-white transition cursor-pointer"
                      title="Sao chép câu trả lời"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={11} className="text-emerald-400" />
                          <span className="text-[9px] text-emerald-400">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span className="text-[9px]">Chép</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Nội dung markdown / text */}
                <div className="whitespace-pre-wrap font-sans space-y-1.5 break-words">
                  {msg.content}
                </div>

                {msg.creditsUsed && (
                  <div className="pt-1.5 mt-1 border-t border-white/[0.04] text-[9px] text-zinc-500 font-mono text-right">
                    Đã dùng -{msg.creditsUsed}⚡
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={13} />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-6 h-6 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shrink-0 animate-pulse">
              <Bot size={13} />
            </div>
            <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl rounded-tl-xs p-3 text-xs text-zinc-400 flex items-center gap-2">
              <Sparkles size={14} className="animate-spin text-cyan-400" />
              <span>Gia sư AI đang phân tích và soạn câu trả lời...</span>
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
                  onClick={() => {
                    toggleOpen(false);
                    router.navigate('/billing');
                  }}
                  className="font-bold underline text-amber-300 hover:text-amber-200 cursor-pointer block text-[11px]"
                >
                  Nâng cấp gói ngay để nhận thêm tới 20.000⚡ →
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Khung Nhập Liệu (Input Prompt Box) */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/90 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend('chat');
          }}
          className="relative flex items-end gap-1.5 rounded-xl bg-[#0e0e10] border border-zinc-800 focus-within:border-cyan-500/60 p-1.5 transition-all"
        >
          <textarea
            ref={inputRef}
            data-testid="ai-prompt-input"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              aiCreditsBalance < 1
                ? 'Hết điểm AI Credits. Vui lòng nạp thêm...'
                : 'Nhập câu hỏi bài tập, khái niệm cần giải thích... (Enter để gửi)'
            }
            disabled={isLoading || aiCreditsBalance < 1}
            rows={2}
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 resize-none p-1.5 focus:outline-none disabled:opacity-40"
          />

          <button
            type="submit"
            data-testid="ai-submit-btn"
            disabled={!inputPrompt.trim() || isLoading || aiCreditsBalance < 1}
            className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-500 transition cursor-pointer disabled:cursor-not-allowed shrink-0 font-semibold shadow-xs"
            title="Gửi câu hỏi (Enter)"
          >
            <Send size={14} />
          </button>
        </form>

        <div className="flex items-center justify-between pt-1.5 px-1 text-[10px] text-zinc-500">
          <span>Hỏi bài: 1⚡ | Tóm tắt / Trắc nghiệm: 5⚡</span>
          <span>Google Gemini 1.5 Flash</span>
        </div>
      </div>
    </div>
  );
};
