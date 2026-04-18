import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Status } from '../types';
import { translateError } from '../lib/errorUtils';

export function useAuth(setStatus: (status: Status | null) => void) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<'member' | 'premium' | 'admin'>('member');
  const [profileReady, setProfileReady] = useState(false);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Google login မှာ display_name မရှိသေးရင် email prefix ထည့်
  const ensureDisplayName = useCallback(async (currentSession: Session) => {
    try {
      const user = currentSession.user;
      if (user.user_metadata?.display_name) return;

      const { data: profile } = await supabase
        .from('profiles').select('display_name').eq('id', user.id).single();

      if (profile?.display_name) return;

      const emailPrefix = user.email?.split('@')[0] || 'user';
      await supabase.from('profiles').update({ display_name: emailPrefix }).eq('id', user.id);
      await supabase.auth.updateUser({ data: { display_name: emailPrefix } });
    } catch (err: any) {
      console.warn('ensureDisplayName error (non-critical):', err.message);
      // Non-critical - continue anyway
    }
  }, []);

  const fetchProfile = useCallback(async (currentSession: Session) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin, role, premium_expires_at')
        .eq('id', currentSession.user.id)
        .single();

      // If profile doesn't exist (e.g., new user signup), create it
      if (error && error.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: currentSession.user.id,
            role: 'member',
            is_admin: false,
            display_name: currentSession.user.user_metadata?.display_name || currentSession.user.email?.split('@')[0] || 'User'
          })
          .select()
          .single();

        if (createError) {
          console.error('Profile auto-create error:', createError);
          // Continue anyway - user might not have permission due to RLS
          setIsAdmin(false);
          setUserRole('member');
          setProfileReady(true);
          return;
        }

        if (newProfile) {
          setIsAdmin(newProfile.is_admin || false);
          setUserRole(newProfile.role as 'member' | 'premium' | 'admin');
        }
      } else if (error) {
        console.error('Profile fetch error:', error);
        // Try to create profile as fallback
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: currentSession.user.id,
            role: 'member',
            is_admin: false,
            display_name: currentSession.user.user_metadata?.display_name || currentSession.user.email?.split('@')[0] || 'User'
          })
          .select()
          .single();

        if (newProfile) {
          setIsAdmin(newProfile.is_admin || false);
          setUserRole(newProfile.role as 'member' | 'premium' | 'admin');
        }
      } else if (data) {
        let role = data.role || (data.is_admin ? 'admin' : 'member');

        // Premium expiry auto-downgrade
        if (role === 'premium' && data.premium_expires_at) {
          const expiry = new Date(data.premium_expires_at);
          if (expiry < new Date()) {
            role = 'member';
            await supabase
              .from('profiles')
              .update({ role: 'member' })
              .eq('id', currentSession.user.id);
          }
        }

        setIsAdmin(data.is_admin);
        setUserRole(role as 'member' | 'premium' | 'admin');
      }
    } catch (err: any) {
      console.error('Profile fetch/create error:', err);
      setStatus({ type: 'error', message: translateError(err.message) });
    } finally {
      setProfileReady(true);
    }
  }, [setStatus]);

  // ── FIX 1: Session + Profile တပြိုင်နက် fetch → login delay ဖြေရှင်း ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        // fetchProfile ကို await မစောင့်ဘဲ parallel ဆွဲ
        fetchProfile(session);
        ensureDisplayName(session);
      } else {
        setProfileReady(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(null);
        window.location.hash = '#type=recovery';
        return;
      }
      setSession(session);
      if (session) {
        fetchProfile(session);
        ensureDisplayName(session);
      } else {
        setIsAdmin(false);
        setUserRole('member');
        setProfileReady(true);
      }
    });

    return () => { subscription.unsubscribe(); };
  }, [fetchProfile, ensureDisplayName]);

  // ── FIX 2: Realtime subscription — session state ကို directly သုံး ──
  // session?.user?.id ပြောင်းတိုင်း channel rebuild လုပ်
  useEffect(() => {
    // ဟောင်း channel ဖြုတ်
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    if (!session?.user?.id) return;

    const userId = session.user.id;

    const channel = supabase
      .channel(`profile-role-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        () => {
          // Admin က role/premium ပြောင်းလိုက်တာနဲ့ ချက်ချင်း re-fetch
          fetchProfile(session);
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [session?.user?.id, fetchProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return {
    session,
    isAdmin,
    userRole,
    profileReady,
    handleLogout,
    fetchProfile,
  };
}