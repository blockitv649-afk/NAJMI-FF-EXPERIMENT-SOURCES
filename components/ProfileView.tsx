
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { User } from '../types';

interface ProfileViewProps {
  currentUser: User | null;
  onLogout: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onLogout }) => {
  const { t } = useLanguage();

  return (
    <div className="w-full max-w-2xl p-8 rounded-xl shadow-lg border border-gray-700 text-center min-h-[300px] flex flex-col items-center justify-center animate-subtlePulse
                    bg-gradient-to-br from-gray-900 via-blue-950 to-purple-950"> {/* Custom gradient for profile */}
      
      {/* High-end profile header with soft neon title */}
      <h2 className="text-4xl font-bold mb-8 animate-neon-glow-title text-center leading-tight">
        {t('yourProfile')}
      </h2>

      {currentUser ? (
        <div className="glassmorphism-bg p-8 rounded-xl shadow-2xl border border-gray-700 text-left w-full max-w-md mx-auto mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-xl font-semibold text-gray-100 mb-4">{t('yourAccount')}</h3>
          <div className="space-y-3">
            <p className="text-gray-200 flex items-center">
              <svg className="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              <span className="font-medium text-yellow-400">{t('fullNameLabel')}</span>: {currentUser.fullName}
            </p>
            <p className="text-gray-200 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26c.47.31 1.13.31 1.6 0L21 8m-17 9.5a2 2 0 01-2-2v-7a2 2 0 012-2h18a2 2 0 012 2v7a2 2 0 01-2 2H3z"></path>
              </svg>
              <span className="font-medium text-blue-400">{t('emailLabel')}</span>: {currentUser.email}
            </p>
          </div>
          
          {/* Premium glowing Logout button */}
          <button
            onClick={onLogout}
            className="mt-8 w-full relative px-8 py-4 bg-red-600 text-white font-semibold rounded-lg shadow-md overflow-hidden transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed
                       before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-br before:from-red-700 before:via-pink-600 before:to-red-800 before:opacity-0 before:hover:opacity-100 before:transition-opacity before:duration-300 before:ease-in-out
                       after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:w-0 after:h-0 after:bg-white after:rounded-full after:opacity-0 after:transform after:-translate-x-1/2 after:-translate-y-1/2 after:scale-0 after:duration-500 after:ease-out button-glow-on-focus"
            style={{ zIndex: 1 }}
          >
            <span className="relative z-10 flex items-center justify-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
              {t('logout')}
            </span>
          </button>
        </div>
      ) : (
        <p className="text-gray-400 text-lg mt-8">{t('authRequiredNote')}</p>
      )}
    </div>
  );
};

export default ProfileView;