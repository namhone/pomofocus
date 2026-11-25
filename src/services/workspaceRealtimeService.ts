import { supabase, RealtimePostgresChangesPayload } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { useTaskStore } from '../stores/useTaskStore';
import { useNoteStore } from '../stores/useNoteStore';
import { useAiStore } from '../stores/useAiStore';
import { db } from '../db';
import { ProfileService } from './profileService';

/** Owns one user's subscriptions; never writes wallet balances from a socket frame. */
export function subscribeWorkspaceRealtime(userId: string): () => void {
  let active = true;
  const isCurrentUser = () => active && useAuthStore.getState().user?.id === userId;
  const channel = supabase.channel(`workspace:${userId}`);
  const handleChange = (table: 'tasks' | 'notes') => async (payload: RealtimePostgresChangesPayload) => {
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
      } else {
        useNoteStore.setState(state => ({ notes: state.notes.filter(note => note.id !== id), activeNoteId: state.activeNoteId === id ? null : state.activeNoteId }));
      }
      return;
    }
    if (payload.new?.user_id !== userId) return;
    if (table === 'tasks') await useTaskStore.getState().loadTasksAndProjects();
    else await useNoteStore.getState().loadNotes();
  };
  const handleWallet = async () => {
    if (!isCurrentUser()) return;
    // Bypass the profile cache before asking existing entitlement/credits owners to refresh.
    await ProfileService.fetchProfile(userId, true);
    if (!isCurrentUser()) return;
    await useAuthStore.getState().loadUserFromCloud(userId);
    if (isCurrentUser()) await useAiStore.getState().refreshCreditsFromCloud();
  };
  for (const table of ['tasks', 'notes'] as const) {
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
      void handleWallet().catch(error => console.warn('[Workspace Realtime]', error));
    }
  });
  return () => { active = false; supabase.removeChannel(channel); };
}
