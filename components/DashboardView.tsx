
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { User } from '../types'; // Import User type

interface DashboardViewProps {
  currentUser: User | null;
}

const DashboardView: React.FC<DashboardViewProps> = ({ currentUser }) => {
  const { t } = useLanguage();
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setShowWelcomeMessage(true);
      const timer = setTimeout(() => {
        setShowWelcomeMessage(false);
      }, 5000); // Show welcome message for 5 seconds
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  const handleYouTubeClick = () => {
    window.open('https://youtube.com/@najmi_ff_experiment?si=U5ioWz4I1PravD6l', '_blank');
  };

  const handleTelegramChannelClick = () => {
    window.open('https://t.me/najmiffexperiment6', '_blank');
  };

  const handleTelegramSupportClick = () => {
    window.open('https://t.me/najmiffhelping', '_blank');
  };

  return (
    <div className="w-full max-w-2xl bg-gradient-to-br from-blue-900 to-purple-900 p-8 rounded-xl shadow-lg border border-gray-700 text-center flex flex-col items-center justify-center min-h-[300px] animate-subtlePulse">
      {showWelcomeMessage && currentUser && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FFCC00] text-[#0A0A0A] p-4 rounded-lg shadow-xl text-xl font-bold z-50 animate-fadeInSlideUp" style={{ animationDuration: '0.5s' }}>
          {t('welcomeMessage', { userName: currentUser.fullName })}
        </div>
      )}

      <h2 className="text-3xl font-bold text-gray-100 mb-4 animate-text-gradient-pulse">
        {t('welcomeToAppTool')}
      </h2>
      
      <div className="flex flex-col gap-4 w-full max-w-sm mb-8">
        <button
          onClick={handleYouTubeClick}
          className="px-8 py-4 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center text-lg button-glow-on-focus hover:shadow-xl focus:shadow-xl"
          aria-label="Visit YouTube Channel"
        >
          <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.543 6.494c-.195-.776-.757-1.336-1.533-1.533C18.667 4 12 4 12 4s-6.667 0-8.01.961c-.776.196-1.337.757-1.533 1.533C2 7.333 2 12 2 12s0 4.667.961 6.01c.196.776.757 1.337 1.533 1.533C5.333 20 12 20 12 20s6.667 0 8.01-.961c.776-.196 1.337-.757 1.533-1.533C22 16.667 22 12 22 12s0-4.667-.457-5.506zM9.545 15.594V8.406L15.82 12l-6.275 3.594z"/>
          </svg>
          <span>{t('goToYouTube')}</span>
        </button>

        <button
          onClick={handleTelegramChannelClick}
          className="px-8 py-4 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center text-lg button-glow-on-focus hover:shadow-xl focus:shadow-xl"
          aria-label="Go to Telegram Channel"
        >
          <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.275 8.16l-2.618 10.472c-.157.62-.577.784-1.076.502l-3.351-2.479-1.603 1.547c-.179.175-.327.32-.676.32-.471 0-.392-.174-.741-.53l-1.928-1.859-3.385-1.045c-.65-.205-.668-.668.121-.97L17.756 7.6c.584-.236 1.096-.067.819.34z"/>
          </svg>
          <span>{t('goToTelegramChannel')}</span>
        </button>

        <button
          onClick={handleTelegramSupportClick}
          className="px-8 py-4 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center text-lg button-glow-on-focus hover:shadow-xl focus:shadow-xl"
          aria-label="Go to Telegram Support"
        >
          <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.275 8.16l-2.618 10.472c-.157.62-.577.784-1.076.502l-3.351-2.479-1.603 1.547c-.179.175-.327.32-.676.32-.471 0-.392-.174-.741-.53l-1.928-1.859-3.385-1.045c-.65-.205-.668-.668.121-.97L17.756 7.6c.584-.236 1.096-.067.819.34z"/>
          </svg>
          <span>{t('goToTelegramSupport')}</span>
        </button>
      </div>

      <div className="mt-8 p-6 rounded-xl animate-border-glow bg-gray-900 bg-opacity-70">
        <h3 className="text-xl font-bold text-[#FFCC00] mb-4">🔶 {t('importantInformation')} 🔶</h3>
        <div className="text-left text-gray-200 space-y-4 max-w-md">
          <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <h4 className="font-semibold text-lg text-[#FFCC00] mb-1 animate-slide-in" style={{ animationDelay: '0.3s' }}>1. {t('dashboard')}</h4>
            <p className="text-sm">{t('dashboardDescription')}</p>
          </div>
          <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0.9s' }}>
            <h4 className="font-semibold text-lg text-[#FFCC00] mb-1 animate-slide-in" style={{ animationDelay: '0.6s' }}>2. {t('sources')}</h4>
            <p className="text-sm">{t('sourcesDescription')}</p>
          </div>
          <div className="opacity-0 animate-fade-in" style={{ animationDelay: '1.2s' }}>
            <h4 className="font-semibold text-lg text-[#FFCC00] mb-1 animate-slide-in" style={{ animationDelay: '0.9s' }}>3. {t('aiChat')}</h4>
            <p className="text-sm">{t('aiChatDescription')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;