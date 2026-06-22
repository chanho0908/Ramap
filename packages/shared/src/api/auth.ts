import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface KakaoSignInOptions {
  redirectTo?: string;
}

export interface AuthStateChangePayload {
  event: AuthChangeEvent;
  session: Session | null;
}

const KAKAO_LOGIN_SCOPES = 'account_email';

export async function signInWithKakao(
  options: KakaoSignInOptions = {}
): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: options.redirectTo,
      scopes: KAKAO_LOGIN_SCOPES,
    },
  });

  if (error) {
    throw error;
  }
}

export async function exchangeAuthCodeForSession(code: string): Promise<void> {
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw error;
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export function onAuthStateChange(
  callback: (payload: AuthStateChangePayload) => void
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback({ event, session });
  });

  return () => subscription.unsubscribe();
}
