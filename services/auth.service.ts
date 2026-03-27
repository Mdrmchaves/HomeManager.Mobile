import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/config';
import { setAuthTokenGetter, setSignOutHandler } from './api';

export const supabase = createClient(Config.supabaseUrl, Config.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

let refreshPromise: Promise<string | null> | null = null;

setAuthTokenGetter(async () => {
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session) return null;

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at ?? 0;
  const isExpiringSoon = expiresAt - now < 60;

  if (!isExpiringSoon) {
    return session.access_token;
  }

  if (!refreshPromise) {
    refreshPromise = supabase.auth.refreshSession()
      .then(({ data }) => data.session?.access_token ?? null)
      .finally(() => { refreshPromise = null; });
  }

  return refreshPromise;
});

setSignOutHandler(async () => {
  await supabase.auth.signOut();
});

export const AuthService = {
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  signUp: async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getSession: () => supabase.auth.getSession(),

  onAuthStateChange: (
    callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]
  ) => supabase.auth.onAuthStateChange(callback),
};
