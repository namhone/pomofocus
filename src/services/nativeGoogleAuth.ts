import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from '../lib/supabase';

export const nativeGoogleAuth = registerPlugin<{
  signIn(options: { serverClientId: string; nonce: string }): Promise<{ idToken: string }>;
  clearCredentialState(): Promise<void>;
}>('PomoGoogleAuth');

export async function signInNativeGoogle(serverClientId: string): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') throw new Error('Đăng nhập này chỉ dùng trong ứng dụng Android.');
  let cancelled = false;
  const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') cancelled = true;
  });
  try {
  const rawNonce = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce));
  const nonce = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
  const { idToken } = await nativeGoogleAuth.signIn({ serverClientId, nonce });
  if (cancelled) throw new Error('Đăng nhập đã được hủy.');
  if (!idToken) throw new Error('Không nhận được thông tin đăng nhập Google.');
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken, nonce: rawNonce });
  if (error) throw new Error(error.message === 'Đăng nhập đã được hủy.'
    ? error.message : 'Đăng nhập Google chưa sẵn sàng. Vui lòng dùng email hoặc thử lại sau.');
  } finally { subscription.unsubscribe(); }
}
