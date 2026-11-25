import { create } from 'zustand';
import { db } from '../db';
import { Note, NoteSaveStatus } from '../types/notes';
import { NoteCloudService } from '../services/noteCloudService';
import { useAuthStore } from './useAuthStore';
import { generateUUID } from '../utils/uuid';

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
  deleteNote: (id: string, hardDelete?: boolean) => Promise<void>;
  setActiveNoteId: (id: string | null) => void;
  unlinkDeletedTask: (taskId: string) => Promise<void>;
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
      const currentUserId = useAuthStore.getState().user?.id || 'guest';
      let allNotes: Note[] = [];
      try {
        allNotes = await db.notes.where('userId').equals(currentUserId).toArray();
        if (allNotes.length === 0 && currentUserId === 'guest') {
          const legacy = await db.notes.filter((n) => !n.userId || n.userId === 'guest').toArray();
          if (legacy.length > 0) allNotes = legacy;
        }
      } catch {
        allNotes = (await db.notes.toArray()).filter((n) => (n.userId || 'guest') === currentUserId);
      }

      // 30-day GC check: purge permanently deleted items older than 30 days
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const expiredNoteIds = allNotes.filter((n) => n.deletedAt && n.deletedAt < thirtyDaysAgo).map((n) => n.id);
      if (expiredNoteIds.length > 0) {
        await db.notes.bulkDelete(expiredNoteIds).catch(() => {});
        allNotes = allNotes.filter((n) => !expiredNoteIds.includes(n.id));
      }

      // Filter out tombstoned notes
      const activeNotes = allNotes.filter((n) => !n.deletedAt || n.deletedAt <= 0);
      const sorted = activeNotes.sort((a, b) => b.updatedAt - a.updatedAt);

      if (sorted.length === 0 && currentUserId !== 'guest') {
        const cloudNotes = await NoteCloudService.syncFromCloud(currentUserId);
        if (useAuthStore.getState().user?.id !== currentUserId) return;
        const notes = cloudNotes.filter(note => note.userId === currentUserId && !note.deletedAt)
          .sort((a, b) => b.updatedAt - a.updatedAt);
        set({ notes, activeNoteId: notes[0]?.id || null, isLoading: false, saveStatus: 'saved' });
        return;
      }
      if (sorted.length === 0) {
        // Khởi tạo ghi chú mẫu ban đầu nếu cơ sở dữ liệu trống
        const defaultNote: Note = {
          id: generateUUID(),
          userId: currentUserId,
          title: 'Ý tưởng tập trung hôm nay',
          contentMarkdown: `# Chào mừng bạn đến với Không gian ghi chú!\n\n- [x] Thiết lập Pomodoro Timer\n- [ ] Lập kế hoạch 3 việc quan trọng nhất hôm nay\n- [ ] Dành 25 phút tập trung không xao nhãng\n\n> *\"Tập trung là nghệ thuật biết từ chối 1000 điều tốt khác.\"*`,
          linkedTaskId: null,
          linkedProjectId: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: null
        };
        await db.notes.add(defaultNote);
        set({
          notes: [defaultNote],
          activeNoteId: defaultNote.id,
          isLoading: false,
          saveStatus: 'saved'
        });
      } else {
        const userId = useAuthStore.getState().user?.id;
        if (userId) {
          NoteCloudService.syncFromCloud(userId).then((cloudNotes) => {
            if (useAuthStore.getState().user?.id !== userId) return;
            const activeCloudNotes = cloudNotes.filter((n) => n.userId === userId && (!n.deletedAt || n.deletedAt <= 0));
            if (activeCloudNotes.length > 0) {
              set({
                notes: activeCloudNotes.sort((a, b) => b.updatedAt - a.updatedAt),
                activeNoteId: get().activeNoteId || activeCloudNotes[0].id
              });
            }
          }).catch((err) => console.warn('Lỗi đồng bộ Notes từ Cloud:', err));
        }

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
    const currentUserId = useAuthStore.getState().user?.id || 'guest';
    const newNote: Note = {
      id: generateUUID(),
      userId: currentUserId,
      title: title.trim(),
      contentMarkdown: '',
      linkedTaskId,
      linkedProjectId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };

    try {
      await db.notes.add(newNote);
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        NoteCloudService.upsertNote(newNote, userId).catch((err) => console.warn('Lỗi lưu Note lên Cloud:', err));
      }
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
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        NoteCloudService.upsertNote(note, userId).catch((err) => console.warn('Lỗi lưu Note lên Cloud:', err));
      }
      set({ saveStatus: 'saved' });
    } catch (err) {
      console.error('Lỗi khi lưu ghi chú vào IndexedDB:', err);
      set({ saveStatus: 'error' });
    }
  },

  deleteNote: async (id: string, hardDelete = false) => {
    try {
      const now = Date.now();
      if (hardDelete) {
        await db.notes.delete(id);
      } else {
        await db.notes.update(id, { deletedAt: now, updatedAt: now });
      }

      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        NoteCloudService.deleteNote(id, userId).catch((err) => console.warn('Lỗi xóa Note trên Cloud:', err));
      }

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
