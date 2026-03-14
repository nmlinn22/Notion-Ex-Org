import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Session } from '@supabase/supabase-js';
import {
  LogOut, Sun, Moon, Database, Smartphone,
  ShieldCheck, Crown,
  Wallet, KeyRound, Trash2, AlertTriangle, X, Loader2, Eye, EyeOff, Settings, Check,
} from 'lucide-react';
import { Entry } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useLanguage } from '../lib/LanguageContext';
import { NotificationBell } from './NotificationBell';

// ── Custom SVG Avatar Icons ───────────────────────────────────────────────
const AVATAR_ICONS: { id: string; label: string; color: string; bg: string; svg: React.ReactNode }[] = [
  {
    id: 'cash',
    label: 'Cash',
    color: '#22c55e',
    bg: '#dcfce7',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
        <rect x="4" y="12" width="32" height="18" rx="3" fill="#22c55e" />
        <rect x="4" y="12" width="32" height="18" rx="3" stroke="#16a34a" strokeWidth="1.5" />
        <circle cx="20" cy="21" r="5" fill="#fff" opacity="0.9" />
        <text x="20" y="25" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#16a34a">$</text>
        <rect x="4" y="16" width="6" height="5" rx="1" fill="#fff" opacity="0.3" />
        <rect x="30" y="21" width="6" height="5" rx="1" fill="#fff" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: 'moneybag',
    label: 'Money Bag',
    color: '#f59e0b',
    bg: '#fef3c7',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
        <ellipse cx="20" cy="26" rx="13" ry="11" fill="#f59e0b" />
        <ellipse cx="20" cy="26" rx="13" ry="11" stroke="#d97706" strokeWidth="1.5" />
        <path d="M15 15 Q20 8 25 15" stroke="#d97706" strokeWidth="2" strokeLinecap="round" fill="none" />
        <rect x="16" y="13" width="8" height="3" rx="1.5" fill="#fbbf24" />
        <text x="20" y="30" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">$</text>
      </svg>
    ),
  },
  {
    id: 'wallet',
    label: 'Wallet',
    color: '#8b5cf6',
    bg: '#ede9fe',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
        <rect x="5" y="13" width="30" height="20" rx="3" fill="#8b5cf6" />
        <rect x="5" y="13" width="30" height="20" rx="3" stroke="#7c3aed" strokeWidth="1.5" />
        <rect x="5" y="17" width="30" height="5" fill="#7c3aed" opacity="0.5" />
        <rect x="24" y="19" width="10" height="8" rx="2" fill="#a78bfa" stroke="#7c3aed" strokeWidth="1" />
        <circle cx="29" cy="23" r="2" fill="#ede9fe" />
      </svg>
    ),
  },
  {
    id: 'coins',
    label: 'Coins',
    color: '#f59e0b',
    bg: '#fef9c3',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
        <ellipse cx="24" cy="28" rx="9" ry="5" fill="#fbbf24" stroke="#d97706" strokeWidth="1.2" />
        <ellipse cx="24" cy="25" rx="9" ry="5" fill="#fcd34d" stroke="#d97706" strokeWidth="1.2" />
        <ellipse cx="24" cy="22" rx="9" ry="5" fill="#fde68a" stroke="#d97706" strokeWidth="1.2" />
        <ellipse cx="16" cy="20" rx="7" ry="4" fill="#fbbf24" stroke="#d97706" strokeWidth="1.2" />
        <ellipse cx="16" cy="17" rx="7" ry="4" fill="#fcd34d" stroke="#d97706" strokeWidth="1.2" />
        <text x="16" y="20" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#92400e">$</text>
      </svg>
    ),
  },
  {
    id: 'piggybank',
    label: 'Piggy Bank',
    color: '#ec4899',
    bg: '#fce7f3',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
        <ellipse cx="19" cy="23" rx="13" ry="11" fill="#f472b6" />
        <ellipse cx="19" cy="23" rx="13" ry="11" stroke="#db2777" strokeWidth="1.5" />
        <circle cx="13" cy="19" r="3" fill="#fce7f3" stroke="#db2777" strokeWidth="1" />
        <circle cx="13" cy="19" r="1.2" fill="#db2777" />
        <path d="M31 20 Q35 18 34 24 Q33 26 31 25" fill="#fda4af" stroke="#db2777" strokeWidth="1" />
        <rect x="15" y="11" width="8" height="3" rx="1.5" fill="#f472b6" stroke="#db2777" strokeWidth="1" />
        <rect x="18" y="9" width="3" height="3" rx="1" fill="#fb7185" />
        <line x1="14" y1="33" x2="14" y2="36" stroke="#db2777" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="19" y1="34" x2="19" y2="37" stroke="#db2777" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="24" y1="33" x2="24" y2="36" stroke="#db2777" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'creditcard',
    label: 'Credit Card',
    color: '#3b82f6',
    bg: '#dbeafe',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
        <rect x="4" y="10" width="32" height="22" rx="3" fill="#3b82f6" />
        <rect x="4" y="10" width="32" height="22" rx="3" stroke="#2563eb" strokeWidth="1.5" />
        <rect x="4" y="16" width="32" height="7" fill="#2563eb" opacity="0.6" />
        <rect x="7" y="26" width="10" height="3" rx="1" fill="#93c5fd" />
        <rect x="20" y="26" width="6" height="3" rx="1" fill="#93c5fd" opacity="0.6" />
        <rect x="28" y="26" width="6" height="3" rx="1" fill="#93c5fd" opacity="0.6" />
        <rect x="7" y="12" width="8" height="5" rx="1" fill="#bfdbfe" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: 'bank',
    label: 'Bank',
    color: '#06b6d4',
    bg: '#cffafe',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
        <rect x="5" y="30" width="30" height="4" rx="1" fill="#0891b2" />
        <rect x="8" y="18" width="4" height="12" fill="#06b6d4" />
        <rect x="14" y="18" width="4" height="12" fill="#06b6d4" />
        <rect x="20" y="18" width="4" height="12" fill="#06b6d4" />
        <rect x="26" y="18" width="4" height="12" fill="#06b6d4" />
        <polygon points="4,17 20,7 36,17" fill="#0891b2" />
        <circle cx="20" cy="13" r="2.5" fill="#cffafe" />
        <rect x="5" y="17" width="30" height="2" rx="1" fill="#164e63" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: 'chart',
    label: 'Chart',
    color: '#10b981',
    bg: '#d1fae5',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
        <rect x="5" y="30" width="30" height="2.5" rx="1" fill="#065f46" opacity="0.5" />
        <rect x="7" y="22" width="5" height="9" rx="1" fill="#34d399" />
        <rect x="14" y="17" width="5" height="14" rx="1" fill="#10b981" />
        <rect x="21" y="13" width="5" height="18" rx="1" fill="#059669" />
        <rect x="28" y="19" width="5" height="12" rx="1" fill="#34d399" />
        <polyline points="9.5,21 16.5,16 23.5,12 30.5,18" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: 'safe',
    label: 'Safe',
    color: '#64748b',
    bg: '#f1f5f9',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
        <rect x="6" y="8" width="28" height="26" rx="3" fill="#64748b" />
        <rect x="6" y="8" width="28" height="26" rx="3" stroke="#475569" strokeWidth="1.5" />
        <rect x="10" y="12" width="20" height="16" rx="2" fill="#475569" />
        <circle cx="20" cy="20" r="5" fill="#94a3b8" stroke="#64748b" strokeWidth="1.2" />
        <circle cx="20" cy="20" r="2.5" fill="#cbd5e1" />
        <line x1="20" y1="17.5" x2="20" y2="20" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="28" y="15" width="5" height="3" rx="1" fill="#94a3b8" />
        <rect x="28" y="22" width="5" height="3" rx="1" fill="#94a3b8" />
        <line x1="16" y1="34" x2="16" y2="37" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="24" y1="34" x2="24" y2="37" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'phone',
    label: 'Mobile Pay',
    color: '#6366f1',
    bg: '#e0e7ff',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
        <rect x="10" y="4" width="20" height="33" rx="4" fill="#6366f1" />
        <rect x="10" y="4" width="20" height="33" rx="4" stroke="#4f46e5" strokeWidth="1.5" />
        <rect x="13" y="8" width="14" height="22" rx="2" fill="#e0e7ff" />
        <circle cx="20" cy="33.5" r="1.5" fill="#a5b4fc" />
        <text x="20" y="23" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#4f46e5">$</text>
        <path d="M16 14 Q20 11 24 14" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: 'diamond',
    label: 'Diamond',
    color: '#06b6d4',
    bg: '#ecfeff',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
        <polygon points="20,5 35,16 20,36 5,16" fill="#22d3ee" stroke="#0891b2" strokeWidth="1.5" strokeLinejoin="round" />
        <polygon points="20,5 35,16 20,36 5,16" fill="url(#dgrad)" />
        <defs>
          <linearGradient id="dgrad" x1="5" y1="5" x2="35" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>
        <polygon points="20,5 35,16 20,20 5,16" fill="#fff" opacity="0.2" />
        <line x1="5" y1="16" x2="35" y2="16" stroke="#0891b2" strokeWidth="1" opacity="0.5" />
        <line x1="20" y1="5" x2="5" y2="16" stroke="#fff" strokeWidth="1" opacity="0.3" />
        <line x1="20" y1="5" x2="35" y2="16" stroke="#fff" strokeWidth="1" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: 'receipt',
    label: 'Receipt',
    color: '#f97316',
    bg: '#ffedd5',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
        <path d="M8 5 L8 35 L12 32 L16 35 L20 32 L24 35 L28 32 L32 35 L32 5 Z" fill="#fb923c" stroke="#ea580c" strokeWidth="1.2" strokeLinejoin="round" />
        <line x1="12" y1="13" x2="28" y2="13" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
        <line x1="12" y1="18" x2="28" y2="18" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
        <line x1="12" y1="23" x2="22" y2="23" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
        <text x="20" y="10" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#fff" opacity="0.9">$</text>
      </svg>
    ),
  },
];

// ── Interfaces ────────────────────────────────────────────────────────────
interface ProfileProps {
  session: Session;
  isAdmin: boolean;
  theme: 'dark' | 'light';
  setTheme: (val: 'dark' | 'light') => void;
  storageMode: 'app' | 'notion';
  setStorageMode: (val: 'app' | 'notion') => void;
  history: Entry[];
  totalCount: number;
  handleLogout: () => void;
  onOpenSettings: () => void;
  onOpenPremium?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({
  session, isAdmin, theme, setTheme, storageMode, setStorageMode,
  history, totalCount, handleLogout, onOpenSettings, onOpenPremium,
}) => {
  const { t } = useLanguage();
  const email = session.user.email ?? '';

  // Avatar icon state
  const [avatarIconId, setAvatarIconId] = useState<string>('wallet');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [savingIcon, setSavingIcon] = useState(false);

  // Display name state
  const [displayName, setDisplayName] = useState<string>('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const joinedAt = session.user.created_at ? new Date(session.user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  // User role
  const [userRole, setUserRole] = useState<'member' | 'premium' | 'admin'>('member');
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);
  const canUseNotion = userRole === 'premium' || userRole === 'admin';

  // Password modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  // Load avatar icon + display_name + role from Supabase
  useEffect(() => {
    supabase
      .from('profiles')
      .select('avatar_icon, display_name, role, premium_expires_at')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.avatar_icon) setAvatarIconId(data.avatar_icon);
        if (data?.display_name) setDisplayName(data.display_name);
        if (data?.role) setUserRole(data.role);
        setPremiumExpiresAt(data?.premium_expires_at ?? null);
      });
  }, [session.user.id]);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) { setEditingName(false); return; }
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: trimmed })
        .eq('id', session.user.id);
      if (error) throw error;
      setDisplayName(trimmed);
      toast.success(t('toast_name_updated'));
    } catch {
      toast.error(t('toast_name_failed'));
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  };

  const handleSelectIcon = async (iconId: string) => {
    setSavingIcon(true);
    setAvatarIconId(iconId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_icon: iconId })
        .eq('id', session.user.id);
      if (error) throw error;
      toast.success(t('toast_avatar_updated'));
    } catch {
      toast.error(t('toast_avatar_failed'));
    } finally {
      setSavingIcon(false);
      setShowIconPicker(false);
    }
  };

  const stats = useMemo(() => {
    const totalIncome = history.reduce((s, e) => s + (e.income || 0), 0);
    const totalExpense = history.reduce((s, e) => s + (e.expense || 0), 0);
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }, [history]);

  function fmt(n: number) {
    if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'K';
    return n.toLocaleString();
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error(t('toast_pw_too_short')); return; }
    if (newPassword !== confirmPassword) { toast.error(t('toast_pw_mismatch')); return; }
    setIsChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t('toast_pw_changed'));
      setShowPasswordModal(false); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password.');
    } finally { setIsChangingPw(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'CONFIRM') return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${window.location.origin}/api/account/self`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Delete failed'); }
      toast.success(t('toast_account_deleted_self'));
      await supabase.auth.signOut();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  const currentIcon = AVATAR_ICONS.find(i => i.id === avatarIconId) ?? AVATAR_ICONS[2];

  const si = (i: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.06, duration: 0.3 },
  });



  const sectionLabel = (text: string) => (
    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">{text}</p>
  );

  // iOS-style row helper
  const Row = ({ icon, iconBg, iconColor, label, sublabel, right, onClick, danger = false }: {
    icon: React.ReactNode; iconBg: string; iconColor: string;
    label: string; sublabel?: string; right?: React.ReactNode;
    onClick?: () => void; danger?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors active:opacity-60 ${danger ? 'hover:bg-red-500/5' : 'hover:bg-[var(--bg-hover)]'}`}
    >
      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div className="flex-1 text-left">
        <p className={`text-[13.5px] font-medium ${danger ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>{label}</p>
        {sublabel && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{sublabel}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </button>
  );

  const ChevronRight = () => (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
      <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]" />
    </svg>
  );

  const GroupBox = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden divide-y divide-[var(--border-color)]">
      {children}
    </div>
  );

  return (
    <div className="relative z-10 w-full pb-28 pt-3 flex flex-col gap-3">

      {/* Header */}
      <motion.div {...si(0)} className="flex items-center justify-between px-4">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">{t('profile_title')}</h2>
        <div className="flex items-center gap-2">
          <NotificationBell session={session} />
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[#a78bfa] transition-colors"
          >
            <Settings size={17} />
          </button>
        </div>
      </motion.div>

      {/* Avatar + Identity */}
      <motion.div {...si(1)} className="flex items-center gap-4 px-4 py-2">
        {/* Avatar */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowIconPicker(true)}
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden transition-transform active:scale-95"
            style={{ backgroundColor: currentIcon.bg }}
          >
            <div className="w-10 h-10">{currentIcon.svg}</div>
            <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-black/30 flex items-center justify-center">
              <Settings size={8} className="text-white" />
            </div>
          </button>
          {isAdmin && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-amber-500 flex items-center justify-center shadow-md">
              <ShieldCheck size={11} className="text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                className="text-sm font-semibold bg-[var(--bg-input)] border border-[#7c6aff]/60 rounded-lg px-2 py-1 outline-none flex-1 min-w-0 text-[var(--text-primary)]"
                placeholder={t('profile_display_name_placeholder')}
                maxLength={30}
              />
              <button onClick={handleSaveName} disabled={savingName} className="w-7 h-7 rounded-lg bg-[#7c6aff] flex items-center justify-center shrink-0">
                {savingName ? <Loader2 size={11} className="text-white animate-spin" /> : <Check size={11} className="text-white" />}
              </button>
              <button onClick={() => setEditingName(false)} className="w-7 h-7 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
                <X size={11} className="text-[var(--text-muted)]" />
              </button>
            </div>
          ) : (
            <button onClick={() => { setNameInput(displayName); setEditingName(true); }} className="group flex items-center gap-1 text-left w-full">
              <span className="text-[15px] font-semibold text-[var(--text-primary)] group-hover:text-[#a78bfa] transition-colors truncate">
                {displayName || <span className="text-[var(--text-muted)] font-normal text-sm">{t('profile_add_display_name')}</span>}
              </span>
              <Settings size={10} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
          <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{email}</p>
          {joinedAt && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t('profile_joined')} {joinedAt}</p>}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {userRole === 'admin' || isAdmin ? (
              <span className="text-[9px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/25 px-1.5 py-0.5 rounded-full">👑 {t('role_admin')}</span>
            ) : userRole === 'premium' ? (
              <span className="text-[9px] font-semibold bg-[#7c6aff]/15 text-[#a78bfa] border border-[#7c6aff]/25 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                ⭐ {t('role_premium')}
                {premiumExpiresAt && (() => {
                  const days = Math.ceil((new Date(premiumExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return days > 0
                    ? <span className="bg-[#7c6aff]/20 px-1 rounded-full text-[8px]">{days} ရက်ကျန်</span>
                    : <span className="bg-red-500/20 text-red-400 px-1 rounded-full text-[8px]">သက်တမ်းကုန်</span>;
                })()}
              </span>
            ) : (
              <span className="text-[9px] font-semibold bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border-color)] px-1.5 py-0.5 rounded-full">{t('role_member')}</span>
            )}
            <span className="text-[9px] text-[var(--text-muted)] bg-[var(--bg-input)] border border-[var(--border-color)] px-1.5 py-0.5 rounded-full">
              {storageMode === 'app' ? t('profile_app_only') : t('profile_notion_sync')}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Preferences */}
      <motion.div {...si(2)} className="flex flex-col gap-2 px-4">
        <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest px-1 mb-1">{t('profile_preferences')}</p>
        <GroupBox>
          <Row
            icon={theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            iconBg={theme === 'dark' ? '#fef3c720' : '#eff6ff'}
            iconColor={theme === 'dark' ? '#fbbf24' : '#60a5fa'}
            label={theme === 'dark' ? t('profile_light_mode') : t('profile_dark_mode')}
            sublabel={t('profile_theme_current', { mode: theme === 'dark' ? t('profile_mode_dark') : t('profile_mode_light') })}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            right={
              <div className={`w-10 h-[22px] rounded-full p-[2px] transition-colors duration-300 ${theme === 'dark' ? 'bg-[var(--bg-input)]' : 'bg-[#7c6aff]'}`}>
                <div className={`w-[18px] h-[18px] rounded-full bg-white shadow transition-transform duration-300 ${theme === 'dark' ? 'translate-x-0' : 'translate-x-[18px]'}`} />
              </div>
            }
          />
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-blue-500/15 flex items-center justify-center shrink-0">
                <Database size={15} className="text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-[13.5px] font-medium text-[var(--text-primary)]">{t('profile_storage_mode')}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{t('profile_storage_hint')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {/* App Only — always available */}
              <button onClick={() => setStorageMode('app')}
                className={`py-2 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  storageMode === 'app' ? 'bg-[#7c6aff] text-white shadow-md shadow-[#7c6aff]/20' : 'bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border-color)]'
                }`}>
                <Smartphone size={11} />{t('profile_app_only')}
              </button>
              {/* Notion Sync — Premium/Admin only */}
              <button
                onClick={() => !canUseNotion ? onOpenPremium?.() : setStorageMode('notion')}
                className={`py-2 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 relative overflow-hidden ${
                  !canUseNotion
                    ? 'bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-muted)] hover:border-amber-500/30'
                    : storageMode === 'notion'
                      ? 'bg-[#7c6aff] text-white shadow-md shadow-[#7c6aff]/20'
                      : 'bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border-color)]'
                }`}>
                <Database size={11} />
                {t('profile_notion_sync')}
                {!canUseNotion && (
                  <Crown size={9} className="text-amber-500" />
                )}
              </button>
            </div>
            </div>
        </GroupBox>
      </motion.div>

      {/* Account & Security */}
      <motion.div {...si(3)} className="flex flex-col gap-2 px-4">
        <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest px-1 mb-1">{t('profile_account_security')}</p>
        <GroupBox>
          <Row
            icon={<KeyRound size={15} />}
            iconBg="#7c6aff18"
            iconColor="#a78bfa"
            label={t('profile_change_password')}
            onClick={() => setShowPasswordModal(true)}
            right={<ChevronRight />}
          />
          <Row
            icon={<Trash2 size={15} />}
            iconBg="#ef444418"
            iconColor="#f87171"
            label={t('profile_delete_account')}
            onClick={() => setShowDeleteModal(true)}
            danger
            right={<ChevronRight />}
          />
        </GroupBox>
      </motion.div>

      {/* Logout */}
      <motion.div {...si(4)} className="px-4">
        <button onClick={handleLogout}
          className="w-full h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] font-medium text-[13.5px] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          <LogOut size={15} />
          {t('auth_sign_out')}
        </button>
      </motion.div>

      {/* ── Icon Picker Modal ── */}
      <AnimatePresence>
        {showIconPicker && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowIconPicker(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-[var(--bg-card)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-color)] flex-shrink-0">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Choose Avatar</h3>
                <div className="flex items-center gap-2">
                  {savingIcon && <Loader2 size={15} className="text-[#a78bfa] animate-spin" />}
                  <button onClick={() => setShowIconPicker(false)}
                    className="w-7 h-7 rounded-lg bg-[var(--bg-input)] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
              {/* Grid */}
              <div className="p-4">
                <div className="grid grid-cols-4 gap-2.5">
                  {AVATAR_ICONS.map((icon) => {
                    const isSelected = avatarIconId === icon.id;
                    return (
                      <button
                        key={icon.id}
                        onClick={() => handleSelectIcon(icon.id)}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div
                          className="w-full aspect-square rounded-xl flex items-center justify-center transition-all group-hover:scale-105 active:scale-95 relative"
                          style={{ backgroundColor: icon.bg, border: isSelected ? `2px solid ${icon.color}` : '2px solid transparent' }}
                        >
                          <div className="w-8 h-8">{icon.svg}</div>
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center shadow-sm"
                              style={{ backgroundColor: icon.color }}>
                              <Check size={9} className="text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-text-muted font-medium leading-tight text-center">{icon.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Change Password Modal ── */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 14 }}
              className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#7c6aff] to-[#a78bfa]" />
              <button onClick={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }}
                className="absolute top-3.5 right-3.5 text-text-muted hover:text-text-primary transition-colors">
                <X size={17} />
              </button>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#7c6aff]/10 flex items-center justify-center">
                  <KeyRound size={17} className="text-[#a78bfa]" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{t('profile_change_password')}</h3>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-text-muted mb-1.5 block">{t('profile_new_password')}</label>
                  <div className="relative">
                    <input type={showNewPw ? 'text' : 'password'} value={newPassword}
                      onChange={e => setNewPassword(e.target.value)} placeholder={t('auth_new_password_placeholder')}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-[#7c6aff]/60 text-[var(--text-primary)] pr-9" />
                    <button type="button" onClick={() => setShowNewPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                      {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-text-muted mb-1.5 block">{t('profile_confirm_password')}</label>
                  <div className="relative">
                    <input type={showConfirmPw ? 'text' : 'password'} value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)} placeholder={t('auth_confirm_password_placeholder')}
                      onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
                      className={`w-full bg-[var(--bg-input)] border rounded-xl px-3.5 py-2.5 text-sm outline-none text-[var(--text-primary)] pr-9 transition-colors ${
                        confirmPassword && confirmPassword !== newPassword ? 'border-red-500/50' : 'border-[var(--border-color)] focus:border-[#7c6aff]/60'
                      }`} />
                    <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                      {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-[10px] text-red-400 mt-1 ml-1">{t('auth_passwords_no_match')}</p>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }}
                    className="flex-1 h-10 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-text-muted font-semibold text-sm hover:text-text-primary transition-all">
                    {t('btn_cancel')}
                  </button>
                  <button onClick={handleChangePassword}
                    disabled={isChangingPw || newPassword.length < 6 || newPassword !== confirmPassword}
                    className="flex-1 h-10 rounded-xl bg-[#7c6aff] text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 hover:bg-[#a78bfa]">
                    {isChangingPw ? <Loader2 size={14} className="animate-spin" /> : null}
                    {isChangingPw ? t('saving') : t('btn_save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Account Modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 14 }}
              className="w-full max-w-sm bg-[var(--bg-card)] border border-red-500/20 rounded-2xl p-5 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-500" />
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="absolute top-3.5 right-3.5 text-text-muted hover:text-text-primary transition-colors">
                <X size={17} />
              </button>
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{t('profile_delete_account')}</h3>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    {t('profile_delete_desc')}<br />
                    {t('profile_delete_type', { word: 'CONFIRM' })}
                  </p>
                </div>
                <input type="text" value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="CONFIRM" autoCapitalize="characters"
                  className="w-full bg-[var(--bg-input)] border border-red-500/30 rounded-xl px-4 py-2.5 text-sm font-black text-center outline-none focus:border-red-500/60 text-[var(--text-primary)] placeholder:font-normal tracking-widest" />
                <div className="flex gap-2 w-full">
                  <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                    className="flex-1 h-10 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-text-muted font-semibold text-sm hover:text-text-primary transition-all">
                    {t('btn_cancel')}
                  </button>
                  <button onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'CONFIRM' || isDeleting}
                    className="flex-1 h-10 rounded-xl bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 hover:bg-red-400">
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {isDeleting ? t('deleting') : t('btn_delete')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};