import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/**
 * Code block with uppercase language badge and isolated clipboard copy button.
 */
export const AiCodeBlock: React.FC<{ language?: string; codeString: string }> = ({
  language,
  codeString
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Lỗi chép code:', err);
    }
  };

  return (
    <div className="relative my-2.5 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950/90 shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800/80 text-[11px] text-zinc-400 font-mono">
        <span className="uppercase text-[10px] font-bold text-cyan-400 tracking-wider">
          {language || 'code'}
        </span>
        <button
          type="button"
          data-testid="ai-copy-code-btn"
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 hover:text-white border border-white/5 text-zinc-300 text-[10px] transition cursor-pointer select-none"
          title="Sao chép toàn bộ khối code này"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-400 font-sans">Đã chép</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span className="font-sans">📋 Sao chép code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed scrollbar-thin">
        <code>{codeString}</code>
      </pre>
    </div>
  );
};

/**
 * Markdown + KaTeX renderer shared by desktop and mobile AI Companion views.
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
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : undefined;
            return isBlock ? (
              <AiCodeBlock language={lang} codeString={String(children).replace(/\n$/, '')} />
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

export default FormattedAiMessage;
