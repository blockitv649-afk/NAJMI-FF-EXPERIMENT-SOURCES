
// components/AdminLoginView.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import FloatingLabelInput from './FloatingLabelInput';

interface AdminLoginViewProps {
  onAdminLoginSuccess: () => void;
  onUserLoginRedirect: () => void;
}

const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onAdminLoginSuccess, onUserLoginRedirect }) => {
  const { adminLogin, isLoading, error } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email || !password) {
      setFormError(t('emailAndPasswordRequired'));
      return;
    }

    const loginError = await adminLogin(email, password);
    if (loginError) {
      setFormError(loginError);
    } else {
      onAdminLoginSuccess(); // Redirect to admin dashboard
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-5xl font-bold mb-8 animate-neon-glow-title text-center leading-tight">
        {t('appName')}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="glassmorphism-bg p-8 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md animate-fadeInSlideUp"
      >
        <h2 className="text-3xl font-bold text-gray-100 mb-6 text-center">{t('adminLogin')}</h2>

        <div className="flex flex-col gap-5 mb-6">
          <FloatingLabelInput
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            label={t('emailPlaceholder')}
            disabled={isLoading}
          />
          <FloatingLabelInput
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            label={t('passwordPlaceholder')}
            disabled={isLoading}
          />
        </div>

        {formError && (
          <p className="text-red-500 text-sm text-center mb-4">{formError}</p>
        )}
        {error && ( // Global auth context error
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        <button
          type="submit"
          className="w-full relative px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md overflow-hidden transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed
                     before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-br before:from-purple-700 before:via-indigo-600 before:to-purple-800 before:opacity-0 before:hover:opacity-100 before:transition-opacity before:duration-300 before:ease-in-out
                     after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:w-0 after:h-0 after:bg-white after:rounded-full after:opacity-0 after:transform after:-translate-x-1/2 after:-translate-y-1/2 after:scale-0 after:duration-500 after:ease-out"
          disabled={isLoading}
          style={{ zIndex: 1 }}
        >
          {isLoading ? (
            <div className="loading-spinner mx-auto"></div>
          ) : (
            <span className="relative z-10">{t('adminLogin')}</span>
          )}
        </button>

        <p className="mt-6 text-center text-gray-300 text-sm">
          <button
            type="button"
            onClick={onUserLoginRedirect}
            className="text-blue-400 hover:underline font-semibold transition-colors duration-200"
          >
            {t('login')} {t('asUser')}
          </button>
        </p>
      </form>
    </div>
  );
};

export default AdminLoginView;
