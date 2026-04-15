import React, { createContext, useContext, useState, useCallback } from 'react';
import { strings, type Lang, type StringKey } from './strings';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('app_lang') as Lang) || 'en';
  });

  const setLang = useCallback((newLang: Lang) => {
    localStorage.setItem('app_lang', newLang);
    setLangState(newLang);
  }, []);

  const t = useCallback((key: StringKey, vars?: Record<string, string | number>): string => {
    const langStrings = strings[lang as keyof typeof strings] as Record<string, string>;
    const enStrings = strings['en'] as Record<string, string>;
    let str: string = langStrings[key] ?? enStrings[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return str;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Used by non-React contexts (hooks, utils) to get current lang + translate
export const getLang = (): Lang => (localStorage.getItem('app_lang') as Lang) || 'en';

export const ts = (key: StringKey, vars?: Record<string, string | number>): string => {
  const lang = getLang();
  const langStrings = strings[lang] as Record<string, string>;
  const enStrings = strings['en'] as Record<string, string>;
  let str: string = langStrings[key] ?? enStrings[key] ?? key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return str;
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};