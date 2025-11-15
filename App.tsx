import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import SourcesView from './components/SourcesView';
import DashboardView from './components/DashboardView';
import ProfileView from './components/ProfileView';
import LanguageSelectorModal from './components/LanguageSelectorModal';
import LoginView from './components/LoginView'; // New: Login View
import SignUpView from './components/SignUpView'; // New: Sign Up View
import AdminLoginView from './components/AdminLoginView'; // New: Admin Login View
import AdminDashboardView from './components/AdminDashboardView'; // New: Admin Dashboard View
import TempMailView from './components/TempMailView'; // New: TempMailView
import { geminiService } from './services/geminiService';
import { ChatMessage as TChatMessage } from './types';
import { useLanguage } from './contexts/LanguageContext';
import { useAuth } from './contexts/AuthContext'; // New: useAuth hook

function App() {
  const { language, setLanguage, t } = useLanguage();
  const { isLoggedIn, user, isLoading: authLoading, logout, isAdmin, adminLogout } = useAuth(); // Use auth context, isAdmin
  const [messages, setMessages] = useState<TChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Managed directly by useState
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'chat' | 'dashboard' | 'sources' | 'profile' | 'login' | 'signup' | 'adminLogin' | 'adminDashboard' | 'tempMail'>('login'); // Default to login, added tempMail
  const [showLanguageSelector, setShowLanguageSelector] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only scroll into view if we are in the chat view
    if (currentView === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentView]);

  useEffect(() => {
    // Update document title dynamically based on current view and authentication state
    if (isLoggedIn && user && !['login', 'signup', 'adminLogin'].includes(currentView)) {
        document.title = `${t(currentView as any)} - ${t('appName')}`;
    } else if (isAdmin && currentView === 'adminDashboard') {
        document.title = `${t('adminDashboard')} - ${t('appName')}`;
    }
    else if (!isLoggedIn && (currentView === 'login' || currentView === 'signup' || currentView === 'adminLogin')) {
        document.title = `${t(currentView as any)} - ${t('appName')}`;
    } else {
        document.title = t('appName');
    }
  }, [currentView, isLoggedIn, user, isAdmin, t]); // Added isAdmin

  useEffect(() => {
    // This useEffect handles the initial transition after language selection and auth check
    // It should NOT have currentView in its dependencies to avoid interfering with user navigation
    if (!showLanguageSelector && !authLoading) {
      if (isAdmin) {
        if (currentView !== 'adminDashboard') {
          setCurrentView('adminDashboard');
        }
      } else if (isLoggedIn) {
        // If logged in (as regular user), ensure we are not on a login/signup/adminLogin view
        if (['login', 'signup', 'adminLogin'].includes(currentView)) {
          setCurrentView('dashboard');
        } else if (!['chat', 'dashboard', 'sources', 'profile', 'adminDashboard', 'tempMail'].includes(currentView)) { // Added tempMail
          // If somehow on an unknown view after login, default to dashboard
          setCurrentView('dashboard');
        }
      } else {
        // If not logged in and not admin, ensure we are on a login/signup/adminLogin view
        if (!['login', 'signup', 'adminLogin'].includes(currentView)) {
          setCurrentView('login');
        }
      }
    }
  }, [showLanguageSelector, authLoading, isLoggedIn, isAdmin]); // Added isAdmin to dependencies


  const handleLanguageSelect = (lang: 'en' | 'hi' | 'bn') => {
    setLanguage(lang);
    localStorage.setItem('appLanguage', lang); // Persist selection
    setShowLanguageSelector(false);

    // Immediately set the view after language selection based on auth status
    if (!authLoading) { // Only if auth status is already known
      if (isAdmin) {
        setCurrentView('adminDashboard');
      } else if (isLoggedIn) {
        setCurrentView('dashboard');
      } else {
        setCurrentView('login');
      }
    }
    // If authLoading is true, the useEffect above will handle the transition once authLoading becomes false
  };

  const handleSendMessage = useCallback(async (text: string, imageData?: { base64: string; mimeType: string; }) => {
    setError(null);
    setIsLoading(true);

    const newUserMessage: TChatMessage = {
      id: `user-${Date.now()}`,
      text: text,
      sender: 'user',
      timestamp: new Date(),
      imageData: imageData, // Include image data if present
    };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);

    const newAiMessage: TChatMessage = {
      id: `ai-${Date.now()}`,
      text: '...', // Placeholder for streaming content
      sender: 'ai',
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, newAiMessage]);

    try {
      const isApiKeyReady = await geminiService.ensureApiKey();
      if (!isApiKeyReady) {
        setError(t('apiKeyNotSelected'));
        setIsLoading(false);
        setMessages((prevMessages) => prevMessages.slice(0, prevMessages.length - 1)); // Remove AI placeholder
        return;
      }

      const { stream } = await geminiService.sendMessageStream(text, language, imageData); // geminiService handles its own AbortController

      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          const lastAiMessageIndex = updatedMessages.findIndex(msg => msg.id === newAiMessage.id);
          if (lastAiMessageIndex !== -1) {
            updatedMessages[lastAiMessageIndex] = {
              ...updatedMessages[lastAiMessageIndex],
              text: fullResponse,
              timestamp: new Date(), // Update timestamp as content arrives
            };
          }
          return updatedMessages;
        });
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.message || t('unknownError'));
      // Remove AI placeholder if an error occurred before any content arrived
      setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        if (lastMessage && lastMessage.id === newAiMessage.id && lastMessage.text === '...') {
          return prevMessages.slice(0, prevMessages.length - 1);
        }
        return prevMessages;
      });
    } finally {
      setIsLoading(false);
    }
  }, [language, t, isLoggedIn, authLoading]); // Added isLoggedIn, authLoading to dependencies for ensureApiKey check re-evaluation

  const handleNavClick = (view: typeof currentView) => {
    setCurrentView(view);
  };

  if (showLanguageSelector) {
    return <LanguageSelectorModal onSelectLanguage={handleLanguageSelect} />;
  }

  // Show Admin Login if not admin and auth check is complete
  if (!isAdmin && !isLoggedIn && !authLoading && currentView === 'adminLogin') {
    return (
      <div className="flex flex-col flex-grow min-h-screen relative overflow-hidden items-center justify-center p-4">
        <AdminLoginView onAdminLoginSuccess={() => setCurrentView('adminDashboard')} onUserLoginRedirect={() => setCurrentView('login')} />
      </div>
    );
  }

  // Show Admin Dashboard if logged in as admin
  if (isAdmin && !authLoading) {
    return (
      <div className="flex flex-col flex-grow min-h-screen relative overflow-hidden items-center justify-center p-4">
        <AdminDashboardView onAdminLogout={adminLogout} />
      </div>
    );
  }

  // Show login/signup if not authenticated and auth check is complete (and not admin)
  if (!isLoggedIn && !authLoading && !isAdmin) {
    return (
      <div className="flex flex-col flex-grow min-h-screen relative overflow-hidden items-center justify-center p-4">
        {currentView === 'signup' ? (
          <SignUpView onLoginRedirect={() => handleNavClick('login')} />
        ) : (
          <LoginView onSignUpRedirect={() => handleNavClick('signup')} onAdminLoginRedirect={() => handleNavClick('adminLogin')} />
        )}
      </div>
    );
  }

  // Show loading spinner while auth is checking
  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-50">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Main app content (for regular users)
  return (
    <div className="flex flex-col flex-grow min-h-screen relative overflow-hidden">
      <main className="flex-grow p-4 md:p-6 overflow-y-auto custom-scrollbar flex flex-col items-center relative bg-transparent">
        {/* Adsterra banner root for logged-in regular users */}
        {isLoggedIn && !isAdmin && (
          <div id="adsterra-banner-root" className="my-4 mx-auto w-[320px] h-[50px] overflow-hidden rounded-lg shadow-md bg-gray-900 flex items-center justify-center text-xs text-gray-400">
            {/* Ad content will be injected here by the script */}
          </div>
        )}

        {/* Changed app name to translate dynamically */}
        {currentView !== 'login' && currentView !== 'signup' && currentView !== 'adminLogin' && ( // Don't show app name on auth screens
          <h1 className="text-3xl font-bold text-blue-400 mb-6 text-center animate-neon-glow-title">{t('appName')}</h1>
        )}

        <div key={currentView} className="w-full max-w-3xl flex flex-col items-center animate-fadeInSlideUp animate-subtlePulse">
          {currentView === 'chat' && (
            <>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-grow text-gray-200 mt-20" role="status">
                  <p className="text-lg">{t('startConversation', { appName: t('appName') })}</p>
                  <p className="text-sm mt-2">{t('typeMessageBelow')}</p>
                </div>
              )}

              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {error && (
                <div className="bg-red-800 text-white p-3 rounded-lg mt-4 max-w-xl self-center text-sm" role="alert">
                  <p>{t('errorOccurred')} {error}</p>
                  <p className="mt-1 text-xs opacity-80">
                    {t('checkInputOrApiKey')}
                    {typeof window.aistudio !== 'undefined' && (
                      <> <button onClick={() => window.aistudio.openSelectKey()} className="underline font-semibold ml-1">{t('selectApiKey')}</button></>
                    )}
                    {t('referTo')}{' '}
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">
                      {t('billingDocumentation')}
                    </a>.
                  </p>
                </div>
              )}
              <div ref={chatEndRef} />
            </>
          )}

          {currentView === 'sources' && (
            <SourcesView />
          )}

          {currentView === 'dashboard' && (
            <DashboardView currentUser={user} /> // Pass user to Dashboard
          )}

          {currentView === 'profile' && (
            <ProfileView currentUser={user} onLogout={logout} /> // Pass user and logout to Profile
          )}

          {currentView === 'tempMail' && ( // New: Render TempMailView
            <TempMailView />
          )}
        </div>
      </main>

      {/* Navigation bar fixed at the bottom, only visible when logged in (and not admin) */}
      {isLoggedIn && !isAdmin && (
        <footer className="sticky bottom-0 w-full bg-[#0A0A0A] bg-opacity-65 backdrop-blur-md z-20 py-6 px-6 flex flex-col items-center rounded-t-[26px] shadow-[0_-4px_15px_rgba(255,217,68,0.2)] animate-footer-depth-pulse">
          {currentView === 'chat' && (
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          )}
          <nav aria-label="Main navigation" className="w-full md:w-auto mt-6">
              <ul className="flex flex-wrap justify-center gap-8 text-lg font-medium">
                <li>
                  <button
                    onClick={() => handleNavClick('dashboard')}
                    className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
                    aria-current={currentView === 'dashboard' ? 'page' : undefined}
                  >
                    <svg className={`w-6 h-6 stroke-[1.8px] ${currentView === 'dashboard' ? 'animate-active-icon-flourish' : 'animate-inactive-icon-pulse'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                    </svg>
                    {t('dashboard')}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleNavClick('sources')}
                    className={`nav-item ${currentView === 'sources' ? 'active' : ''}`}
                    aria-current={currentView === 'sources' ? 'page' : undefined}
                  >
                    <svg className={`w-6 h-6 stroke-[1.8px] ${currentView === 'sources' ? 'animate-active-icon-flourish' : 'animate-inactive-icon-pulse'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2.586m-4.5-4.5L12 10.5l-2.5-2.5"></path>
                    </svg>
                    {t('sources')}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleNavClick('chat')}
                    className={`nav-item ${currentView === 'chat' ? 'active' : ''}`}
                    aria-current={currentView === 'chat' ? 'page' : undefined}
                  >
                    <svg className={`w-6 h-6 stroke-[1.8px] ${currentView === 'chat' ? 'animate-active-icon-flourish' : 'animate-inactive-icon-pulse'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                    {t('aiChat')}
                  </button>
                </li>
                <li> {/* New Temp-Mail Navigation Item */}
                  <button
                    onClick={() => handleNavClick('tempMail')}
                    className={`nav-item ${currentView === 'tempMail' ? 'active' : ''}`}
                    aria-current={currentView === 'tempMail' ? 'page' : undefined}
                  >
                    <svg className={`w-6 h-6 stroke-[1.8px] ${currentView === 'tempMail' ? 'animate-active-icon-flourish' : 'animate-inactive-icon-pulse'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM5 7.5L12 13l7-5.5V6L12 11 5 6V7.5z"></path>
                    </svg>
                    {t('tempMail')}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleNavClick('profile')}
                    className={`nav-item ${currentView === 'profile' ? 'active' : ''}`}
                    aria-current={currentView === 'profile' ? 'page' : undefined}
                  >
                    <svg className={`w-6 h-6 stroke-[1.8px] ${currentView === 'profile' ? 'animate-active-icon-flourish' : 'animate-inactive-icon-pulse'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    {t('profile')}
                  </button>
                </li>
              </ul>
            </nav>
        </footer>
      )}
    </div>
  );
}

export default App;