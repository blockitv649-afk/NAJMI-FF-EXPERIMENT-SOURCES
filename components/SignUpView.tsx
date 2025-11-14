
// components/SignUpView.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import FloatingLabelInput from './FloatingLabelInput'; // New: FloatingLabelInput
import AnimatedCheckbox from './AnimatedCheckbox'; // New: AnimatedCheckbox

interface SignUpViewProps {
  onLoginRedirect: () => void;
}

const SignUpView: React.FC<SignUpViewProps> = ({ onLoginRedirect }) => {
  const { signup, isLoading, error } = useAuth();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notARobot, setNotARobot] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSignupSuccess(false);

    // Basic client-side validation for empty fields (more robust handled by authService)
    if (!fullName || !email || !password || !confirmPassword) {
      setFormError(t('allFieldsRequired'));
      return;
    }
    if (password !== confirmPassword) {
      setFormError(t('passwordsMismatch'));
      return;
    }
    if (!notARobot) {
      setFormError(t('robotCheckRequired'));
      return;
    }

    const signupError = await signup({ fullName, email, password, confirmPassword, notARobot });
    if (signupError) {
      setFormError(signupError);
    } else {
      setSignupSuccess(true);
      // Optionally redirect to login after a short delay
      setTimeout(() => {
        onLoginRedirect();
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-5xl font-bold mb-8 animate-neon-glow-title text-center leading-tight">
        {t('najmiFFExperiment')}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="glassmorphism-bg p-8 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md animate-fadeInSlideUp"
      >
        <h2 className="text-3xl font-bold text-gray-100 mb-6 text-center">{t('signupTitle')}</h2>

        <div className="flex flex-col gap-5 mb-6">
          <FloatingLabelInput
            id="signup-fullname"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            label={t('fullNamePlaceholder')}
            disabled={isLoading}
          />
          <FloatingLabelInput
            id="signup-gmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            label={t('emailPlaceholder')}
            disabled={isLoading}
          />
          <FloatingLabelInput
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            label={t('passwordPlaceholder')}
            disabled={isLoading}
          />
          <FloatingLabelInput
            id="signup-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            label={t('confirmPasswordPlaceholder')}
            disabled={isLoading}
          />

          <div className="flex items-center justify-center gap-3">
            <AnimatedCheckbox
              id="not-a-robot"
              checked={notARobot}
              onChange={setNotARobot}
              disabled={isLoading}
            />
            <label htmlFor="not-a-robot" className="text-gray-300 cursor-pointer select-none">
              {t('notARobot')}
            </label>
          </div>
        </div>

        {formError && (
          <p className="text-red-500 text-sm text-center mb-4">{formError}</p>
        )}
        {error && ( // Global auth context error
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}
        {signupSuccess && (
          <p className="text-green-500 text-sm text-center mb-4 animate-fade-in">{t('signupSuccess')}</p>
        )}

        <button
          type="submit"
          className="w-full relative px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-[#0A0A0A] font-semibold rounded-lg shadow-md overflow-hidden transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#FFCC00] disabled:opacity-50 disabled:cursor-not-allowed
                     before:content-[''] before:absolute before:inset-0 before:bg-white before:opacity-0 before:transition-opacity before:duration-300 before:ease-in-out
                     after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:w-0 after:h-0 after:bg-white after:rounded-full after:opacity-0 after:transform after:-translate-x-1/2 after:-translate-y-1/2 after:scale-0 after:duration-500 after:ease-out"
          disabled={isLoading}
          style={{ zIndex: 1 }}
        >
          {isLoading ? (
            <div className="loading-spinner mx-auto"></div>
          ) : (
            <span className="relative z-10">{t('createAccount')}</span>
          )}
        </button>

        <p className="mt-6 text-center text-gray-300 text-sm">
          {t('alreadyHaveAccount')}{' '}
          <button
            type="button"
            onClick={onLoginRedirect}
            className="text-yellow-400 hover:underline font-semibold transition-colors duration-200 ml-1"
          >
            {t('login')}
          </button>
        </p>
      </form>
    </div>
  );
};

export default SignUpView;