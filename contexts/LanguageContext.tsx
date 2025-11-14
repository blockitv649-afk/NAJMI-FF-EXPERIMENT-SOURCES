
// contexts/LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, TranslationKeys } from '../utils/translations';

type Language = 'en' | 'hi' | 'bn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKeys, replacements?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to load language from localStorage, default to 'en'
    return (localStorage.getItem('appLanguage') as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
    // Update document title based on language
    document.title = translations.appName[language];
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: TranslationKeys, replacements?: Record<string, string>): string => {
    const translation = translations[key];
    let translatedString = String(key); // Default to key if no translation found

    if (translation) {
      if (translation[language]) {
        translatedString = translation[language];
      } else if (translation['en']) { // Fallback to English if current language translation is missing
        translatedString = translation['en'];
      }
    } else {
        console.warn(`Translation key "${key}" not found.`);
    }

    // Apply replacements if provided
    if (replacements) {
        for (const [placeholder, value] of Object.entries(replacements)) {
            translatedString = translatedString.replace(`{${placeholder}}`, value);
        }
    }

    return translatedString;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};