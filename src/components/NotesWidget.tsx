import React, { useEffect, useState } from 'react';
import { FileText, Plus, Trash2, Check, Clock, AlertCircle } from 'lucide-react';
import { useNoteStore } from '../stores/useNoteStore';
import { renderSafeMarkdown } from '../utils/markdown';

export const NotesWidget: React.FC = () => {
  const {
    notes,
    activeNoteId,
    saveStatus,
    loadNotes,
    createNote,
    updateNoteContent,
    saveNow,
    deleteNote,
    setActiveNoteId
  } = useNoteStore();

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [stickyColor, setStickyColor] = useState<'default' | 'butter' | 'mint' | 'sky' | 'lavender' | 'rose'>('default');

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  const wordCount = activeNote?.contentMarkdown
    ? activeNote.contentMarkdown.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const stickyStyles = {
    default: 'bg-black/35 backdrop-blur-sm border-white/12 text-neutral-200',
    butter: 'bg-amber-950/30 backdrop-blur-sm border-amber-500/30 text-amber-100',
    mint: 'bg-emerald-950/30 backdrop-blur-sm border-emerald-500/30 text-emerald-100',
    sky: 'bg-sky-950/30 backdrop-blur-sm border-sky-500/30 text-sky-100',
    lavender: 'bg-purple-950/30 backdrop-blur-sm border-purple-500/30 text-purple-100',
    rose: 'bg-rose-950/30 backdrop-blur-sm border-rose-500/30 text-rose-100'
  }[stickyColor];

  const getStatusBadge = () => {
    switch (saveStatus) {
      case 'saved':
        return (
          <span
            data-testid="note-save-status"
            className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 inline-flex items-center gap-1"
          >
            <Check size={10} />
            <span>Đã lưu</span>
          </span>
        );
      case 'saving':
        return (
          <span
            data-testid="note-save-status"
            className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25 animate-pulse inline-flex items-center gap-1"
          >
            <Clock size={10} />
            <span>Đang lưu...</span>
          </span>
        );
      case 'error':
        return (
          <span
            data-testid="note-save-status"
            className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/25 inline-flex items-center gap-1"
          >
            <AlertCircle size={10} />
            <span>Lỗi lưu</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col text-neutral-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <FileText size={16} strokeWidth={1.75} className="text-neutral-400" />
          <h3 className="text-[13px] font-medium text-neutral-200">Ghi Chú Nhanh</h3>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <button
            type="button"
            data-testid="btn-new-note"
            onClick={() => createNote('Ghi chú mới')}
            className="text-xs px-2.5 py-1 rounded-lg bg-white/12 hover:bg-white/20 text-white font-medium border border-white/10 transition cursor-pointer min-h-[30px] inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          >
            <Plus size={13} strokeWidth={1.75} />
            <span>Ghi chú</span>
          </button>
        </div>
      </div>

      {/* Note Selector Tabs */}
      <div className="mt-2.5 flex items-center gap-1 overflow-x-auto overflow-y-hidden pb-1">
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            data-testid={`note-tab-${note.id}`}
            onClick={() => setActiveNoteId(note.id)}
            className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition cursor-pointer min-h-[28px] flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
              activeNoteId === note.id
                ? 'bg-white/15 text-white font-medium border border-white/20 shadow-sm'
                : 'bg-black/25 text-neutral-400 hover:text-white border border-white/5'
            }`}
          >
            {note.title || 'Không tiêu đề'}
          </button>
        ))}
      </div>

      {activeNote ? (
        <div className="mt-3 space-y-2.5">
          {/* Note Title & Action Bar */}
          <div className="flex items-center justify-between gap-2">
            <input
              data-testid="input-note-title"
              type="text"
              value={activeNote.title}
              onChange={(e) =>
                updateNoteContent(activeNote.id, activeNote.contentMarkdown, e.target.value)
              }
              onBlur={() => saveNow(activeNote.id)}
              placeholder="Tiêu đề ghi chú..."
              className="text-xs font-semibold bg-transparent border-b border-transparent hover:border-white/20 focus:border-white/40 text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-sm flex-1 px-1 py-1"
            />

            {/* Toggle Edit / Preview */}
            <div className="flex rounded-lg bg-black/30 p-0.5 border border-white/10 text-[11px] gap-0.5">
              <button
                type="button"
                data-testid="tab-note-edit"
                onClick={() => setActiveTab('edit')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer min-h-[28px] flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
                  activeTab === 'edit'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Soạn thảo
              </button>
              <button
                type="button"
                data-testid="tab-note-preview"
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer min-h-[28px] flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
                  activeTab === 'preview'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Xem trước
              </button>
            </div>

            <button
              type="button"
              data-testid="btn-delete-note"
              onClick={() => deleteNote(activeNote.id)}
              title="Xóa ghi chú"
              className="p-1 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition text-xs cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
            >
              <Trash2 size={13} strokeWidth={1.75} />
            </button>
          </div>

          {/* Editor Mode */}
          {activeTab === 'edit' ? (
            <div className="relative">
              {/* Pastel Theme Color Bar */}
              <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-white/[0.04]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-neutral-400">Màu Sticky:</span>
                  {[
                    { id: 'default', color: 'bg-neutral-600' },
                    { id: 'butter', color: 'bg-amber-300' },
                    { id: 'mint', color: 'bg-emerald-300' },
                    { id: 'sky', color: 'bg-sky-300' },
                    { id: 'lavender', color: 'bg-purple-300' },
                    { id: 'rose', color: 'bg-rose-300' }
                  ].map(({ id, color }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setStickyColor(id as any)}
                      className={`w-7 h-7 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg hover:bg-white/5 cursor-pointer transition-colors ${
                        stickyColor === id ? 'bg-white/10' : ''
                      }`}
                      title={`Màu ${id}`}
                      aria-label={`Màu ${id}`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full ${color} ${
                          stickyColor === id ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="font-mono text-[10px] text-neutral-400">{wordCount} từ</span>
              </div>

              <textarea
                data-testid="textarea-note-content"
                value={activeNote.contentMarkdown}
                onChange={(e) =>
                  updateNoteContent(activeNote.id, e.target.value, activeNote.title)
                }
                onBlur={() => saveNow(activeNote.id)}
                placeholder="Nhập nội dung Markdown tại đây (hỗ trợ # header, **in đậm**, - checklist, [link](url))..."
                rows={9}
                className={`w-full text-xs p-3 rounded-xl border placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/30 font-mono resize-none leading-relaxed transition-colors ${stickyStyles}`}
              />
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1 px-1">
                <span className="font-mono">Markdown Hỗ Trợ</span>
                <button
                  type="button"
                  data-testid="btn-save-note"
                  onClick={() => saveNow(activeNote.id)}
                  className="text-white/80 hover:text-white font-medium cursor-pointer min-h-[28px] px-2 py-0.5 inline-flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded"
                >
                  Lưu ngay
                </button>
              </div>
            </div>
          ) : (
            /* Safe Preview Mode */
            <div
              data-testid="markdown-preview-container"
              className={`p-3.5 rounded-xl border min-h-[175px] max-h-64 overflow-y-auto text-xs transition-colors ${stickyStyles}`}
              dangerouslySetInnerHTML={{
                __html:
                  renderSafeMarkdown(activeNote.contentMarkdown) ||
                  '<p class="text-xs text-neutral-500 italic">Nội dung ghi chú trống...</p>'
              }}
            />
          )}
        </div>
      ) : (
        <div className="text-center py-10 text-xs text-neutral-500">
          Chưa chọn ghi chú nào. Hãy tạo một ghi chú mới!
        </div>
      )}
    </div>
  );
};
