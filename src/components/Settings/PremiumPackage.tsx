import React, { useState } from 'react';
import { useLanguage } from '../../lib/LanguageContext';

interface PremiumPackageProps {
  userEmail?: string;
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
  { id: 'monthly', labelKey: 'premium_pkg_monthly_label', priceKey: 'premium_pkg_monthly_price', unitKey: 'premium_pkg_monthly_unit', badgeKey: null },
  { id: 'yearly',  labelKey: 'premium_pkg_yearly_label',  priceKey: 'premium_pkg_yearly_price',  unitKey: 'premium_pkg_yearly_unit',  badgeKey: 'premium_pkg_yearly_badge' },
] as const;

const PAYMENT_METHODS = [
  { id: 'kbz',  name: 'KBZPay',     number: '09123123123' },
  { id: 'wave', name: 'Wave Money', number: '09123123123' },
];

// Inline SVG logos
const KBZLogo = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect width="28" height="28" rx="7" fill="#1a56db"/>
    <text x="14" y="19" textAnchor="middle" fill="white" fontSize="9" fontWeight="900" fontFamily="system-ui">KBZ</text>
  </svg>
);
const WaveLogo = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect width="28" height="28" rx="7" fill="#f59e0b"/>
    <path d="M4 16 Q8 9 12 16 Q16 23 20 16 Q24 9 28 16" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
  </svg>
);

const LOGOS: Record<string, React.FC> = { kbz: KBZLogo, wave: WaveLogo };

export const PremiumPackage: React.FC<PremiumPackageProps> = ({ userEmail }) => {
  const { t } = useLanguage();
  const [selectedPlan,    setSelectedPlan]    = useState('monthly');
  const [selectedPayment, setSelectedPayment] = useState('kbz');
  const [transactionId,   setTransactionId]   = useState('');
  const [screenshotFile,  setScreenshotFile]  = useState<File | null>(null);
  const [screenshotUrl,   setScreenshotUrl]   = useState<string | null>(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [submitted,       setSubmitted]       = useState(false);
  const [copied,          setCopied]          = useState<string | null>(null);

  const payment = PAYMENT_METHODS.find(p => p.id === selectedPayment)!;
  const canSubmit = transactionId.trim().length > 0 && screenshotUrl !== null;

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    setScreenshotUrl(URL.createObjectURL(file));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
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
          onClick={() => { setSubmitted(false); setTransactionId(''); setScreenshotUrl(null); setScreenshotFile(null); }}
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
        {/* Header */}
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

        {/* Rows */}
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
                {FREE_ACCESS[i]
                  ? <span className="text-emerald-400 text-sm">✓</span>
                  : <span className="text-text-muted/30 text-xs">—</span>}
              </div>
              <div className={`flex items-center justify-center border-l border-[#7c6aff]/20 ${isPremiumOnly ? 'bg-[#7c6aff]/5' : 'bg-[var(--bg-card)]'} ${!isLast ? 'border-b border-b-[var(--border-color)]' : ''}`}>
                {PREMIUM_ACCESS[i]
                  ? <span className={`text-sm ${isPremiumOnly ? 'text-[#a78bfa]' : 'text-emerald-400'}`}>✓</span>
                  : <span className="text-text-muted/30 text-xs">—</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── PLANS ── */}
      <div>
        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">{t('premium_pkg_choose_plan')}</p>
        <div className="grid grid-cols-2 gap-2">
          {PLANS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`relative p-3 rounded-xl text-left transition-all ${
                selectedPlan === p.id
                  ? 'border-2 border-[#7c6aff] bg-[#7c6aff]/8'
                  : 'border-2 border-[var(--border-color)] bg-[var(--bg-input)] hover:border-[#7c6aff]/40'
              }`}
            >
              {p.badgeKey && (
                <span className="absolute -top-2 right-2 text-[8px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white">{t(p.badgeKey)}</span>
              )}
              <p className="text-[10px] font-bold text-text-muted mb-1">{t(p.labelKey)}</p>
              <p className={`text-lg font-black leading-none mb-0.5 ${selectedPlan === p.id ? 'text-[#a78bfa]' : 'text-text-primary'}`}>{t(p.priceKey)}</p>
              <p className="text-[9px] text-text-muted">{t(p.unitKey)}</p>
              {selectedPlan === p.id && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#7c6aff] flex items-center justify-center text-white text-[9px] font-black">✓</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── PAYMENT METHOD ── */}
      <div>
        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">{t('premium_pkg_payment_method')}</p>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map(pm => {
            const Logo = LOGOS[pm.id];
            const isSelected = selectedPayment === pm.id;
            return (
              <div
                key={pm.id}
                onClick={() => setSelectedPayment(pm.id)}
                className={`relative p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-2 border-[#7c6aff] bg-[#7c6aff]/8'
                    : 'border-2 border-[var(--border-color)] bg-[var(--bg-input)] hover:border-[#7c6aff]/40'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#7c6aff] flex items-center justify-center text-white text-[9px] font-black">✓</div>
                )}
                <Logo />
                <p className="text-xs font-black text-text-primary">{pm.name}</p>
                {/* Number + Copy inline */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-muted font-mono">{pm.number}</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleCopy(pm.number, pm.id); }}
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border transition-colors ${
                      copied === pm.id
                        ? 'border-emerald-500/40 text-emerald-400'
                        : 'border-[var(--border-color)] text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {copied === pm.id ? t('premium_pkg_copied') : t('premium_pkg_copy_btn')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-2 px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex justify-between items-center">
          <p className="text-[10px] text-text-muted">
            {payment.name} · <span className="font-mono text-text-secondary">{payment.number}</span>
          </p>
          <p className="text-xs font-black text-[#a78bfa]">{t(PLANS.find(p => p.id === selectedPlan)!.priceKey)} MMK</p>
        </div>
      </div>

      {/* ── TRANSACTION ID ── */}
      <div>
        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">
          {t('premium_pkg_txn_label')} <span className="text-red-400 normal-case">{t('premium_pkg_txn_required')}</span>
        </p>
        <input
          value={transactionId}
          onChange={e => setTransactionId(e.target.value)}
          placeholder={t('premium_pkg_txn_placeholder')}
          className={`w-full bg-[var(--bg-input)] border rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none transition-colors ${
            transactionId.trim() ? 'border-[#7c6aff]/40' : 'border-[var(--border-color)]'
          } focus:border-[#7c6aff]/60`}
        />
      </div>

      {/* ── SCREENSHOT ── */}
      <div>
        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">
          {t('premium_pkg_screenshot_label')} <span className="text-red-400 normal-case">{t('premium_pkg_txn_required')}</span>
        </p>
        {screenshotUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-[#7c6aff]/30">
            <img src={screenshotUrl} className="w-full max-h-40 object-contain bg-[var(--bg-input)]" />
            <button
              onClick={() => { setScreenshotUrl(null); setScreenshotFile(null); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-black/90 transition-colors"
            >✕</button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-input)] cursor-pointer hover:border-[#7c6aff]/40 transition-colors">
            <span className="text-sm">📤</span>
            <span className="text-xs font-bold text-text-muted">{t('premium_pkg_screenshot_upload')}</span>
            <input type="file" accept="image/*" onChange={handleScreenshot} className="hidden" />
          </label>
        )}
      </div>

      {/* ── VALIDATION HINT ── */}
      {!canSubmit && (transactionId.trim() || screenshotUrl) && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <span className="text-xs">⚠️</span>
          <span className="text-[11px] font-bold text-amber-400">
            {!transactionId.trim() ? t('premium_pkg_validation_txn') : t('premium_pkg_validation_screenshot')}
          </span>
        </div>
      )}

      {/* ── SUBMIT ── */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !canSubmit}
        className={`w-full h-11 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
          canSubmit
            ? 'bg-gradient-to-r from-[#7c6aff] to-[#a78bfa] text-white shadow-lg shadow-[#7c6aff]/25 hover:shadow-[#7c6aff]/40 hover:scale-[1.01]'
            : 'bg-[var(--bg-input)] text-text-muted cursor-not-allowed'
        }`}
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            {t('premium_pkg_submitting')}
          </>
        ) : (
          <>{t('premium_pkg_submit_btn')}</>
        )}
      </button>
      <p className="text-center text-[9px] text-text-muted">{t('premium_pkg_footer')}</p>

    </div>
  );
};