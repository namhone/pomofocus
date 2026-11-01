import { create } from 'zustand';
import { db } from '../db';
import { Note, NoteSaveStatus } from '../types/notes';

interface NoteStoreState {
  notes: Note[];
  activeNoteId: string | null;
  saveStatus: NoteSaveStatus;
  isLoading: boolean;

  // Actions
  loadNotes: () => Promise<void>;
  createNote: (title?: string, linkedTaskId?: string | null) => Promise<Note>;
  updateNoteContent: (id: string, contentMarkdown: string, title?: string) => void;
  saveNow: (id?: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  setActiveNoteId: (id: string | null) => void;
  unlinkDeletedTask: (taskId: string) => Promise<void>;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'note_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useNoteStore = create<NoteStoreState>((set, get) => ({
  notes: [],
  activeNoteId: null,
  saveStatus: 'saved',
  isLoading: false,

  loadNotes: async () => {
    set({ isLoading: true });
    try {
      const allNotes = await db.notes.toArray();
      const sorted = allNotes.sort((a, b) => b.updatedAt - a.updatedAt);

      if (sorted.length === 0) {
        // Khởi tạo ghi chú mẫu ban đầu nếu cơ sở dữ liệu trống
        const defaultNote: Note = {
          id: generateUUID(),
          title: 'Ý tưởng tập trung hôm nay',
          contentMarkdown: `# Chào mừng bạn đến với Không Gian Ghi Chú! 📝\n\n- [x] Thiết lập Pomodoro Timer\n- [ ] Lập kế hoạch 3 việc quan trọng nhất hôm nay\n- [ ] Dành 25 phút tập trung không xao nhãng\n\n> *\"Tập trung là nghệ thuật biết từ chối 1000 điều tốt khác.\"*`,
          linkedTaskId: null,
          linkedProjectId: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await db.notes.add(defaultNote);
        set({
          notes: [defaultNote],
          activeNoteId: defaultNote.id,
          isLoading: false,
          saveStatus: 'saved'
        });
      } else {
        set({
          notes: sorted,
          activeNoteId: sorted[0].id,
          isLoading: false,
          saveStatus: 'saved'
        });
      }
    } catch (err) {
      console.warn('Lỗi khi tải ghi chú từ IndexedDB:', err);
      set({ isLoading: false, saveStatus: 'error' });
    }
  },

  createNote: async (title = 'Ghi chú mới', linkedTaskId = null) => {
    const now = Date.now();
    const newNote: Note = {
      id: generateUUID(),
      title: title.trim(),
      contentMarkdown: '',
      linkedTaskId,
      linkedProjectId: null,
      createdAt: now,
      updatedAt: now
    };

    try {
      await db.notes.add(newNote);
      set((state) => ({
        notes: [newNote, ...state.notes],
        activeNoteId: newNote.id,
        saveStatus: 'saved'
      }));
      return newNote;
    } catch (err) {
      console.warn('Lỗi khi tạo ghi chú mới:', err);
      set({ saveStatus: 'error' });
      throw err;
    }
  },

  updateNoteContent: (id: string, contentMarkdown: string, title?: string) => {
    const now = Date.now();

    // 1. Cập nhật state trong RAM ngay lập tức để render 60fps
    set((state) => ({
      saveStatus: 'saving',
      notes: state.notes.map((n) => {
        if (n.id === id) {
          return {
            ...n,
            contentMarkdown,
            title: title !== undefined ? title.trim() : n.title,
            updatedAt: now
          };
        }
        return n;
      })
    }));

    // 2. Debounce ghi xuống IndexedDB (400ms)
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      get().saveNow(id);
    }, 400);
  },

  saveNow: async (id?: string) => {
    const targetId = id || get().activeNoteId;
    if (!targetId) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    const note = get().notes.find((n) => n.id === targetId);
    if (!note) return;

    try {
      await db.notes.put(note);
      set({ saveStatus: 'saved' });
    } catch (err) {
      console.error('Lỗi khi lưu ghi chú vào IndexedDB:', err);
      set({ saveStatus: 'error' });
    }
  },

  deleteNote: async (id: string) => {
    try {
      await db.notes.delete(id);
      set((state) => {
        const remaining = state.notes.filter((n) => n.id !== id);
        const nextActive = state.activeNoteId === id ? (remaining[0]?.id || null) : state.activeNoteId;
        return {
          notes: remaining,
          activeNoteId: nextActive,
          saveStatus: 'saved'
        };
      });
    } catch (err) {
      console.error('Lỗi khi xóa ghi chú:', err);
      set({ saveStatus: 'error' });
    }
  },

  setActiveNoteId: (id: string | null) => {
    // Lưu note cũ trước khi chuyển note mới
    const currentActiveId = get().activeNoteId;
    if (currentActiveId && currentActiveId !== id) {
      get().saveNow(currentActiveId);
    }
    set({ activeNoteId: id });
  },

  unlinkDeletedTask: async (taskId: string) => {
    try {
      const linkedNotes = await db.notes.where('linkedTaskId').equals(taskId).toArray();
      for (const note of linkedNotes) {
        await db.notes.update(note.id, { linkedTaskId: null, updatedAt: Date.now() });
      }
      set((state) => ({
        notes: state.notes.map((n) => (n.linkedTaskId === taskId ? { ...n, linkedTaskId: null } : n))
      }));
    } catch {
      // Ignore
    }
  }
}));

if (typeof window !== 'undefined') {
  (window as unknown as { useNoteStore: typeof useNoteStore }).useNoteStore = useNoteStore;
}
