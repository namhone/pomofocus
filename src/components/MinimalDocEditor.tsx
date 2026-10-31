import React, { useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Highlighter,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Download,
  Share2,
  X,
  FileText,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';

interface MinimalDocEditorProps {
  initialTitle: string;
  initialContentHtml: string;
  onClose: () => void;
  onProjectToWhiteboard?: (htmlContent: string) => void;
}

export const MinimalDocEditor: React.FC<MinimalDocEditorProps> = ({
  initialTitle,
  initialContentHtml,
  onClose,
  onProjectToWhiteboard
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [docTitle, setDocTitle] = useState(initialTitle || 'Đề cương học tập');
  const [copied, setCopied] = useState(false);

  // Thực hiện lệnh định dạng trên vùng soạn thảo (document.execCommand)
  const formatText = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Tô dạ quang (Highlighter)
  const applyHighlight = (color: string) => {
    document.execCommand('hiliteColor', false, color);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Sao chép toàn bộ văn bản đề cương
  const handleCopyText = async () => {
    if (!editorRef.current) return;
    try {
      const text = editorRef.current.innerText;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Lỗi copy clipboard:', err);
    }
  };

  // Tải file về máy (.html / .doc)
  const handleDownloadDoc = () => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${docTitle}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 40px; max-width: 800px; margin: auto; color: #111; }
  h1, h2 { color: #000; }
  mark { padding: 2px 4px; border-radius: 3px; }
</style>
</head>
<body>
  <h1>${docTitle}</h1>
  <hr />
  ${content}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'application/msword;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${docTitle.replace(/\s+/g, '_')}_de_cuong.doc`;
    link.click();
  };

  return (
    <div
      data-testid="minimal-doc-editor-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-4xl h-[88vh] rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col overflow-hidden select-none">
        {/* Header Bar */}
        <div className="h-14 px-4 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 shrink-0">
              <FileText size={16} />
            </div>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Tiêu đề đề cương..."
              className="bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-white text-sm font-semibold text-white px-1 py-0.5 outline-none truncate max-w-xs sm:max-w-md transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onProjectToWhiteboard && (
              <button
                type="button"
                onClick={() => {
                  if (editorRef.current) {
                    onProjectToWhiteboard(editorRef.current.innerHTML);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition cursor-pointer"
                title="Chiếu đề cương lên Bảng vẽ để vẽ khoanh tròn"
              >
                <Share2 size={13} />
                <span className="hidden sm:inline">Chiếu lên Bảng vẽ</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyText}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition cursor-pointer"
              title="Sao chép toàn bộ văn bản"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            <button
              type="button"
              onClick={handleDownloadDoc}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition cursor-pointer"
              title="Tải đề cương về máy (.doc)"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Tải về (.doc)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
              title="Đóng trình soạn thảo"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Minimal Formatting Toolbar */}
        <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/30 flex items-center gap-1 flex-wrap text-xs shrink-0">
          <button
            type="button"
            onClick={() => formatText('bold')}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 font-bold transition cursor-pointer"
            title="In đậm (Bold)"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={() => formatText('italic')}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 italic transition cursor-pointer"
            title="In nghiêng (Italic)"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            onClick={() => formatText('underline')}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 underline transition cursor-pointer"
            title="Gạch chân (Underline)"
          >
            <Underline size={14} />
          </button>

          <span className="w-px h-4 bg-zinc-800 mx-1" />

          {/* Dạ quang Highlight */}
          <button
            type="button"
            onClick={() => applyHighlight('#fef08a')}
            className="px-2 py-1 rounded-lg text-[11px] font-medium bg-amber-400/20 text-amber-200 border border-amber-400/30 hover:bg-amber-400/30 flex items-center gap-1 cursor-pointer"
            title="Highlight Vàng pastel"
          >
            <Highlighter size={12} />
            <span>Vàng</span>
          </button>
          <button
            type="button"
            onClick={() => applyHighlight('#93c5fd')}
            className="px-2 py-1 rounded-lg text-[11px] font-medium bg-sky-400/20 text-sky-200 border border-sky-400/30 hover:bg-sky-400/30 flex items-center gap-1 cursor-pointer"
            title="Highlight Xanh pastel"
          >
            <Highlighter size={12} />
            <span>Xanh</span>
          </button>
          <button
            type="button"
            onClick={() => applyHighlight('transparent')}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Bỏ highlight"
          >
            <RotateCcw size={12} />
          </button>

          <span className="w-px h-4 bg-zinc-800 mx-1" />

          <button
            type="button"
            onClick={() => formatText('formatBlock', '<h1>')}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Tiêu đề H1"
          >
            <Heading1 size={14} />
          </button>
          <button
            type="button"
            onClick={() => formatText('formatBlock', '<h2>')}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Tiêu đề H2"
          >
            <Heading2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => formatText('insertUnorderedList')}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Gạch đầu dòng (Bullet List)"
          >
            <List size={14} />
          </button>
          <button
            type="button"
            onClick={() => formatText('insertOrderedList')}
            className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Danh sách số (Numbered List)"
          >
            <ListOrdered size={14} />
          </button>
        </div>

        {/* Editable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-zinc-950 flex justify-center cursor-text">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-testid="doc-editable-content"
            dangerouslySetInnerHTML={{ __html: initialContentHtml }}
            className="w-full max-w-2xl min-h-[500px] outline-none text-zinc-100 text-sm leading-relaxed space-y-3 prose prose-invert select-text"
            style={{
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          />
        </div>

        {/* Footer tip */}
        <div className="px-4 py-2 border-t border-zinc-800/80 bg-zinc-900/40 text-[11px] text-zinc-400 flex items-center justify-between">
          <span>💡 Bạn có thể sửa chữ, dán câu hỏi thi, highlight kiến thức và xuất file về máy miễn phí.</span>
          <span className="font-mono text-zinc-500">Auto-saved Locally</span>
        </div>
      </div>
    </div>
  );
};
