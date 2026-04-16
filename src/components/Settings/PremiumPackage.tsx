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

const FREE_ACCESS = [false, false, false, false, false, false, true, true, true];
const PREMIUM_ACCESS = [true, true, true, true, true, true, true, true, true];

const PLANS = [
  { id: 'days_30', days: 30, price: 8000, discount: null, badge: null },
  { id: 'days_90', days: 90, price: 20000, discount: 17, badge: 'popular' },
  { id: 'days_180', days: 180, price: 36000, discount: 25, badge: 'best_value' },
  { id: 'days_365', days: 365, price: 60000, discount: 39, badge: null },
] as const;

const PAYMENT_METHODS = [
  { id: 'kbz', name: 'KBZPay', number: '09773123404', logo: '/kbz-192x192.png' },
  { id: 'wave', name: 'Wave Money', number: '09977313677', logo: '/wave-192x192.png' },
];

export const PremiumPackage: React.FC<PremiumPackageProps> = ({ userEmail, session }) => {
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState('days_30');
  const [selectedPayment, setSelectedPayment] = useState('kbz');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payment = PAYMENT_METHODS.find(p => p.id === selectedPayment)!;
  const planDetails = PLANS.find(p => p.id === selectedPlan)!;
  const canShowInputs = !!selectedPlan && !!selectedPayment;
  const canSubmit = canShowInputs && transactionId.trim().length > 0 && screenshotFile !== null;

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
      const fileExt = screenshotFile.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(filePath, screenshotFile, { upsert: false });

      if (uploadError) throw new Error('Screenshot upload failed: ' + uploadError.message);

      const { error: insertError } = await supabase
        .from('payment_requests')
        .insert({
          user_id: userId,
          user_email: email,
          plan: selectedPlan,
          payment_method: payment.name,
          transaction_id: transactionId.trim(),
          screenshot_url: filePath,
          status: 'pending',
        });

      if (insertError) throw new Error('Failed to save request: ' + insertError.message);

      setSubmitted(true);
      toast.success('Payment request submitted successfully!');
    } catch (err: any) {
      setError(err.message || 'Submission failed');
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-3xl">✅</div>
        <div>
          <p className="font-black text-title text-text-primary mb-1">{t('premium_pkg_success_title')}</p>
          <p className="text-sub text-text-muted leading-relaxed">{t('premium_pkg_success_desc')}</p>
        </div>
        <div className="flex gap-2 justify-center">
          <button onClick={() => window.location.href = '/'} className="px-5 py-2 rounded-full bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sub font-bold hover:bg-[#7c6aff]/10 transition-all">Back to Home</button>
          <button onClick={() => { setSubmitted(false); setTransactionId(''); setScreenshotUrl(null); setScreenshotFile(null); }} className="px-5 py-2 rounded-full bg-[#7c6aff]/10 border border-[#7c6aff]/30 text-[#a78bfa] text-sub font-bold hover:bg-[#7c6aff]/20 transition-all">View Payment Status</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* COMPARISON TABLE */}
      <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-input)] shadow-sm">
        <div className="grid" style={{ gridTemplateColumns: '1fr 64px 72px' }}>
          <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
            <p className="text-tiny font-black text-text-muted uppercase tracking-widest">{t('premium_pkg_features_header')}</p>
          </div>
          <div className="flex items-center justify-center p-3 border-b border-l border-[var(--border-color)] bg-[var(--bg-card)]">
            <span className="text-tiny font-black text-text-muted uppercase tracking-wider">{t('premium_pkg_free_col')}</span>
          </div>
          <div className="flex items-center justify-center p-3 border-b border-l border-[#7c6aff]/30 bg-[#7c6aff]/8">
            <span className="text-tiny font-black text-[#a78bfa] uppercase tracking-wider">{t('premium_pkg_pro_col')}</span>
          </div>
        </div>
        {FEATURE_KEYS.map((f, i) => {
          const isPremiumOnly = PREMIUM_ACCESS[i] && !FREE_ACCESS[i];
          const isLast = i === FEATURE_KEYS.length - 1;
          return (
            <div key={i} className="grid" style={{ gridTemplateColumns: '1fr 64px 72px' }}>
              <div className={`flex items-center gap-2 px-3 py-2.5 ${!isLast ? 'border-b border-[var(--border-color)]' : ''}`}>
                <span className="text-sub">{f.icon}</span>
                <span className={`text-caption font-bold ${isPremiumOnly ? 'text-text-primary' : 'text-text-muted'}`}>{t(f.key)}</span>
              </div>
              <div className={`flex items-center justify-center border-l border-[var(--border-color)] bg-[var(--bg-card)] ${!isLast ? 'border-b border-[var(--border-color)]' : ''}`}>
                {FREE_ACCESS[i] ? <span className="text-emerald-400 text-body">✓</span> : <span className="text-text-muted/30 text-sub">—</span>}
              </div>
              <div className={`flex items-center justify-center border-l border-[#7c6aff]/20 ${isPremiumOnly ? 'bg-[#7c6aff]/5' : 'bg-[var(--bg-card)]'} ${!isLast ? 'border-b border-[var(--border-color)]' : ''}`}>
                {PREMIUM_ACCESS[i] ? <span className={`text-body ${isPremiumOnly ? 'text-[#a78bfa]' : 'text-emerald-400'}`}>✓</span> : <span className="text-text-muted/30 text-sub">—</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* PLANS SELECTION */}
      <div>
        <p className="text-sub font-black text-text-primary mb-3">{t('premium_pkg_choose_plan')}</p>
        <div className="grid grid-cols-2 gap-3">
          {PLANS.map(p => {
            const isSelected = selectedPlan === p.id;
            const badgeLabel = p.badge === 'popular' ? t('premium_pkg_badge_popular') : p.badge === 'best_value' ? t('premium_pkg_badge_best') : null;
            return (
              <button key={p.id} onClick={() => setSelectedPlan(p.id)} className={`relative p-3 rounded-2xl text-left transition-all ${isSelected ? 'border-2 border-[#7c6aff] bg-[#7c6aff]/8 ring-2 ring-[#7c6aff]/20' : 'border-2 border-[var(--border-color)] bg-[var(--bg-input)] hover:border-[#7c6aff]/40'}`}>
                {badgeLabel && <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-black px-2 py-0.5 rounded-full text-white tracking-tighter uppercase ${p.badge === 'best_value' ? 'bg-[#7c6aff]' : 'bg-emerald-500'}`}>{badgeLabel}</span>}
                {p.discount && <span className="absolute top-2 right-2 text-tiny font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">-{p.discount}%</span>}
                <p className={`text-title font-black leading-none mb-1 ${isSelected ? 'text-[#a78bfa]' : 'text-text-primary'}`}>{p.days} {t('premium_pkg_days')}</p>
                <p className="text-caption font-bold text-text-muted">{p.price.toLocaleString()} {t('premium_pkg_currency')}</p>
                <p className="text-[10px] text-text-muted/60 mt-1">≈ {Math.round(p.price / p.days).toLocaleString()} / {t('premium_pkg_day_short')}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* PAYMENT METHODS */}
      <div>
        <p className="text-tiny font-black text-text-muted uppercase tracking-widest mb-3">{t('premium_pkg_payment_method')}</p>
        <div className="grid grid-cols-2 gap-3">
          {PAYMENT_METHODS.map(pm => {
            const isSelected = selectedPayment === pm.id;
            return (
              <div key={pm.id} onClick={() => setSelectedPayment(pm.id)} className={`relative p-3 rounded-2xl flex flex-col items-center gap-2 transition-all cursor-pointer ${isSelected ? 'border-2 border-[#7c6aff] bg-[#7c6aff]/8' : 'border-2 border-[var(--border-color)] bg-[var(--bg-input)]'}`}>
                <img src={pm.logo} alt={pm.name} className="w-10 h-10 rounded-xl shadow-sm" onError={e => (e.currentTarget.style.display = 'none')} />
                <p className="text-caption font-black text-text-primary">{pm.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-muted font-mono">{pm.number}</span>
                  <button onClick={e => { e.stopPropagation(); handleCopy(pm.number, pm.id); }} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border transition-all ${copied === pm.id ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'border-[var(--border-color)] text-text-muted'}`}>
                    {copied === pm.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* INPUTS AND SUBMIT */}
      <div className="space-y-5 pt-4 border-t border-[var(--border-color)]">
        {!canShowInputs ? (
          <div className="text-center text-text-muted text-sub py-8 rounded-2xl border-2 border-dashed border-[var(--border-color)]">
            Please select a plan and payment method.
          </div>
        ) : (
          <>
            <div className="bg-[#7c6aff]/5 rounded-xl p-3 flex justify-between items-center border border-[#7c6aff]/20">
              <span className="text-tiny font-bold text-text-muted">Total Amount:</span>
              <span className="text-sub font-black text-[#a78bfa]">{planDetails.price.toLocaleString()} {t('premium_pkg_currency')}</span>
            </div>

            <div>
              <p className="text-tiny font-black text-text-muted uppercase tracking-widest mb-2">{t('premium_pkg_txn_label')} <span className="text-red-400 normal-case">*</span></p>
              <input value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder={t('premium_pkg_txn_placeholder')} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sub outline-none focus:border-[#7c6aff]/60 transition-all" disabled={submitting} />
            </div>

            <div>
              <p className="text-tiny font-black text-text-muted uppercase tracking-widest mb-2">{t('premium_pkg_screenshot_label')} <span className="text-red-400 normal-case">*</span></p>
              {screenshotUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-[#7c6aff]/30 shadow-inner">
                  <img src={screenshotUrl} className="w-full max-h-56 object-contain bg-black/20" alt="Payment Proof" />
                  <button onClick={() => { setScreenshotUrl(null); setScreenshotFile(null); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center">✕</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-8 rounded-2xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-input)] cursor-pointer hover:border-[#7c6aff]/40 transition-all">
                  <span className="text-3xl">📤</span>
                  <span className="text-sub font-bold text-text-muted">{t('premium_pkg_screenshot_upload')}</span>
                  <input type="file" accept="image/*" onChange={handleScreenshot} className="hidden" disabled={submitting} />
                </label>
              )}
            </div>

            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-caption font-bold">❌ {error}</div>}

            <button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full h-12 rounded-2xl bg-[#7c6aff] text-white text-sub font-black hover:bg-[#8b7aff] transition-all shadow-lg shadow-[#7c6aff]/25 disabled:opacity-50 active:scale-[0.98]">
              {submitting ? t('saving') : t('premium_pkg_submit_btn')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};