// src/lib/auth.js
import { supabase } from './supabase.js';

const LS_USER = 'app.user';

// listener per cambi sessione
export function onAuthChange(cb) {
  supabase.auth.onAuthStateChange(async (_event, session) => {
    const user = session?.user || null;
    try {
      if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
      else localStorage.removeItem(LS_USER);
    } catch {}
    cb?.(user);
  });
}

// utilities
export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}
export function getUserCached() {
  try { return JSON.parse(localStorage.getItem(LS_USER) || 'null'); } catch { return null; }
}

// sign-in/out
export async function signInWithEmail(email) {
  // Magic link (OTP)
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
  if (error) throw error;
  return true;
}
export async function signOut() {
  await supabase.auth.signOut();
}