import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';

const TEMPLATE_URL = 'https://branch-elk-7b4.notion.site/aca0b83334ce82b9a53781eda4f42974?v=b660b83334ce836c801288bd201f791c&source=copy_link';

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Step: React.FC<StepProps> = ({ number, title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3.5 bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-lg bg-[#7c6aff]/20 text-[#a78bfa] text-xs font-black flex items-center justify-center shrink-0">
          {number}
        </div>
        <span className="flex-1 text-sm font-bold text-text-primary">{title}</span>
        {open ? <ChevronUp size={15} className="text-text-muted shrink-0" /> : <ChevronDown size={15} className="text-text-muted shrink-0" />}
      </button>
      {open && (
        <div className="p-4 space-y-3 bg-[var(--bg-card)] border-t border-[var(--border-color)]">
          {children}
        </div>
      )}
    </div>
  );
};

const Tip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex gap-2 p-3 bg-[#7c6aff]/8 border border-[#7c6aff]/20 rounded-xl">
    <span className="text-[#a78bfa] text-xs mt-0.5 shrink-0">💡</span>
    <p className="text-xs text-text-muted leading-relaxed">{children}</p>
  </div>
);

const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code className="bg-black/20 text-[#a78bfa] text-[10px] font-mono px-1.5 py-0.5 rounded-md">{children}</code>
);

const Li: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-2">
    <Check size={12} className="text-emerald-400 mt-0.5 shrink-0" />
    <p className="text-xs text-text-muted leading-relaxed">{children}</p>
  </div>
);

export const NotionGuide: React.FC<{ onOpenPremium?: () => void }> = ({ onOpenPremium }) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">

      {/* Premium Banner */}
      <div className="p-4 rounded-2xl bg-[#7c6aff]/8 border border-[#7c6aff]/25 flex gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#7c6aff]/15 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-base">👑</span>
        </div>
        <div className="space-y-1.5 flex-1">
          <p className="text-[12px] font-bold text-[var(--text-primary)]">{t('notion_guide_banner_title')}</p>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            {t('notion_guide_banner_desc')}
          </p>
          <button
            onClick={() => onOpenPremium?.()}
            className="mt-1 px-3 py-1.5 rounded-lg bg-[#7c6aff] text-white text-[11px] font-bold hover:bg-[#8b7aff] transition-all"
          >
            {t('notion_guide_banner_btn')}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex-1 h-px bg-[var(--border-color)]" />
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{t('notion_guide_divider')}</p>
        <div className="flex-1 h-px bg-[var(--border-color)]" />
      </div>

      {/* Template Button */}
      <a
        href={TEMPLATE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 p-5 rounded-2xl bg-[#7c6aff] hover:bg-[#6d5ce6] transition-all group shadow-lg shadow-[#7c6aff]/30"
      >
        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          <span className="text-2xl">📋</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-black text-white">{t('notion_guide_template_title')}</div>
          <div className="text-xs text-white/70 mt-0.5">{t('notion_guide_template_subtitle')}</div>
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <ExternalLink size={18} className="text-white/80" />
          <span className="text-[9px] text-white/60 font-bold uppercase tracking-wide">{t('notion_guide_template_open')}</span>
        </div>
      </a>

      {/* Step by step guide */}
      <p className="text-[11px] font-bold text-text-muted px-1 pt-1">{t('notion_guide_steps_label')}</p>

      <Step number={1} title={t('notion_step1_title')} defaultOpen={true}>
        <Li>
          {t('notion_step1_li1').replace('"Copy Notion Template"', '').trim()}{' '}
          <span className="text-[#a78bfa] font-semibold">"Copy Notion Template"</span>
        </Li>
        <Li>
          {t('notion_step1_li2').split('Duplicate')[0]}
          <span className="font-semibold text-text-primary">Duplicate</span>
          {t('notion_step1_li2').split('Duplicate')[1] ?? ''}
        </Li>
        <Li>{t('notion_step1_li3')}</Li>
        <Tip>{t('notion_step1_tip')}</Tip>
      </Step>

      <Step number={2} title={t('notion_step2_title')}>
        <Li>
          {t('notion_step2_li1').split('notion.so/profile/integrations')[0]}
          <a href="https://www.notion.so/profile/integrations" target="_blank" rel="noopener noreferrer" className="text-[#a78bfa] underline">notion.so/profile/integrations</a>
          {t('notion_step2_li1').split('notion.so/profile/integrations')[1] ?? ''}
        </Li>
        <Li>
          {t('notion_step2_li2').split('New integration')[0]}
          <span className="font-semibold text-text-primary">New integration</span>
          {t('notion_step2_li2').split('New integration')[1] ?? ''}
        </Li>
        <Li>
          {t('notion_step2_li3').split('Ex Tracker')[0]}
          <Code>Ex Tracker</Code>
          {t('notion_step2_li3').split('Ex Tracker')[1] ?? ''}
        </Li>
        <Li>
          {t('notion_step2_li4').split('Save')[0]}
          <span className="font-semibold text-text-primary">Save</span>
          {t('notion_step2_li4').split('Save')[1] ?? ''}
        </Li>
        <Li>
          {t('notion_step2_li5').split('Internal Integration Secret')[0]}
          <span className="font-semibold text-text-primary">Internal Integration Secret</span>
          {t('notion_step2_li5').split('Internal Integration Secret')[1] ?? ''}
        </Li>
        <Tip>
          {t('notion_step2_tip').split('ntn_')[0]}
          <Code>ntn_</Code>
          {t('notion_step2_tip').split('ntn_')[1]?.split('secret_')[0] ?? ''}
          <Code>secret_</Code>
          {t('notion_step2_tip').split('secret_')[1] ?? ''}
        </Tip>
      </Step>

      <Step number={3} title={t('notion_step3_title')}>
        <Li>{t('notion_step3_li1')}</Li>
        <Li>
          {t('notion_step3_li2').split('•••')[0]}
          <span className="font-semibold text-text-primary">•••</span>
          {t('notion_step3_li2').split('•••')[1] ?? ''}
        </Li>
        <Li>
          {t('notion_step3_li3').split('Connections')[0]}
          <span className="font-semibold text-text-primary">Connections</span>
          {' → '}
          <span className="font-semibold text-text-primary">Connect to</span>
          {t('notion_step3_li3').split('Connect to')[1] ?? ''}
        </Li>
        <Tip>{t('notion_step3_tip')}</Tip>
      </Step>

      <Step number={4} title={t('notion_step4_title')}>
        <Li>{t('notion_step4_li1')}</Li>
        <Li>{t('notion_step4_li2')}</Li>
        <div className="bg-black/20 rounded-xl p-3 font-mono text-[10px] leading-relaxed">
          <span className="text-text-muted">notion.so/</span>
          <span className="text-emerald-400 font-bold">xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</span>
          <span className="text-text-muted">?v=...</span>
        </div>
        <Li>
          {t('notion_step4_li3').split('?v=')[0]}
          <Code>?v=</Code>
          {t('notion_step4_li3').split('?v=')[1] ?? ''}
        </Li>
        <Tip>
          {t('notion_step4_tip').split('/')[0]}
          <Code>/</Code>
          {t('notion_step4_tip').split('/').slice(1).join('/')}
        </Tip>
      </Step>

      <Step number={5} title={t('notion_step5_title')}>
        <Li>
          {t('notion_step5_li1').split('API credentials')[0]}
          <span className="font-semibold text-text-primary">API credentials</span>
          {t('notion_step5_li1').split('API credentials')[1] ?? ''}
        </Li>
        <Li>
          {t('notion_step5_li2').split('Notion Integration Token')[0]}
          <span className="font-semibold text-text-primary">Notion Integration Token</span>
          {t('notion_step5_li2').split('Notion Integration Token')[1] ?? ''}
        </Li>
        <Li>
          {t('notion_step5_li3').split('Notion Database ID')[0]}
          <span className="font-semibold text-text-primary">Notion Database ID</span>
          {t('notion_step5_li3').split('Notion Database ID')[1] ?? ''}
        </Li>
        <Li>
          {t('notion_step5_li4').split('Save')[0]}
          <span className="font-semibold text-text-primary">Save</span>
          {t('notion_step5_li4').split('Save')[1] ?? ''}
        </Li>
        <Tip>{t('notion_step5_tip')}</Tip>
      </Step>

    </div>
  );
};