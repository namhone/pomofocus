import React, { useEffect, useState } from 'react';
import { FileText, Plus, Trash2, Check, Clock, AlertCircle, Pencil, Eye, Circle } from 'lucide-react';
import { useNoteStore } from '../stores/useNoteStore';
import { renderSafeMarkdown } from '../utils/markdown';
import { sanitizeHtml } from '../utils/sanitize';

export const NotesWidget: React.FC = () => {
  const { notes, activeNoteId, saveStatus, loadNotes, createNote, updateNoteContent, saveNow, deleteNote, setActiveNoteId } = useNoteStore();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [tone, setTone] = useState(0);
  useEffect(() => { loadNotes(); }, [loadNotes]);
  const activeNote = notes.find(note => note.id === activeNoteId);
  const wordCount = activeNote?.contentMarkdown.trim().split(/\s+/).filter(Boolean).length || 0;
  const tones = ['bg-zinc-950 text-zinc-100', 'bg-zinc-900 text-zinc-100', 'bg-zinc-800 text-white'];
  const statusLabel = saveStatus === 'saved' ? 'Đã lưu' : saveStatus === 'saving' ? 'Đang lưu' : 'Lỗi lưu';
  const StatusIcon = saveStatus === 'saved' ? Check : saveStatus === 'saving' ? Clock : AlertCircle;
  const control = 'shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-40';

  return (
    <div className="flex h-full w-full min-w-0 flex-col p-2 text-zinc-100">
      {/* One toolbar owns note selection, editing modes and note actions. */}
      <div data-testid="note-toolbar" className="flex min-w-0 shrink-0 items-center gap-1 border-b border-white/[0.06] pb-2">
        <FileText size={14} strokeWidth={1.5} className="shrink-0 text-zinc-300" aria-hidden="true" />
        <select aria-label="Chọn ghi chú" value={activeNoteId || ''} onChange={event => setActiveNoteId(event.target.value)} className="min-w-0 flex-1 truncate rounded-lg border border-white/[0.06] bg-zinc-900 px-1 py-1.5 text-xs text-zinc-100">
          {!activeNoteId && <option value="">Ghi chú</option>}
          {notes.map(note => <option key={note.id} value={note.id}>{note.title || 'Không tiêu đề'}</option>)}
        </select>
        <button type="button" data-testid="tab-note-edit" aria-label="Soạn thảo" title="Soạn thảo" aria-pressed={activeTab === 'edit'} onClick={() => setActiveTab('edit')} className={`${control} ${activeTab === 'edit' ? 'bg-white/10 text-white' : ''}`}><Pencil size={14} strokeWidth={1.5} /></button>
        <button type="button" data-testid="tab-note-preview" aria-label="Xem trước" title="Xem trước" aria-pressed={activeTab === 'preview'} onClick={() => setActiveTab('preview')} className={`${control} ${activeTab === 'preview' ? 'bg-white/10 text-white' : ''}`}><Eye size={14} strokeWidth={1.5} /></button>
        <button type="button" aria-label="Đổi sắc độ ghi chú" title="Đổi sắc độ ghi chú" onClick={() => setTone(current => (current + 1) % tones.length)} className={control}><Circle size={14} strokeWidth={1.5} className={tone === 0 ? '' : 'fill-zinc-500'} /></button>
        <button type="button" data-testid="btn-delete-note" aria-label="Xóa ghi chú" title="Xóa ghi chú" disabled={!activeNote} onClick={() => activeNote && deleteNote(activeNote.id)} className={control}><Trash2 size={14} strokeWidth={1.5} /></button>
        <button type="button" data-testid="btn-new-note" aria-label="Thêm ghi chú" title="Thêm ghi chú" onClick={() => createNote('Ghi chú mới')} className={`${control} !w-auto gap-1 bg-white/10 px-2 text-xs text-white`}><Plus size={14} strokeWidth={1.5} /><span>Thêm</span></button>
      </div>
      {activeNote ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 pt-1.5">
          <input data-testid="input-note-title" aria-label="Tiêu đề ghi chú" value={activeNote.title} onChange={event => updateNoteContent(activeNote.id, activeNote.contentMarkdown, event.target.value)} onBlur={() => saveNow(activeNote.id)} placeholder="Tiêu đề ghi chú" className="w-full min-w-0 rounded-lg border border-white/[0.06] bg-transparent px-2 py-1.5 text-sm font-medium text-white placeholder-zinc-400" />
          {activeTab === 'edit' ? (
            <textarea data-testid="textarea-note-content" aria-label="Nội dung ghi chú" value={activeNote.contentMarkdown} onChange={event => updateNoteContent(activeNote.id, event.target.value, activeNote.title)} onBlur={() => saveNow(activeNote.id)} placeholder="Viết ghi chú của bạn..." className={`min-h-0 w-full flex-1 resize-none rounded-xl border border-white/[0.06] p-3 text-sm leading-relaxed placeholder-zinc-400 ${tones[tone]}`} />
          ) : (
            <div data-testid="markdown-preview-container" aria-label="Bản xem trước ghi chú" className={`min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/[0.06] p-3 text-sm ${tones[tone]}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderSafeMarkdown(activeNote.contentMarkdown) || '<p>Nội dung ghi chú trống...</p>') }} />
          )}
          <button type="button" data-testid="btn-save-note" onClick={() => saveNow(activeNote.id)} className="sr-only focus:not-sr-only">Lưu ngay</button>
          <div className="flex shrink-0 items-center justify-between text-[11px] text-zinc-300">
            <span data-testid="note-save-status" role="status" className="inline-flex items-center gap-1"><StatusIcon size={12} strokeWidth={1.5} />{statusLabel}</span>
            <span>{wordCount} từ</span>
          </div>
        </div>
      ) : <p className="py-8 text-center text-xs text-zinc-300">Chưa có ghi chú. Chọn thêm để bắt đầu.</p>}
    </div>
  );
};
