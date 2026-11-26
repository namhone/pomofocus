import { supabase, RealtimePostgresChangesPayload } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { useTaskStore } from '../stores/useTaskStore';
import { useNoteStore } from '../stores/useNoteStore';
import { useAiStore } from '../stores/useAiStore';
import { db } from '../db';
import { ProfileService } from './profileService';
import type { LocalFocusSession, LocalFocusSessionPhase } from '../types/timer';

/** Owns one user's subscriptions; never writes wallet balances from a socket frame. */
export function subscribeWorkspaceRealtime(userId: string): () => void {
  let active = true;
  const isCurrentUser = () => active && useAuthStore.getState().user?.id === userId;
  const channel = supabase.channel(`workspace:${userId}`);
  let focusRefresh = Promise.resolve();
  const refreshFocusSessions = () => {
    focusRefresh = focusRefresh.catch(() => {}).then(async () => {
      if (!isCurrentUser()) return;
      const { data, error } = await supabase.from('focus_sessions').select('*').eq('user_id', userId);
      if (error) throw error;
      if (!isCurrentUser() || !Array.isArray(data)) return;
      const pending = await db.sync_queue.toArray();
      for (const row of data) {
        if (!isCurrentUser()) return;
        if (row.user_id !== userId || !row.id) continue;
        const local = await db.focus_sessions.get(row.id) as (LocalFocusSession & { updatedAt?: number }) | undefined;
        const version = Date.parse(row.updated_at || row.completed_at || row.ended_at || row.created_at);
        const completedAt = Date.parse(row.completed_at || row.ended_at || row.created_at);
        if (!Number.isFinite(version) || !Number.isFinite(completedAt)) continue;
        if (local && local.userId !== userId) continue;
        if (local && ((local.updatedAt ?? local.completedAt) > version || pending.some(m => m.tableName === 'focus_sessions' && m.recordId === row.id && m.userId === userId))) continue;
        if (!isCurrentUser()) return;
        const record = { id: row.id, userId, taskId: row.task_id || null, taskTitle: row.task_title || null,
          phase: (row.phase || row.mode || 'pomodoro') as LocalFocusSessionPhase,
          durationMinutes: row.duration_minutes, completedAt,
          dateString: row.date_string || new Date(completedAt).toISOString().slice(0, 10), updatedAt: version, synced: true };
        await db.focus_sessions.put(record);
      }
    });
    return focusRefresh;
  };
  const handleChange = (table: 'tasks' | 'notes' | 'focus_sessions') => async (payload: RealtimePostgresChangesPayload) => {
    if (!isCurrentUser()) return;
    if (payload.eventType === 'DELETE') {
      const id = payload.old?.id;
      if (!id) return;
      const record = await db[table].get(id);
      if (!isCurrentUser() || record?.userId !== userId) return;
      await db[table].delete(id);
      if (!isCurrentUser()) return;
      if (table === 'tasks') {
        useTaskStore.setState(state => ({ tasks: state.tasks.filter(task => task.id !== id) }));
        if (useTaskStore.getState().activeTaskId === id) useTaskStore.getState().linkTaskToTimer(null);
      } else if (table === 'notes') {
        useNoteStore.setState(state => ({ notes: state.notes.filter(note => note.id !== id), activeNoteId: state.activeNoteId === id ? null : state.activeNoteId }));
      }
      return;
    }
    if (payload.new?.user_id !== userId) return;
    if (table === 'tasks') await useTaskStore.getState().loadTasksAndProjects();
    else if (table === 'notes') await useNoteStore.getState().loadNotes();
    else await refreshFocusSessions();
  };
  const handleWallet = async () => {
    if (!isCurrentUser()) return;
    // Bypass the profile cache before asking existing entitlement/credits owners to refresh.
    await ProfileService.fetchProfile(userId, true);
    if (!isCurrentUser()) return;
    await useAuthStore.getState().loadUserFromCloud(userId);
    if (isCurrentUser()) await useAiStore.getState().refreshCreditsFromCloud();
  };
  for (const table of ['tasks', 'notes', 'focus_sessions'] as const) {
    const handle = handleChange(table);
    channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` }, payload => {
      void handle(payload).catch(error => console.warn('[Workspace Realtime]', error));
    });
  }
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'user_wallets', filter: `user_id=eq.${userId}` }, () => {
    void handleWallet().catch(error => console.warn('[Workspace Realtime]', error));
  });
  channel.subscribe(status => {
    if (status === 'SUBSCRIBED' && isCurrentUser()) {
      // Reconcile changes missed while the device was offline.
      void useTaskStore.getState().loadTasksAndProjects();
      void useNoteStore.getState().loadNotes();
      void refreshFocusSessions().catch(error => console.warn('[Workspace Realtime]', error));
      void handleWallet().catch(error => console.warn('[Workspace Realtime]', error));
    }
  });
  return () => { active = false; supabase.removeChannel(channel); };
}
