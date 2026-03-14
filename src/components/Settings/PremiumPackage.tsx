import React, { useState } from 'react';
import { useLanguage } from '../../lib/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface PremiumPackageProps {
  userEmail?: string;
  session?: Session | null;
}

const FEATURE_KEYS = [
  { icon: '🧾', key: 'premium_pkg_feature_receipt' },
  { icon: '📊', key: 'premium_pkg_feature_csv' },
  { icon: '🔄', key: 'premium_pkg_feature_autopay' },
  { icon: '☁️', key: 'premium_pkg_feature_backup' },
  { icon: '⚡', key: 'premium_pkg_feature_notion' },
  { icon: '🛡️', key: 'premium_pkg_feature_support' },
  { icon: '📝', key: 'premium_pkg_feature_manual' },
  { icon: '📈', key: 'premium_pkg_feature_dashboard' },
  { icon: '💾', key: 'premium_pkg_feature_export' },
] as const;
const FREE_ACCESS    = [false, false, false, false, false, false, true, true, true];
const PREMIUM_ACCESS = [true,  true,  true,  true,  true,  true,  true, true, true];

const PLANS = [
  {
    id: 'days_30',
    days: 30,
    price: 8000,
    discount: null,
    badge: null,
  },
  {
    id: 'days_90',
    days: 90,
    price: 20000,
    discount: 17,
    badge: 'popular',
  },
  {
    id: 'days_180',
    days: 180,
    price: 36000,
    discount: 25,
    badge: 'best_value',
  },
  {
    id: 'days_365',
    days: 365,
    price: 60000,
    discount: 39,
    badge: null,
  },
] as const;

const PAYMENT_METHODS = [
  { id: 'kbz',  name: 'KBZPay',     number: '09773123404', logo: '/kbz-192x192.png' },
  { id: 'wave', name: 'Wave Money', number: '09977313677', logo: '/wave-192x192.png' },
];

export const PremiumPackage: React.FC<PremiumPackageProps> = ({ userEmail, session }) => {
  const { t } = useLanguage();
  const [selectedPlan,    setSelectedPlan]    = useState('days_30');
  const [selectedPayment, setSelectedPayment] = useState('kbz');
  const [transactionId,   setTransactionId]   = useState('');
  const [screenshotFile,  setScreenshotFile]  = useState<File | null>(null);
  const [screenshotUrl,   setScreenshotUrl]   = useState<string | null>(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [submitted,       setSubmitted]       = useState(false);
  const [copied,          setCopied]          = useState<string | null>(null);
  const [error,           setError]           = useState<string | null>(null);

  const payment = PAYMENT_METHODS.find(p => p.id === selectedPayment)!;
  const canSubmit = transactionId.trim().length > 0 && screenshotFile !== null;

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Screenshot size must be under 5MB');
      return;
    }
    setScreenshotFile(file);
    setScreenshotUrl(URL.createObjectURL(file));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !session || !screenshotFile) return;
    setSubmitting(true);
    setError(null);

    try {
      const userId = session.user.id;
      const email = session.user.email || userEmail || '';

      // 1. Screenshot ကို Supabase Storage မှာ upload
      const fileExt = screenshotFile.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(filePath, screenshotFile, { upsert: false });

      if (uploadError) throw new Error('Screenshot upload failed: ' + uploadError.message);

      // 2. Storage path ကိုသာ သိမ်းမည် (signed URL မဟုတ်) — admin ဖက်မှာ fresh URL ယူမည်
      // 3. payment_requests table မှာ record သိမ်း
      const { error: insertError } = await supabase
        .from('payment_requests')
        .insert({
          user_id: userId,
          user_email: email,
          plan: selectedPlan,
          payment_method: payment.name,
          transaction_id: transactionId.trim(),
          screenshot_url: filePath,   // raw storage path သာ သိမ်းသည်
          status: 'pending',
        });

      if (insertError) throw new Error('Failed to save request: ' + insertError.message);

      setSubmitted(true);
      toast.success('Payment request submitted successfully!');
    } catch (err: any) {
      console.error('Payment submission error:', err);
      setError(err.message || 'Submission failed. Please try again.');
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── SUCCESS ── */
  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-3xl">✅</div>
        <div>
          <p className="font-black text-base text-text-primary mb-1">{t('premium_pkg_success_title')}</p>
          <p className="text-xs text-text-muted leading-relaxed">{t('premium_pkg_success_desc')}</p>
        </div>
        <button
          onClick={() => { setSubmitted(false); setTransactionId(''); setScreenshotUrl(null); setScreenshotFile(null); setError(null); }}
          className="px-6 py-2 rounded-full bg-[#7c6aff]/10 border border-[#7c6aff]/30 text-[#a78bfa] text-xs font-bold hover:bg-[#7c6aff]/20 transition-all"
        >
          {t('premium_pkg_back_btn')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── COMPARISON TABLE ── */}
      <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-input)]">
        <div className="grid" style={{ gridTemplateColumns: '1fr 64px 72px' }}>
          <div className="p-3 border-b border-[var(--border-color)]">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{t('premium_pkg_features_header')}</p>
          </div>
          <div className="flex items-center justify-center p-3 border-b border-l border-[var(--border-color)] bg-[var(--bg-card)]">
            <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">{t('premium_pkg_free_col')}</span>
          </div>
          <div className="flex items-center justify-center p-3 border-b border-l border-[#7c6aff]/30 bg-[#7c6aff]/8">
            <span className="text-[9px] font-black text-[#a78bfa] uppercase tracking-wider">{t('premium_pkg_pro_col')}</span>
          </div>
        </div>
        {FEATURE_KEYS.map((f, i) => {
          const isPremiumOnly = PREMIUM_ACCESS[i] && !FREE_ACCESS[i];
          const isLast = i === FEATURE_KEYS.length - 1;
          return (
            <div key={i} className="grid" style={{ gridTemplateColumns: '1fr 64px 72px' }}>
              <div className={`flex items-center gap-2 px-3 py-2 ${!isLast ? 'border-b border-[var(--border-color)]' : ''}`}>
                <span className="text-xs">{f.icon}</span>
                <span className={`text-[11px] font-bold ${isPremiumOnly ? 'text-text-primary' : 'text-text-muted'}`}>{t(f.key)}</span>
              </div>
              <div className={`flex items-center justify-center border-l border-[var(--border-color)] bg-[var(--bg-card)] ${!isLast ? 'border-b border-b-[var(--border-color)]' : ''}`}>
                {FREE_ACCESS[i] ? <span className="text-emerald-400 text-sm">✓</span> : <span className="text-text-muted/30 text-xs">—</span>}
              </div>
              <div className={`flex items-center justify-center border-l border-[#7c6aff]/20 ${isPremiumOnly ? 'bg-[#7c6aff]/5' : 'bg-[var(--bg-card)]'} ${!isLast ? 'border-b border-b-[var(--border-color)]' : ''}`}>
                {PREMIUM_ACCESS[i] ? <span className={`text-sm ${isPremiumOnly ? 'text-[#a78bfa]' : 'text-emerald-400'}`}>✓</span> : <span className="text-text-muted/30 text-xs">—</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── PLANS ── */}
      <div>
        <p className="text-xs font-semibold text-text-muted mb-3">{t('premium_pkg_choose_plan')}</p>
        <div className="grid grid-cols-2 gap-2">
          {PLANS.map(p => {
            const isSelected = selectedPlan === p.id;
            const badgeLabel = p.badge === 'popular'
              ? t('premium_pkg_badge_popular')
              : p.badge === 'best_value'
              ? t('premium_pkg_badge_best')
              : null;
            return (
              <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                className={`relative p-3 rounded-xl text-left transition-all ${isSelected ? 'border-2 border-[#7c6aff] bg-[#7c6aff]/8' : 'border-2 border-[var(--border-color)] bg-[var(--bg-input)] hover:border-[#7c6aff]/40'}`}>

                {/* Badge */}
                {badgeLabel && (
                  <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full text-white whitespace-nowrap ${p.badge === 'best_value' ? 'bg-[#7c6aff]' : 'bg-emerald-500'}`}>
                    {badgeLabel}
                  </span>
                )}

                {/* Discount */}
                {p.discount && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                    -{p.discount}%
                  </span>
                )}

                {/* Days */}
                <p className={`text-base font-black leading-none mb-0.5 ${isSelected ? 'text-[#a78bfa]' : 'text-text-primary'}`}>
                  {p.days} {t('premium_pkg_days')}
                </p>

                {/* Price */}
                <p className="text-[11px] font-semibold text-text-muted mt-1">
                  {p.price.toLocaleString()} {t('premium_pkg_currency')}
                </p>

                {/* Per day */}
                <p className="text-[9px] text-text-muted/70 mt-0.5">
                  ≈ {Math.round(p.price / p.days).toLocaleString()} {t('premium_pkg_per_day')}
                </p>

                {isSelected && (
                  <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-[#7c6aff] flex items-center justify-center text-white text-[8px] font-black">✓</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── PAYMENT METHOD ── */}
      <div>
        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">{t('premium_pkg_payment_method')}</p>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map(pm => {
            const isSelected = selectedPayment === pm.id;
            return (
              <div key={pm.id} onClick={() => setSelectedPayment(pm.id)}
                className={`relative p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all cursor-pointer ${isSelected ? 'border-2 border-[#7c6aff] bg-[#7c6aff]/8' : 'border-2 border-[var(--border-color)] bg-[var(--bg-input)] hover:border-[#7c6aff]/40'}`}>
                {isSelected && <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#7c6aff] flex items-center justify-center text-white text-[9px] font-black">✓</div>}
                <img
                  src={pm.logo}
                  alt={pm.name}
                  width={40}
                  height={40}
                  className="rounded-xl object-cover"
                  onError={e => {
                    // logo ဖိုင်မရှိရင် placeholder ပြ
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <p className="text-xs font-black text-text-primary">{pm.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-muted font-mono">{pm.number}</span>
                  <button onClick={e => { e.stopPropagation(); handleCopy(pm.number, pm.id); }}
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border transition-colors ${copied === pm.id ? 'border-emerald-500/40 text-emerald-400' : 'border-[var(--border-color)] text-text-muted hover:text-text-primary'}`}>
                    {copied === pm.id ? t('premium_pkg_copied') : t('premium_pkg_copy_btn')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex justify-between items-center">
          <p className="text-[10px] text-text-muted">{payment.name} · <span className="font-mono text-text-secondary">{payment.number}</span></p>
          <p className="text-xs font-bold text-[#a78bfa]">
            {PLANS.find(p => p.id === selectedPlan)!.price.toLocaleString()} {t('premium_pkg_currency')}
          </p>
        </div>
      </div>

      {/* ── TRANSACTION ID ── */}
      <div>
        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">
          {t('premium_pkg_txn_label')} <span className="text-red-400 normal-case">{t('premium_pkg_txn_required')}</span>
        </p>
        <input value={transactionId} onChange={e => setTransactionId(e.target.value)}
          placeholder={t('premium_pkg_txn_placeholder')}
          className={`w-full bg-[var(--bg-input)] border rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none transition-colors ${transactionId.trim() ? 'border-[#7c6aff]/40' : 'border-[var(--border-color)]'} focus:border-[#7c6aff]/60`} />
      </div>

      {/* ── SCREENSHOT ── */}
      <div>
        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">
          {t('premium_pkg_screenshot_label')} <span className="text-red-400 normal-case">{t('premium_pkg_txn_required')}</span>
        </p>
        {screenshotUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-[#7c6aff]/30">
            <img src={screenshotUrl} className="w-full max-h-40 object-contain bg-[var(--bg-input)]" />
            <button onClick={() => { setScreenshotUrl(null); setScreenshotFile(null); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-black/90 transition-colors">✕</button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-input)] cursor-pointer hover:border-[#7c6aff]/40 transition-colors">
            <span className="text-sm">📤</span>
            <span className="text-xs font-bold text-text-muted">{t('premium_pkg_screenshot_upload')}</span>
            <input type="file" accept="image/*" onChange={handleScreenshot} className="hidden" />
          </label>
        )}
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/20">
          <span className="text-xs">❌</span>
          <span className="text-[11px] font-bold text-red-400">{error}</span>
        </div>
      )}

      {/* ── VALIDATION HINT ── */}
      {!canSubmit && (transactionId.trim() || screenshotUrl) && !error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <span className="text-xs">⚠️</span>
          <span className="text-[11px] font-bold text-amber-400">
            {!transactionId.trim() ? t('premium_pkg_validation_txn') : t('premium_pkg_validation_screenshot')}
          </span>
        </div>
      )}

      {/* ── SUBMIT ── */}
      <button onClick={handleSubmit} disabled={submitting || !canSubmit}
        className={`w-full h-11 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${canSubmit ? 'bg-gradient-to-r from-[#7c6aff] to-[#a78bfa] text-white shadow-lg shadow-[#7c6aff]/25 hover:shadow-[#7c6aff]/40 hover:scale-[1.01]' : 'bg-[var(--bg-input)] text-text-muted cursor-not-allowed'}`}>
        {submitting ? (
          <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />{t('premium_pkg_submitting')}</>
        ) : (
          <>{t('premium_pkg_submit_btn')}</>
        )}
      </button>
      <p className="text-center text-[9px] text-text-muted">{t('premium_pkg_footer')}</p>

    </div>
  );
};