
// components/LanguageSelectorModal.tsx
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface LanguageSelectorModalProps {
  onSelectLanguage: (lang: 'en' | 'hi' | 'bn') => void;
}

const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({ onSelectLanguage }) => {
  const { t } = useLanguage(); // Access t directly

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] p-8 rounded-xl shadow-2xl text-center border border-gray-700 animate-fadeInSlideUp">
        <h2 className="text-2xl font-bold text-gray-100 mb-6">{t('selectLanguagePrompt')}</h2>
        <div className="flex flex-col gap-4">
          <button
            onClick={() => onSelectLanguage('en')}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#FFCC00] transition-all duration-200 ease-in-out button-glow-on-focus"
          >
            {t('english')}
          </button>
          <button
            onClick={() => onSelectLanguage('hi')}
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-[#FFCC00] transition-all duration-200 ease-in-out button-glow-on-focus"
          >
            {t('hindi')}
          </button>
          <button
            onClick={() => onSelectLanguage('bn')}
            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-[#FFCC00] transition-all duration-200 ease-in-out button-glow-on-focus"
          >
            {t('bengali')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectorModal;