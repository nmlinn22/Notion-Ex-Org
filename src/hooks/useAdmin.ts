import { ts } from '../lib/LanguageContext';
import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Status } from '../types';
import { translateError, parseHttpError } from '../lib/errorUtils';

// Use shared parseHttpError from errorUtils

export function useAdmin(session: Session | null, isAdmin: boolean, setStatus: (status: Status | null) => void) {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<Record<string, { count: number; last_active: string }>>({});

  const fetchPendingUsers = useCallback(async (currentSession: Session) => {
    try {
      const res = await fetch(`${window.location.origin}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
      });
      if (res.ok) {
        const text = await res.text();
        if (!text) { setPendingUsers([]); return; }
        try {
          const data = JSON.parse(text);
          setPendingUsers(Array.isArray(data) ? data : []);
        } catch (e) {
          console.error("Failed to parse admin users JSON:", text);
        }
      }
    } catch (err: any) {
      console.error("Fetch pending users error:", err);
      setStatus({ type: 'error', message: translateError(err.message) });
    }
  }, [setStatus]);

  const fetchUserStats = useCallback(async (currentSession: Session) => {
    try {
      const res = await fetch(`${window.location.origin}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserStats(data);
      }
    } catch (err: any) {
      console.error("Fetch user stats error:", err);
    }
  }, []);

  useEffect(() => {
    if (session && isAdmin) {
      fetchPendingUsers(session);
      fetchUserStats(session);
    }
  }, [session, isAdmin, fetchPendingUsers, fetchUserStats]);

  const handleSetAdmin = async (userId: string, makeAdmin: boolean) => {
    if (!session) return;
    try {
      const res = await fetch(`${window.location.origin}/api/admin/set-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId, isAdmin: makeAdmin })
      });
      if (res.ok) {
        fetchPendingUsers(session);
        toast.success(makeAdmin ? ts('admin_promote') : ts('admin_demote'));
        setTimeout(() => setStatus(null), 2000);
      } else {
        const text = await res.text();
        throw new Error(parseHttpError(text, res.status));
      }
    } catch (err: any) {
      const msg = translateError(err.message);
      toast.error(msg);
      setStatus({ type: 'error', message: msg });
    }
  };

  const handleSetRole = async (userId: string, role: 'member' | 'premium' | 'admin') => {
    if (!session) return;
    try {
      const res = await fetch(`${window.location.origin}/api/admin/set-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId, role })
      });
      if (res.ok) {
        fetchPendingUsers(session);
        const labels: Record<string, string> = { member: 'Member', premium: 'Premium', admin: 'Admin' };
        toast.success(ts('toast_role_changed', { role: labels[role] }));
      } else {
        const text = await res.text();
        throw new Error(parseHttpError(text, res.status));
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!session) return;
    try {
      const res = await fetch(`${window.location.origin}/api/admin/user/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        toast.success(ts('toast_account_deleted', { email: userEmail }));
        setTimeout(() => setStatus(null), 2000);
      } else {
        const text = await res.text();
        throw new Error(parseHttpError(text, res.status));
      }
    } catch (err: any) {
      const msg = translateError(err.message);
      toast.error(msg);
      setStatus({ type: 'error', message: msg });
    }
  };

  return {
    pendingUsers,
    userStats,
    handleSetAdmin,
    handleSetRole,
    handleDeleteUser,
    fetchPendingUsers
  };
}