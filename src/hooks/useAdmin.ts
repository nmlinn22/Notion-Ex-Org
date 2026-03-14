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

  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);

  const fetchPendingUsers = useCallback(async (currentSession?: Session | null) => {
    const s = currentSession || session;
    if (!s) return;
    try {
      const res = await fetch(`${window.location.origin}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${s.access_token}` }
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
  }, [setStatus, session]);

  const fetchUserStats = useCallback(async (currentSession?: Session | null) => {
    const s = currentSession || session;
    if (!s) return;
    try {
      const res = await fetch(`${window.location.origin}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${s.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserStats(data);
        setPendingPaymentCount(data.pendingPayments || 0);
      }
    } catch (err: any) {
      console.error("Fetch user stats error:", err);
    }
  }, [session]);

  useEffect(() => {
    if (session && isAdmin) {
      fetchPendingUsers(session);
      fetchUserStats(session);
    }
  }, [session, isAdmin, fetchPendingUsers, fetchUserStats]);

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

  const handleUpdatePremium = async (userId: string, options: { days?: number; expiryDate?: string; reset?: boolean }) => {
    if (!session) return;
    try {
      const res = await fetch(`${window.location.origin}/api/admin/update-premium`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId, ...options })
      });
      if (res.ok) {
        fetchPendingUsers(session);
        toast.success(ts('toast_premium_updated'));
        return true;
      } else {
        const text = await res.text();
        throw new Error(parseHttpError(text, res.status));
      }
    } catch (err: any) {
      toast.error(err.message);
      return false;
    }
  };

  const handleToggleBan = async (userId: string, isBanned: boolean) => {
    if (!session) return;
    try {
      const res = await fetch(`${window.location.origin}/api/admin/toggle-ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId, isBanned })
      });
      if (res.ok) {
        fetchPendingUsers(session);
        toast.success(isBanned ? ts('toast_user_banned') : ts('toast_user_unbanned'));
        return true;
      } else {
        const text = await res.text();
        throw new Error(parseHttpError(text, res.status));
      }
    } catch (err: any) {
      toast.error(err.message);
      return false;
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    if (!session) return;
    try {
      const res = await fetch(`${window.location.origin}/api/admin/approve-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ paymentId })
      });
      if (res.ok) {
        toast.success(ts('toast_payment_approved'));
        return true;
      } else {
        const text = await res.text();
        throw new Error(parseHttpError(text, res.status));
      }
    } catch (err: any) {
      toast.error(err.message);
      return false;
    }
  };

  const handleRejectPayment = async (paymentId: string, reason: string) => {
    if (!session) return;
    try {
      const res = await fetch(`${window.location.origin}/api/admin/reject-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ paymentId, reason })
      });
      if (res.ok) {
        toast.success(ts('toast_payment_rejected'));
        return true;
      } else {
        const text = await res.text();
        throw new Error(parseHttpError(text, res.status));
      }
    } catch (err: any) {
      toast.error(err.message);
      return false;
    }
  };

  const handleUndoPayment = async (paymentId: string) => {
    if (!session) return;
    try {
      const res = await fetch(`${window.location.origin}/api/admin/undo-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ paymentId })
      });
      if (res.ok) {
        toast.success(ts('toast_payment_undone'));
        return true;
      } else {
        const text = await res.text();
        throw new Error(parseHttpError(text, res.status));
      }
    } catch (err: any) {
      toast.error(err.message);
      return false;
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!session) return;
    try {
      const res = await fetch(`${window.location.origin}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        toast.success(ts('toast_password_reset_sent'));
        return true;
      } else {
        const text = await res.text();
        throw new Error(parseHttpError(text, res.status));
      }
    } catch (err: any) {
      toast.error(err.message);
      return false;
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
        return true;
      } else {
        const text = await res.text();
        throw new Error(parseHttpError(text, res.status));
      }
    } catch (err: any) {
      toast.error(err.message);
      return false;
    }
  };

  return {
    pendingUsers,
    userStats,
    handleSetRole,
    handleUpdatePremium,
    handleToggleBan,
    handleApprovePayment,
    handleRejectPayment,
    handleUndoPayment,
    handleResetPassword,
    handleDeleteUser,
    fetchPendingUsers,
    pendingPaymentCount
  };
}
