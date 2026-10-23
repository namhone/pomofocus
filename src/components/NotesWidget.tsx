import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  const getStatusBadge = () => {
    switch (saveStatus) {
      case 'saved':
        return (
          <span
            data-testid="note-save-status"
            className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          >
            ✓ Đã lưu
          </span>
        );
      case 'saving':
        return (
          <span
            data-testid="note-save-status"
            className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
          >
            ⏳ Đang lưu...
          </span>
        );
      case 'error':
        return (
          <span
            data-testid="note-save-status"
            className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30"
          >
            ❌ Lỗi lưu
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl">📝</span>
          <h2 className="text-base font-semibold text-slate-100">Ghi Chú Nhanh</h2>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <button
            type="button"
            data-testid="btn-new-note"
            onClick={() => createNote('Ghi chú mới')}
            className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            + Ghi chú
          </button>
        </div>
      </div>

      {/* Note Selector Tabs */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            data-testid={`note-tab-${note.id}`}
            onClick={() => setActiveNoteId(note.id)}
            className={`px-3 py-1 rounded-xl text-xs whitespace-nowrap transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
              activeNoteId === note.id
                ? 'bg-indigo-600 text-white font-medium shadow'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            {note.title || 'Không tiêu đề'}
          </button>
        ))}
      </div>

      {activeNote ? (
        <div className="mt-4 space-y-3">
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
              className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-white/20 focus:border-indigo-500 text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 rounded-sm flex-1 px-1 py-0.5"
            />

            {/* Toggle Edit / Preview */}
            <div className="flex rounded-lg bg-slate-950/60 p-0.5 border border-white/5 text-[11px]">
              <button
                type="button"
                data-testid="tab-note-edit"
                onClick={() => setActiveTab('edit')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  activeTab === 'edit'
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Soạn thảo
              </button>
              <button
                type="button"
                data-testid="tab-note-preview"
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  activeTab === 'preview'
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-white'
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
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              ✕
            </button>
          </div>

          {/* Editor Mode */}
          {activeTab === 'edit' ? (
            <div className="relative">
              <textarea
                data-testid="textarea-note-content"
                value={activeNote.contentMarkdown}
                onChange={(e) =>
                  updateNoteContent(activeNote.id, e.target.value, activeNote.title)
                }
                onBlur={() => saveNow(activeNote.id)}
                placeholder="Nhập nội dung Markdown tại đây (hỗ trợ # header, **in đậm**, - checklist, [link](url))..."
                rows={9}
                className="w-full text-xs p-3 rounded-2xl bg-slate-950/80 border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 px-1">
                <span>Hỗ trợ Markdown an toàn (chống XSS)</span>
                <button
                  type="button"
                  data-testid="btn-save-note"
                  onClick={() => saveNow(activeNote.id)}
                  className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 rounded px-1"
                >
                  Lưu ngay
                </button>
              </div>
            </div>
          ) : (
            /* Safe Preview Mode */
            <div
              data-testid="markdown-preview-container"
              className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 min-h-[175px] max-h-64 overflow-y-auto"
              dangerouslySetInnerHTML={{
                __html:
                  renderSafeMarkdown(activeNote.contentMarkdown) ||
                  '<p class="text-xs text-slate-500 italic">Nội dung ghi chú trống...</p>'
              }}
            />
          )}
        </div>
      ) : (
        <div className="text-center py-10 text-xs text-slate-500">
          Chưa chọn ghi chú nào. Hãy tạo một ghi chú mới!
        </div>
      )}
    </div>
  );
};
