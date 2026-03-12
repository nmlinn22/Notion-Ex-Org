import React from 'react';
import { motion } from 'motion/react';
import { XCircle } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

interface ApprovalPendingPopupProps { onClose: () => void; }

export const ApprovalPendingPopup: React.FC<ApprovalPendingPopupProps> = ({ onClose }) => {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-6 shadow-xl text-center">
        <button onClick={onClose} className="absolute top-3 right-3 text-text-muted hover:text-text-primary transition-colors"><XCircle size={20} /></button>
        <h3 className="text-xl font-bold text-[#a78bfa] mb-3">{t('approval_title')}</h3>
        <p className="text-text-secondary text-sm leading-relaxed mb-4">{t('approval_desc')} {t('approval_hint1')} {t('approval_hint2')}</p>
        <button onClick={onClose} className="w-full py-2 px-4 rounded-lg bg-[#7c6aff] text-white font-semibold hover:bg-[#a78bfa] transition-colors">
          {t('btn_got_it')}
        </button>
      </motion.div>
    </div>
  );
};