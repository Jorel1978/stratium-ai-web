// src/hooks/useTranslation.js
import { useState, useEffect, useContext, createContext } from 'react';
import es from '../locales/es';
import en from '../locales/en';

// Crear contexto
const LanguageContext = createContext();

// Provider para envolver la app
export const LanguageProvider = ({ children }) => {
  const [idioma, setIdioma] = useState(() => {
    const saved = localStorage.getItem('stratium_idioma');
    if (saved === 'en') return 'en';
    if (saved === 'es') return 'es';
    // Detectar idioma del navegador
    const browserLang = navigator.language?.toLowerCase() || '';
    return browserLang.startsWith('en') ? 'en' : 'es';
  });

  useEffect(() => {
    localStorage.setItem('stratium_idioma', idioma);
  }, [idioma]);

  const t = (key, params = {}) => {
    const dict = idioma === 'es' ? es : en;
    const keys = key.split('.');
    let text = dict;
    for (const k of keys) {
      if (text === undefined) break;
      text = text?.[k];
    }
    if (text === undefined || text === null) return key;
    if (typeof text !== 'string') return key;
    
    let result = text;
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(new RegExp(`{{${k}}}`, 'g'), v);
    });
    return result;
  };

  const cambiarIdioma = (lang) => {
    if (lang === 'es' || lang === 'en') setIdioma(lang);
  };

  return (
    <LanguageContext.Provider value={{ idioma, t, cambiarIdioma }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook para usar en componentes
export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return context;
};

