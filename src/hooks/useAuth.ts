import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Status } from '../types';
import { translateError } from '../lib/errorUtils';

export function useAuth(setStatus: (status: Status | null) => void) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<'member' | 'premium' | 'admin'>('member');

  // If user signed in via Google and has no display_name yet, set email prefix as username
  const ensureDisplayName = useCallback(async (currentSession: Session) => {
    try {
      const user = currentSession.user;
      const meta = user.user_metadata;
      // Already has display_name set
      if (meta?.display_name) return;

      // Check if profiles table already has display_name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      if (profile?.display_name) return;

      // Use email prefix (before @) as default username
      const emailPrefix = user.email?.split('@')[0] || 'user';
      await supabase
        .from('profiles')
        .update({ display_name: emailPrefix })
        .eq('id', user.id);

      // Also update user_metadata so Profile page can read it
      await supabase.auth.updateUser({ data: { display_name: emailPrefix } });
    } catch {
      // Non-critical — silently ignore
    }
  }, []);

  const fetchProfile = useCallback(async (currentSession: Session) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('id', currentSession.user.id)
        .single();

      if (error) throw error;

      if (data) {
        setIsAdmin(data.is_admin);
        setUserRole(data.role || (data.is_admin ? 'admin' : 'member'));
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: translateError(err.message) });
    }
  }, [setStatus]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(null);
        window.location.hash = '#type=recovery';
        return;
      }
      setSession(session);
      if (session) {
        fetchProfile(session);
        ensureDisplayName(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, ensureDisplayName]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return {
    session,
    isAdmin,
    userRole,
    handleLogout,
    fetchProfile
  };
}