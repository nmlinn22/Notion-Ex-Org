import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Image as ImageIcon, Camera, X, Sparkles, Loader2, Pause, Square, Play, FileSpreadsheet, Type, ScanLine, Crown } from 'lucide-react';
import { VoiceWave } from './VoiceWave';
import { CSVImport } from './CSVImport';
import { Session } from '@supabase/supabase-js';
import { useLanguage } from '../lib/LanguageContext';

interface InputCardProps {
  input: string;
  setInput: (val: string) => void;
  previewUrl: string | null;
  removeImage: () => void;
  toggleVoice: () => void;
  pauseVoice: () => void;
  stopVoice: () => void;
  isRecording: boolean;
  isPaused: boolean;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  parseInput: () => void;
  isParsing: boolean;
  image: any;
  session: Session;
  userRole: string;
  isAdmin: boolean;
  groups: string[];
  categories: string[];
  onImportComplete: () => void;
  onOpenPremium?: () => void;
}

export const InputCard: React.FC<InputCardProps> = ({
  input, setInput,
  previewUrl, removeImage,
  toggleVoice, pauseVoice, stopVoice,
  isRecording, isPaused,
  handleImageChange, fileInputRef,
  parseInput, isParsing,
  image,
  session, userRole, isAdmin, groups, categories, onImportComplete,
  onOpenPremium,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = React.useState<'text' | 'image' | 'csv'>('text');
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (previewUrl) setActiveTab('image');
  }, [previewUrl]);

  const isPremium = userRole === 'premium' || userRole === 'admin';

  const tabs = [
    { id: 'text' as const,  icon: <Type size={12} />,          label: t('tab_text'),  accent: '#7c6aff',  isPremiumOnly: false },
    { id: 'image' as const, icon: <ScanLine size={12} />,      label: t('tab_scan'),  accent: '#7c6aff',  isPremiumOnly: true  },
    { id: 'csv' as const,   icon: <FileSpreadsheet size={12} />, label: t('tab_file'), accent: '#34d399', isPremiumOnly: true  },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[22px] mb-4"
      style={{ boxShadow: '0 8px 32px rgba(124,106,255,0.08), 0 2px 8px rgba(0,0,0,0.06)' }}
    >
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#7c6aff] via-[#a78bfa] to-[#34d399] opacity-60" />

      {/* Header row — welcome badge + tab switcher flush together */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Welcome badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7c6aff]/10 border border-[#7c6aff]/20 text-[11px] font-bold text-[#a78bfa] tracking-tight">
            <Sparkles size={10} className="opacity-70" />
            {t('input_welcome')}
          </span>

          {/* Recording pill — shows when active */}
          <AnimatePresence>
            {isRecording && !isPaused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 8 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7c6aff]/8 border border-[#7c6aff]/20"
              >
                <span className="text-[10px] font-bold text-[#a78bfa]">{t('input_listening')}</span>
                <VoiceWave />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tab switcher — compact pill style */}
        <div className="flex gap-1 p-[3px] bg-[var(--bg-input)] rounded-[14px]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isPremiumTab = tab.isPremiumOnly && !isPremium;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (isPremiumTab) { setActiveTab(tab.id); return; }
                  setActiveTab(tab.id);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-[7px] rounded-[11px] text-[11px] font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--bg-card)] shadow-sm'
                    : 'hover:bg-[var(--bg-card)]/50'
                }`}
                style={{
                  color: isActive
                    ? tab.accent
                    : 'var(--text-muted)',
                }}
              >
                {tab.icon}
                {tab.label}
                {isPremiumTab && (
                  <Crown size={9} style={{ color: '#f59e0b', marginLeft: '1px', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area — no extra gap, flows directly */}
      <div className="px-4">
        <AnimatePresence mode="wait">

          {/* TEXT TAB */}
          {activeTab === 'text' && (
            <motion.div key="text-tab" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18 }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('input_placeholder')}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-[16px] px-4 py-3.5 text-sm leading-relaxed min-h-[140px] outline-none focus:border-[#7c6aff]/40 transition-all resize-none placeholder:text-text-muted"
                style={{ fontSize: '13.5px' }}
              />
            </motion.div>
          )}

          {/* IMAGE TAB */}
          {activeTab === 'image' && (
            <motion.div key="image-tab" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }} className="w-full">
              {!isPremium ? (
                <div className="w-full rounded-[16px] border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-input)] p-5 flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] flex items-center justify-center">
                    <ImageIcon size={20} className="text-text-secondary" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-text-primary">{t('input_upload_prompt')}</p>
                    <p className="text-[10px] mt-0.5 text-text-muted">{t('input_upload_hint')}</p>
                  </div>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => onOpenPremium?.()}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold text-text-primary hover:border-[#7c6aff]/40 hover:bg-[#7c6aff]/5 hover:text-[#a78bfa] transition-all"
                    >
                      <ImageIcon size={14} /><span>{t('input_gallery_btn')}</span><Crown size={9} style={{ color: '#f59e0b' }} />
                    </button>
                    <button
                      onClick={() => onOpenPremium?.()}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold text-text-primary hover:border-[#34d399]/40 hover:bg-[#34d399]/5 hover:text-[#34d399] transition-all"
                    >
                      <Camera size={14} /><span>{t('input_camera_btn')}</span><Crown size={9} style={{ color: '#f59e0b' }} />
                    </button>
                  </div>
                </div>
              ) : previewUrl ? (
                <div className="relative overflow-hidden rounded-[16px] border border-[var(--border-color)] bg-[var(--bg-input)]">
                  <img src={previewUrl} alt="Receipt preview" className="w-full max-h-[280px] object-contain" />
                  <button
                    onClick={() => { removeImage(); setActiveTab('text'); }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80 transition-all border border-white/10"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="w-full rounded-[16px] border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-input)] p-5 flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] flex items-center justify-center">
                    <ImageIcon size={20} className="text-text-secondary" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-text-primary">{t('input_upload_prompt')}</p>
                    <p className="text-[10px] mt-0.5 text-text-muted">{t('input_upload_hint')}</p>
                  </div>
                  <div className="flex gap-3 w-full">
                    <label className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold text-text-primary hover:border-[#7c6aff]/40 hover:bg-[#7c6aff]/5 hover:text-[#a78bfa] transition-all cursor-pointer">
                      <ImageIcon size={14} />
                      <span>{t('input_gallery_btn')}</span>
                      <input type="file" accept="image/*" onChange={(e) => { handleImageChange(e); }} className="hidden" ref={fileInputRef} />
                    </label>
                    <label className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] bg-[var(--bg-card)] border border-[var(--border-color)] text-xs font-bold text-text-primary hover:border-[#34d399]/40 hover:bg-[#34d399]/5 hover:text-[#34d399] transition-all cursor-pointer">
                      <Camera size={14} />
                      <span>{t('input_camera_btn')}</span>
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => { handleImageChange(e); }} className="hidden" ref={cameraInputRef} />
                    </label>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* CSV TAB */}
          {activeTab === 'csv' && (
            <motion.div key="csv-tab" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
              <CSVImport
                session={session}
                userRole={userRole}
                isAdmin={isAdmin}
                groups={groups}
                categories={categories}
                onImportComplete={onImportComplete}
                onOpenPremium={onOpenPremium}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Bottom action bar */}
      {activeTab !== 'csv' && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-4 mt-2">

          {/* Mic — text tab only */}
          {activeTab === 'text' && (
            !isRecording ? (
              <button
                onClick={() => { toggleVoice(); }}
                className="w-10 h-10 rounded-[12px] border border-[var(--border-color)] bg-[var(--bg-input)] flex items-center justify-center text-text-muted hover:text-[#a78bfa] hover:border-[#7c6aff]/40 hover:bg-[#7c6aff]/5 transition-all"
                title={t('voice_input_title')}
              >
                <Mic size={15} />
              </button>
            ) : (
              <div className="flex gap-1.5">
                {isPaused ? (
                  <button onClick={toggleVoice}
                    className="w-10 h-10 rounded-[12px] border border-[#34d399]/30 bg-[#34d399]/10 text-[#34d399] flex items-center justify-center hover:bg-[#34d399]/20 transition-all"
                    title={t('voice_resume_title')}>
                    <Play size={14} fill="currentColor" />
                  </button>
                ) : (
                  <button onClick={pauseVoice}
                    className="w-10 h-10 rounded-[12px] border border-amber-500/30 bg-amber-500/10 text-amber-500 flex items-center justify-center hover:bg-amber-500/20 transition-all"
                    title={t('voice_pause_title')}>
                    <Pause size={14} fill="currentColor" />
                  </button>
                )}
                <button onClick={stopVoice}
                  className="w-10 h-10 rounded-[12px] border border-red-500/30 bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all"
                  title={t('voice_stop_title')}>
                  <Square size={13} fill="currentColor" />
                </button>
              </div>
            )
          )}

          {/* Gallery + Camera — image tab only */}
          {activeTab === 'image' && (
            <>
              {isPremium ? (
                <>
                  <label
                    className="w-10 h-10 rounded-[12px] border border-[#7c6aff]/30 bg-[var(--bg-input)] flex items-center justify-center text-[#a78bfa] cursor-pointer hover:border-[#7c6aff]/50 hover:bg-[#7c6aff]/5 transition-all"
                    title={t('upload_photo_title')}
                  >
                    <ImageIcon size={15} />
                    <input type="file" accept="image/*" onChange={(e) => { handleImageChange(e); }} className="hidden" ref={fileInputRef} />
                  </label>
                  <label
                    className="w-10 h-10 rounded-[12px] border border-[#34d399]/30 bg-[var(--bg-input)] flex items-center justify-center text-[#34d399] cursor-pointer hover:border-[#34d399]/50 hover:bg-[#34d399]/5 transition-all"
                    title={t('camera_capture_title')}
                  >
                    <Camera size={15} />
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => { handleImageChange(e); }} className="hidden" ref={cameraInputRef} />
                  </label>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onOpenPremium?.()}
                    className="w-10 h-10 rounded-[12px] border border-[#7c6aff]/30 bg-[var(--bg-input)] flex items-center justify-center text-[#a78bfa] hover:border-[#7c6aff]/50 hover:bg-[#7c6aff]/5 transition-all relative"
                  >
                    <ImageIcon size={15} />
                    <Crown size={7} style={{ color: '#f59e0b', position: 'absolute', top: 4, right: 4 }} />
                  </button>
                  <button
                    onClick={() => onOpenPremium?.()}
                    className="w-10 h-10 rounded-[12px] border border-[#34d399]/30 bg-[var(--bg-input)] flex items-center justify-center text-[#34d399] hover:border-[#34d399]/50 hover:bg-[#34d399]/5 transition-all relative"
                  >
                    <Camera size={15} />
                    <Crown size={7} style={{ color: '#f59e0b', position: 'absolute', top: 4, right: 4 }} />
                  </button>
                </>
              )}
            </>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Analyze button */}
          <button
            onClick={() => {
              if (!isParsing && (input || image)) { parseInput(); }
            }}
            disabled={isParsing || (!input && !image)}
            className={`h-10 px-5 rounded-[12px] bg-[#7c6aff] text-white flex items-center gap-2 transition-all hover:bg-[#8b7aff] hover:shadow-[0_6px_20px_rgba(124,106,255,0.35)] hover:-translate-y-[1px] disabled:opacity-35 disabled:translate-y-0 disabled:shadow-none`}
            style={{ boxShadow: '0 4px 14px rgba(124,106,255,0.25)' }}
          >
            {isParsing
              ? <Loader2 size={14} className="animate-spin" />
              : <Sparkles size={14} />
            }
            <span className="text-[11px] font-bold tracking-wide">{t('input_parse_btn')}</span>
          </button>
        </div>
      )}
    </motion.div>
  );
};