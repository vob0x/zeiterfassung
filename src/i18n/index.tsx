import { de } from './de';
import { fr } from './fr';
import { useCallback, ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { Language } from '@/types';
import { useUiStore } from '@/stores/uiStore';

type NestedTranslations = Record<string, any>;

// Type-safe translation getter
function getTranslation(
  translations: NestedTranslations,
  keys: string[]
): string {
  let current: any = translations;
  for (const key of keys) {
    current = current?.[key];
    if (current === undefined || current === null) return keys.join('.');
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

const allTranslations: Record<Language, NestedTranslations> = {
  de,
  fr,
};

export function I18nProvider({ children }: { children: ReactNode }) {
  // Single source of truth: uiStore manages language state
  const language = useUiStore((s) => s.language);
  const setLanguageInStore = useUiStore((s) => s.setLanguage);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split('.');
      return getTranslation(allTranslations[language] || allTranslations.de, keys);
    },
    [language]
  );

  const tArray = useCallback(
    (key: string): string[] => {
      const keys = key.split('.');
      let current: any = allTranslations[language] || allTranslations.de;
      for (const k of keys) {
        current = current?.[k];
        if (!current) return [];
      }
      return Array.isArray(current) ? current : [];
    },
    [language]
  );

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage: setLanguageInStore,
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
