import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, CheckCircle2, ArrowLeft, KeyRound, Eye, EyeOff, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { Status } from '../types';
import { ErrorModal } from './ErrorModal';
import { translateError } from '../lib/errorUtils';
import { useLanguage } from '../lib/LanguageContext';

interface AuthFormProps {
  status: Status | null;
  setStatus: (status: Status | null) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

// Reusable password input with eye toggle
const PasswordInput: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}> = ({ value, onChange, placeholder = '••••••••', className = '', required = true }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full h-12 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl px-4 pr-11 text-body outline-none focus:border-[#7c6aff]/50 transition-all ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

export const AuthForm: React.FC<AuthFormProps> = ({ status, setStatus }) => {
  const { t } = useLanguage();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Check URL hash for recovery token
  React.useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setAuthMode('reset');
    }
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setStatus(null);
    try {
      if (authMode === 'signup') {
        const trimmedUsername = username.trim();
        if (!trimmedUsername) {
          toast.error(t('toast_username_required'));
          setAuthLoading(false);
          return;
        }
        // Sign up with username in user_metadata
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: trimmedUsername }
          }
        });
        if (error) throw error;

        // Also upsert into profiles table if user created
        if (data.user) {
          await supabase
            .from('profiles')
            .upsert({ id: data.user.id, display_name: trimmedUsername }, { onConflict: 'id' })
            .eq('id', data.user.id);
        }

        toast.success(t('toast_signup_success'));
        setStatus({ type: 'success', message: t('toast_signup_success') });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t('toast_signin_success'));
      }
    } catch (err: any) {
      const msg = translateError(err.message);
      toast.error(msg);
      setStatus({ type: 'error', message: msg });
      setShowErrorModal(true);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setStatus(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#type=recovery`,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success(t('toast_pw_reset_sent'));
    } catch (err: any) {
      const msg = translateError(err.message);
      toast.error(msg);
      setStatus({ type: 'error', message: msg });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('toast_pw_mismatch_check'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('toast_pw_too_short'));
      return;
    }
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t('toast_pw_changed_signin'));
      // Clear hash and show login page
      window.location.hash = '';
      setAuthMode('login');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = translateError(err.message);
      toast.error(msg);
      setStatus({ type: 'error', message: msg });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) {
      const msg = translateError(error.message);
      toast.error(msg);
      setStatus({ type: 'error', message: msg });
      setShowErrorModal(true);
    }
    // After Google OAuth redirect back, App.tsx onAuthStateChange will handle
    // setting display_name from email prefix if not already set
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans flex items-center justify-center p-5">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[80%] h-[50%] bg-[#7c6aff18] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[60%] h-[40%] bg-[#34d39910] blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[400px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] p-8 sm:p-10 shadow-2xl"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="relative mb-2">
            <div className="absolute inset-0 bg-[#7c6aff]/20 blur-xl rounded-full" />
            <img src="/inlogo.png" alt="App Logo" className="w-14 h-14 relative z-10" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter bg-gradient-to-r from-[#7c6aff] to-[#34d399] bg-clip-text text-transparent">
            {t('auth_app_name')}
          </h1>
          <p className="text-text-secondary text-body mt-1">{t('auth_subtitle')}</p>
        </div>

        <AnimatePresence mode="wait">

          {/* ─── LOGIN / SIGNUP ─── */}
          {(authMode === 'login' || authMode === 'signup') && (
            <motion.div key="auth" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">

                {/* Username field — signup only */}
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-caption font-semibold text-text-muted tracking-tight mb-2 ml-1">{t('auth_username')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                        <User size={15} />
                      </span>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        {...{ placeholder: t('auth_username_placeholder') }}
                        maxLength={32}
                        className="w-full h-12 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl pl-9 pr-4 text-body outline-none focus:border-[#7c6aff]/50 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-caption font-semibold text-text-muted tracking-tight mb-2 ml-1">{t('auth_email_label')}</label>
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    {...{ placeholder: t('auth_email_placeholder') }}
                    className="w-full h-12 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl px-4 text-body outline-none focus:border-[#7c6aff]/50 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2 ml-1">
                    <label className="text-caption font-semibold text-text-muted tracking-tight">{t('auth_password_label')}</label>
                    {authMode === 'login' && (
                      <button type="button" onClick={() => { setAuthMode('forgot'); setStatus(null); setResetSent(false); }}
                        className="text-caption text-[#a78bfa] hover:text-[#7c6aff] transition-colors">
                        {t('auth_forgot_link')}
                      </button>
                    )}
                  </div>
                  <PasswordInput value={password} onChange={e => setPassword(e.target.value)} />
                </div>

                {status?.type === 'success' && (
                  <div className="text-sub text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 p-3 rounded-xl flex items-center gap-2">
                    <CheckCircle2 size={14} />{status.message}
                  </div>
                )}

                <button type="submit" disabled={authLoading}
                  className="w-full h-12 rounded-2xl bg-[#7c6aff] text-white font-bold hover:bg-[#a78bfa] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {authLoading ? <Loader2 size={18} className="animate-spin" /> : (authMode === 'login' ? t('auth_sign_in') : t('auth_create_account'))}
                </button>
              </form>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border-color)]"></div>
                </div>
                <div className="relative flex justify-center text-tiny tracking-tight">
                  <span className="bg-[var(--bg-card)] px-3 text-text-muted">{t('auth_or_continue')}</span>
                </div>
              </div>

              <button type="button" onClick={handleGoogleLogin}
                className="w-full h-12 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)] text-text-primary font-semibold flex items-center justify-center gap-3 hover:bg-[var(--bg-hover)] transition-all mb-6">
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                Google
              </button>

              <div className="text-center">
                <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setStatus(null); setUsername(''); }}
                  className="text-sub text-text-muted hover:text-[#a78bfa] transition-all">
                  {authMode === 'login' ? t('auth_no_account') : t('auth_have_account')}
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── FORGOT PASSWORD ─── */}
          {authMode === 'forgot' && (
            <motion.div key="forgot" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              {!resetSent ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-body text-text-muted leading-relaxed">
                      {t('auth_reset_enter_email')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-caption font-semibold text-text-muted tracking-tight mb-2 ml-1">{t('auth_email_label')}</label>
                    <input
                      type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      {...{ placeholder: t('auth_email_placeholder') }}
                      className="w-full h-12 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl px-4 text-body outline-none focus:border-[#7c6aff]/50 transition-all"
                    />
                  </div>
                  <button type="submit" disabled={authLoading}
                    className="w-full h-12 rounded-2xl bg-[#7c6aff] text-white font-bold hover:bg-[#a78bfa] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {authLoading ? <Loader2 size={18} className="animate-spin" /> : t('auth_send_reset')}
                  </button>
                  <button type="button" onClick={() => setAuthMode('login')}
                    className="w-full flex items-center justify-center gap-2 text-sub text-text-muted hover:text-[#a78bfa] transition-colors pt-1">
                    <ArrowLeft size={13} /> {t('auth_back_to_signin')}
                  </button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary mb-1">{t('auth_check_email_title')}</p>
                    <p className="text-sub text-text-muted leading-relaxed">
                      {t('auth_check_email_body', { email })}
                    </p>
                  </div>
                  <p className="text-tiny text-text-muted">{t('auth_spam_hint')}</p>
                  <button type="button" onClick={() => setAuthMode('login')}
                    className="w-full flex items-center justify-center gap-2 text-sub text-text-muted hover:text-[#a78bfa] transition-colors pt-1">
                    <ArrowLeft size={13} /> {t('auth_back_to_signin')}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── RESET PASSWORD ─── */}
          {authMode === 'reset' && (
            <motion.div key="reset" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#7c6aff]/10 flex items-center justify-center mx-auto mb-3">
                    <KeyRound size={22} className="text-[#a78bfa]" />
                  </div>
                  <p className="text-body font-bold text-text-primary">{t('auth_set_new_password')}</p>
                </div>
                <div>
                  <label className="block text-caption font-semibold text-text-muted tracking-tight mb-2 ml-1">{t('auth_new_password')}</label>
                  <PasswordInput
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    {...{ placeholder: t('auth_new_password_placeholder') }}
                  />
                </div>
                <div>
                  <label className="block text-caption font-semibold text-text-muted tracking-tight mb-2 ml-1">{t('auth_confirm_password_label')}</label>
                  <PasswordInput
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    {...{ placeholder: t('auth_confirm_password_placeholder') }}
                    className={confirmPassword && newPassword !== confirmPassword
                      ? 'border-red-500/50 focus:border-red-500'
                      : ''}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-tiny text-red-400 mt-1 ml-1">{t('auth_passwords_no_match')}</p>
                  )}
                </div>
                <button type="submit" disabled={authLoading || (!!confirmPassword && newPassword !== confirmPassword)}
                  className="w-full h-12 rounded-2xl bg-[#7c6aff] text-white font-bold hover:bg-[#a78bfa] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {authLoading ? <Loader2 size={18} className="animate-spin" /> : t('auth_update_password')}
                </button>
              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>

      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => { setShowErrorModal(false); setStatus(null); }}
        message={status?.message || ''}
      />
    </div>
  );
};