/**
 * Authentication Provider — Phase 3
 * Provides secure email/password auth, persistent sessions, password reset,
 * and reactive auth state listening with graceful unconfigured fallback.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { getSupabase, isSupabaseConfigured } from '../services/supabase';
import { AuthContext } from './AuthContextDefinition';

export function AuthProvider({ children }) {
  const isConfigured = isSupabaseConfigured();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(() => isConfigured);

  // Listen to Supabase auth events
  useEffect(() => {
    if (!isConfigured) return;

    const supabase = getSupabase();
    if (!supabase) return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initSession }, error }) => {
      if (error) {
        console.warn('[auth] Error retrieving initial session:', error);
      }
      setSession(initSession);
      setUser(initSession?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [isConfigured]);

  const signUp = useCallback(
    async ({ email, password, fullName }) => {
      if (!isConfigured) {
        return {
          error: {
            message:
              'Supabase credentials are not configured yet. Please check .env or project setup instructions.',
          },
        };
      }
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName?.trim() || '',
            },
          },
        });
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    [isConfigured]
  );

  const signIn = useCallback(
    async ({ email, password }) => {
      if (!isConfigured) {
        return {
          error: {
            message:
              'Supabase credentials are not configured yet. Please configure your .env file with real project keys.',
          },
        };
      }
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    [isConfigured]
  );

  const signOut = useCallback(async () => {
    if (!isConfigured) {
      setUser(null);
      setSession(null);
      return { error: null };
    }
    const supabase = getSupabase();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      return { error: null };
    } catch (error) {
      return { error };
    }
  }, [isConfigured]);

  const resetPassword = useCallback(
    async (email) => {
      if (!isConfigured) {
        return {
          error: {
            message: 'Supabase credentials are not configured. Cannot dispatch reset email.',
          },
        };
      }
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/`,
        });
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    [isConfigured]
  );

  const updatePassword = useCallback(
    async (newPassword) => {
      if (!isConfigured) {
        return { error: { message: 'Supabase is not configured.' } };
      }
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    [isConfigured]
  );

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      isConfigured,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [user, session, loading, isConfigured, signUp, signIn, signOut, resetPassword, updatePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
