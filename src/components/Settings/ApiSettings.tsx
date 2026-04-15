import React, { useState } from 'react';
import { Copy, Check, Eye, EyeOff, Zap, BookOpen, Crown } from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';

interface ApiSettingsProps {
  geminiKey: string;
  setGeminiKey: (val: string) => void;
  notionKey: string;
  setNotionKey: (val: string) => void;
  notionDbId: string;
  setNotionDbId: (val: string) => void;
  showGemini: boolean;
  setShowGemini: (val: boolean) => void;
  showNotion: boolean;
  setShowNotion: (val: boolean) => void;
  showNotionDb: boolean;
  setShowNotionDb: (val: boolean) => void;
  copiedField: string | null;
  handleCopy: (text: string, field: string) => void;
  saveSettings: () => void;
  storageMode: 'app' | 'notion';
  setStorageMode: (val: 'app' | 'notion') => void;
  canUseNotion?: boolean;
  onOpenPremium?: () => void;
}

export const ApiSettings: React.FC<ApiSettingsProps> = ({
  geminiKey, setGeminiKey,
  notionKey, setNotionKey,
  notionDbId, setNotionDbId,
  showGemini, setShowGemini,
  showNotion, setShowNotion,
  showNotionDb, setShowNotionDb,
  copiedField, handleCopy,
  saveSettings,
  storageMode, setStorageMode,
  canUseNotion = false,
  onOpenPremium,
}) => {
  const { t } = useLanguage();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 pb-4">

      {/* Storage Mode */}
      <div className="space-y-3">
        <p className="text-caption font-black text-text-muted uppercase tracking-widest">{t('api_storage_mode_label')}</p>

        <div className="grid grid-cols-2 gap-3">
          {/* App Only */}
          <button onClick={() => setStorageMode('app')}
            className={`flex flex-col items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left ${storageMode === 'app'
              ? 'bg-[var(--bg-input)] border-[#7c6aff]'
              : 'bg-[var(--bg-input)] border-[var(--border-color)] hover:border-[#7c6aff]/40'
              }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${storageMode === 'app' ? 'bg-[#7c6aff] text-white' : 'bg-[var(--bg-card)] text-text-muted'
              }`}>
              <Zap size={18} />
            </div>
            <div>
              <p className={`text-body font-black ${storageMode === 'app' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                {t('api_app_only_title')}
              </p>
              <p className="text-caption text-text-muted mt-0.5 leading-relaxed">
                {t('api_app_desc')}
              </p>
            </div>
            {storageMode === 'app' && (
              <span className="text-tiny bg-[#7c6aff] text-white font-bold px-2 py-0.5 rounded-full">{t('api_selected')}</span>
            )}
          </button>

          {/* Notion Sync */}
          <button
            onClick={() => !canUseNotion ? onOpenPremium?.() : setStorageMode('notion')}
            className={`flex flex-col items-start gap-3 p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${!canUseNotion
              ? 'bg-[var(--bg-input)] border-[var(--border-color)] hover:border-amber-500/30'
              : storageMode === 'notion'
                ? 'bg-[var(--bg-input)] border-[#7c6aff]'
                : 'bg-[var(--bg-input)] border-[var(--border-color)] hover:border-[#7c6aff]/40'
              }`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${storageMode === 'notion' && canUseNotion ? 'bg-[#7c6aff] text-white' : 'bg-[var(--bg-card)] text-text-muted'
              }`}>
              <BookOpen size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className={`text-body font-black ${storageMode === 'notion' && canUseNotion ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                  {t('api_notion_sync_title')}
                </p>
                {!canUseNotion && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                    <Crown size={8} className="text-amber-500" />
                    <span className="text-tiny font-black text-amber-500 uppercase tracking-wide">Pro</span>
                  </span>
                )}
              </div>
              <p className="text-caption text-text-muted mt-0.5 leading-relaxed">
                {t('api_notion_sync_desc')}
              </p>
            </div>
            {storageMode === 'notion' && canUseNotion && (
              <span className="text-tiny bg-[#7c6aff] text-white font-bold px-2 py-0.5 rounded-full">{t('api_selected')}</span>
            )}
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border-color)]" />

      {/* API Keys */}
      <div className="space-y-4">
        <p className="text-caption font-black text-text-muted uppercase tracking-widest">{t('api_keys_label')}</p>

        {/* Gemini */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-body font-bold text-[var(--text-primary)]">{t('api_gemini_label')}</label>
            <span className="text-tiny bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30 px-2 py-0.5 rounded-full font-bold">{t('api_required_badge')}</span>
          </div>
          <div className="relative">
            <input type={showGemini ? 'text' : 'password'} value={geminiKey}
              onChange={e => setGeminiKey(e.target.value)} placeholder="AIza..."
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 pr-20 text-body font-mono text-[var(--text-primary)] outline-none focus:border-[#7c6aff]/60 transition-all" />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button onClick={() => handleCopy(geminiKey, 'gemini')} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted transition-all">
                {copiedField === 'gemini' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
              <button onClick={() => setShowGemini(!showGemini)} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted transition-all">
                {showGemini ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Notion Keys — only in notion mode */}
        {storageMode === 'notion' && (
          <div className="space-y-4 bg-[#7c6aff]/5 border border-[#7c6aff]/20 rounded-2xl p-4">
            <p className="text-tiny font-black text-[#a78bfa] uppercase tracking-widest">{t('api_notion_credentials')}</p>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="text-body font-bold text-[var(--text-primary)]">{t('api_notion_key_label')}</label>
                <span className="text-tiny bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30 px-2 py-0.5 rounded-full font-bold">{t('api_required_badge')}</span>
              </div>
              <div className="relative">
                <input type={showNotion ? 'text' : 'password'} value={notionKey}
                  onChange={e => setNotionKey(e.target.value)} placeholder="ntn_..."
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 pr-20 text-body font-mono text-[var(--text-primary)] outline-none focus:border-[#7c6aff]/60 transition-all" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button onClick={() => handleCopy(notionKey, 'notion')} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted transition-all">
                    {copiedField === 'notion' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  <button onClick={() => setShowNotion(!showNotion)} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted transition-all">
                    {showNotion ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="text-body font-bold text-[var(--text-primary)]">{t('api_database_id_label')}</label>
                <span className="text-tiny bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30 px-2 py-0.5 rounded-full font-bold">{t('api_required_badge')}</span>
              </div>
              <div className="relative">
                <input type={showNotionDb ? 'text' : 'password'} value={notionDbId}
                  onChange={e => setNotionDbId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 pr-20 text-body font-mono text-[var(--text-primary)] outline-none focus:border-[#7c6aff]/60 transition-all" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button onClick={() => handleCopy(notionDbId, 'notionDb')} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted transition-all">
                    {copiedField === 'notionDb' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  <button onClick={() => setShowNotionDb(!showNotionDb)} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted transition-all">
                    {showNotionDb ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <button onClick={handleSave}
        className={`w-full h-12 rounded-xl text-white text-body font-bold transition-all shadow-lg ${saved
          ? 'bg-[#34d399] shadow-[#34d399]/20'
          : 'bg-[#7c6aff] hover:bg-[#a78bfa] shadow-[#7c6aff]/20'
          }`}>
        {saved ? `✓ ${t('saved')}` : t('btn_save_settings')}
      </button>
    </div>
  );
};