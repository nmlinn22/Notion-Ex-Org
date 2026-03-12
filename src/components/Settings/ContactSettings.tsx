import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';

const CONTACTS = [
  {
    label: 'Facebook',
    url: 'https://www.facebook.com/khoon.sitt.shine',   // ← Update this URL
    color: '#1877F2',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    hover: 'hover:bg-blue-500/15',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    label: 'Messenger',
    url: 'https://m.me/khoon.sitt.shine',               // ← Update this URL
    color: '#0099FF',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    hover: 'hover:bg-sky-500/15',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.652V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
      </svg>
    ),
  },
  {
    label: 'Viber',
    url: 'viber://chat?number=+959776977507',  // ← Update this URL
    color: '#7360F2',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    hover: 'hover:bg-violet-500/15',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.294 4.177.693 6.698.623 9.82c-.07 3.12-.154 8.97 5.5 10.564h.005l-.005 2.42s-.038.975.609 1.174c.779.242 1.237-.499 1.983-1.298.409-.441.973-1.089 1.398-1.577 3.851.323 6.812-.414 7.148-.522.778-.252 5.181-.816 5.896-6.657.738-6.01-.357-9.81-2.327-11.527C18.976.573 15.415-.049 11.398.002zm.094 1.567c3.448-.048 6.393.506 8.048 2.022 1.63 1.489 2.573 4.921 1.909 10.17-.588 4.793-4.088 5.109-4.742 5.319-.282.092-2.935.741-6.27.54 0 0-2.488 2.988-3.26 3.763-.122.122-.265.172-.36.149-.133-.033-.169-.186-.167-.41l.021-3.696c-4.718-1.307-4.646-6.218-4.587-8.964.06-2.746.556-4.886 2-6.244 1.95-1.768 5.459-2.6 7.408-2.649zm.18 3.13a.47.47 0 1 0 0 .94 5.27 5.27 0 0 1 5.271 5.271.47.47 0 1 0 .942 0 6.213 6.213 0 0 0-6.213-6.212zm-2.174.957c.19-.01.384.044.546.176.276.22 1.518 1.838 1.633 2.113.115.275.077.55-.08.783-.09.135-.516.618-.516.618-.156.186-.133.376-.04.566l.011.021c.202.394.84 1.287 1.649 2.015.809.729 1.757 1.284 2.205 1.427.054.017.104.024.153.023.12-.003.225-.061.307-.164 0 0 .449-.538.612-.74.174-.215.434-.29.695-.185.356.147 2.072 1.042 2.072 1.042l.132.075c.188.113.31.3.302.527-.029.724-.389 1.507-1.094 1.979-.296.198-.623.295-.95.305-.28.008-.545-.055-.786-.144-1.455-.504-4.512-2.388-5.975-5.03-.622-1.123-.822-2.077-.846-2.784a2.427 2.427 0 0 1 .621-1.72 1.168 1.168 0 0 1 .349-.258 1.152 1.152 0 0 1 .2-.05zm2.169.6a.47.47 0 0 0 0 .942 3.2 3.2 0 0 1 3.197 3.196.47.47 0 0 0 .941 0 4.143 4.143 0 0 0-4.138-4.137zm.013 1.71a.47.47 0 0 0 0 .941c.8 0 1.45.65 1.45 1.45a.47.47 0 0 0 .941 0 2.394 2.394 0 0 0-2.391-2.391z"/>
      </svg>
    ),
  },
];

export const ContactSettings: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-text-muted leading-relaxed px-1">
        {t('contact_desc')}
      </p>

      <div className="space-y-2">
        {CONTACTS.map((c) => (
          <a
            key={c.label}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 p-3.5 rounded-xl border ${c.bg} ${c.border} ${c.hover} transition-all group`}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ color: c.color, backgroundColor: `${c.color}18` }}
            >
              {c.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-text-primary">{c.label}</div>
              <div className="text-[10px] text-text-muted truncate mt-0.5">{c.url}</div>
            </div>
            <ExternalLink size={15} className="text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
};