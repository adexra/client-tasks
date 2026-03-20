import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../lib/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('app_language');
    // Default to PT-BR if Brazilian Portuguese was requested as main, 
    // but the user now wants the OPTION to switch.
    return saved || 'pt'; 
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const t = (path) => {
    if (!path) return '';
    const keys = path.split('.');
    
    // 1. Try current language
    let result = translations[language];
    let found = true;
    
    if (result) {
      for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
          result = result[key];
        } else {
          found = false;
          break;
        }
      }
    } else {
      found = false;
    }

    if (found && typeof result === 'string') return result;

    // 2. Fallback to English
    let fallback = translations['en'];
    if (fallback) {
      for (const key of keys) {
        if (fallback && typeof fallback === 'object' && key in fallback) {
          fallback = fallback[key];
        } else {
          fallback = null;
          break;
        }
      }
    }

    if (fallback && typeof fallback === 'string') return fallback;
    
    // 3. Last resort: return the path itself
    return path;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
