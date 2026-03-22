import { de } from './de';
import { fr } from './fr';
import { useState, useCallback, ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { Language } from '@/types';

type NestedTranslations = Record<string, any>;

// Type-safe translation getter
function getTranslation(
  translations: NestedTranslations,
  keys: string[]
): string {
  let current = translations;
  for (const key of keys) {
    current = current[key];
    if (!current) return keys.join('.');
  }
  return typeof current === 'string' ? current : keys.join('.');
}

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  tArray: (key: string) => string[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const translations: Record<Language, NestedTranslations> = {
  de,
  fr,
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'de';
  });

  const t = useCallback(
    (key: string): string => {
      const keys = key.split('.');
      const translation = getTranslation(translations[language], keys);
      return translation;
    },
    [language]
  );

  const tArray = useCallback(
    (key: string): string[] => {
      const keys = key.split('.');
      const current = getTranslation(translations[language], keys);
      return Array.isArray(current) ? current : [];
    },
    [language]
  );

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  }, []);

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        t,
        tArray,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

// Re-export translations for direct access if needed
export { de, fr };
export type { Language };
