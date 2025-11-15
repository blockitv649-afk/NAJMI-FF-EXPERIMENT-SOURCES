
// components/TempMailView.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// API Base URL: https://api.mail.tm
const API_BASE_URL = "https://api.mail.tm";

interface EmailAccount {
  accountId: string;
  address: string;
  token: string;
}

interface InboxMessage {
  id: string;
  subject: string;
  intro?: string;
  from?: { address: string; name?: string; };
  createdAt: string;
  html?: string[];
  text?: string;
}

type SubView = 'home' | 'detail';
type ToastType = 'info' | 'error';

const TempMailView: React.FC = () => {
  const { t, language } = useLanguage();

  // --- State ---
  const [currentEmailData, setCurrentEmailData] = useState<EmailAccount | null>(null);
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [currentSubView, setCurrentSubView] = useState<SubView>('home');
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null); // Full message details
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isLoadingMail, setIsLoadingMail] = useState(true); // For initial email generation
  const [isProcessingAction, setIsProcessingAction] = useState(false); // For button actions
  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({ message: '', type: 'info', visible: false });
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.theme === 'dark');

  // --- Refs ---
  // Fix: In browser environments, setTimeout and setInterval return a number, not NodeJS.Timeout.
  const timerIntervalRef = useRef<number | null>(null);
  // Fix: In browser environments, setTimeout and setInterval return a number, not NodeJS.Timeout.
  const inboxCheckIntervalRef = useRef<number | null>(null);
  // Fix: In browser environments, setTimeout and setInterval return a number, not NodeJS.Timeout.
  const toastTimeoutRef = useRef<number | null>(null);
  const copyBtnTextRef = useRef<HTMLSpanElement>(null);
  const copyBtnIconRef = useRef<HTMLSpanElement>(null);

  // --- Utility Functions ---
  const fetchWithTimeout = useCallback(async (url: string, options: RequestInit = {}, timeout = 8000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err: any) {
      clearTimeout(id);
      if (err.name === 'AbortError') {
        throw new Error(t('requestTimedOut'));
      }
      throw err;
    }
  }, [t]);

  const randomString = useCallback((length: number) => {
    let result = '';
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type, visible: true });
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  const formatDate = useCallback((dateValue: string | number, full = false) => {
    try {
      const date = new Date(dateValue);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.round(diffMs / 60000);

      if (full) {
        return date.toLocaleString(language);
      }

      if (diffMins < 1) return t('justNow');
      if (diffMins < 60) return t('minAgo', { minutes: String(diffMins) });
      if (diffMins < 1440) return t('hAgo', { hours: String(Math.floor(diffMins / 60)) });
      return date.toLocaleDateString(language);
    } catch (e) {
      return String(dateValue);
    }
  }, [t, language]);

  const escapeHTML = useCallback((str: string | undefined) => {
    if (!str) return "";
    return str.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }, []);

  // --- Core Logic Functions ---

  const getNewEmail = useCallback(async () => {
    setIsProcessingAction(true);
    try {
      // 1. Get an available domain
      const domainResponse = await fetchWithTimeout(`${API_BASE_URL}/domains`);
      if (!domainResponse.ok) throw new Error('Failed to get domain');
      const domains = await domainResponse.json();
      const domain = domains['hydra:member'][0]?.domain;
      if (!domain) throw new Error('No available domains.');

      // 2. Create random address and password
      const address = `artempmail${randomString(6)}@${domain}`;
      const password = randomString(12);

      // 3. Create the account
      const createResponse = await fetchWithTimeout(`${API_BASE_URL}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
      });
      if (!createResponse.ok) throw new Error('Failed to create account');
      const accountData = await createResponse.json();
      const accountId = accountData.id;

      // 4. Get the auth token
      const tokenResponse = await fetchWithTimeout(`${API_BASE_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
      });
      if (!tokenResponse.ok) throw new Error('Failed to get token');
      const tokenData = await tokenResponse.json();
      const token = tokenData.token;

      // 5. Store data and update UI
      setCurrentEmailData({ accountId, address, token });
      setInboxMessages([]);
      resetTimer();
      showToast(t('newEmailGenerated'));
      return true;

    } catch (err: any) {
      console.error("Failed to get new email:", err);
      showToast(err.message || t('errorGeneratingEmail'), "error");
      return false;
    } finally {
      setIsProcessingAction(false);
    }
  }, [fetchWithTimeout, randomString, showToast, t]);

  const checkInbox = useCallback(async () => {
    if (!currentEmailData || !currentEmailData.token) return;

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/messages`, {
        headers: { 'Authorization': `Bearer ${currentEmailData.token}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          showToast(t('sessionExpired'), "error");
          await getNewEmail(); // Attempt to get a new email on token expiry
        }
        throw new Error(t('failedToCheckInbox'));
      }

      const data = await response.json();
      setInboxMessages(data['hydra:member'] || []);
    } catch (err) {
      console.error("Failed to check inbox:", err);
    }
  }, [currentEmailData, fetchWithTimeout, showToast, t, getNewEmail]);


  const openEmail = useCallback(async (messageId: string) => {
    if (!currentEmailData) return;

    showToast(t('loadingEmail'));
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/messages/${messageId}`, {
        headers: { 'Authorization': `Bearer ${currentEmailData.token}` }
      });
      if (!response.ok) throw new Error(t('errorLoadingEmail'));

      const data = await response.json();
      setSelectedMessage(data);
      setCurrentSubView('detail');
    } catch (err: any) {
      console.error("Failed to open email:", err);
      showToast(err.message || t('errorLoadingEmail'), "error");
    }
  }, [currentEmailData, fetchWithTimeout, showToast, t]);

  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerIntervalRef.current!);
          timerIntervalRef.current = null;
          showToast(t('timerExpired'), "error");
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  }, [showToast, t]);

  const resetTimer = useCallback(() => {
    setTimeLeft(600); // 10 minutes
    startTimer(); // Always restart the timer
  }, [startTimer]);

  const extendTimer = useCallback(() => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    resetTimer();
    showToast(t('timerReset'));
    setIsProcessingAction(false);
  }, [isProcessingAction, resetTimer, showToast, t]);

  const copyToClipboard = useCallback(() => {
    if (!currentEmailData || !currentEmailData.address || isProcessingAction) return;

    navigator.clipboard.writeText(currentEmailData.address)
      .then(() => {
        if (copyBtnTextRef.current && copyBtnIconRef.current) {
          copyBtnTextRef.current.textContent = t('copied');
          copyBtnIconRef.current.textContent = "check";
          setTimeout(() => {
            if (copyBtnTextRef.current && copyBtnIconRef.current) {
              copyBtnTextRef.current.textContent = t('copy');
              copyBtnIconRef.current.textContent = "content_copy";
            }
          }, 2000);
        }
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        showToast(t('failedToCopy'), "error");
      });
  }, [currentEmailData, isProcessingAction, showToast, t]);

  const deleteEmailAccount = useCallback(async () => {
    if (!currentEmailData || isProcessingAction) return;
    setIsProcessingAction(true);
    showToast(t('deletingEmail'));

    try {
      await fetchWithTimeout(`${API_BASE_URL}/accounts/${currentEmailData.accountId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentEmailData.token}` }
      });
    } catch (err) {
      console.error("Failed to delete account, but getting new one anyway.", err);
    } finally {
      await getNewEmail(); // Always get a new email after trying to delete
      setIsProcessingAction(false);
    }
  }, [currentEmailData, fetchWithTimeout, isProcessingAction, showToast, t, getNewEmail]);

  const deleteSingleMessage = useCallback(async (messageId: string) => {
    if (!currentEmailData || isProcessingAction) return;
    setIsProcessingAction(true);
    showToast(t('deletingMessage'));

    try {
      // The mail.tm API doesn't have a direct DELETE /messages/{id}.
      // Messages eventually expire. For local UI, we'll just filter it out.
      setInboxMessages(prev => prev.filter(m => m.id !== messageId));
      showToast(t('messageDeleted'));
      setSelectedMessage(null); // Clear selected message
      setCurrentSubView('home'); // Go back to home
    } catch (err) {
      console.error("Failed to delete message locally:", err);
      showToast(t('errorDeletingMessage'), "error");
    } finally {
      setIsProcessingAction(false);
    }
  }, [currentEmailData, isProcessingAction, showToast, t]);

  // --- Effects ---

  // Initial app setup (get first email)
  useEffect(() => {
    const init = async () => {
      setIsLoadingMail(true);
      const success = await getNewEmail();
      if (!success) {
        showToast(t('failedToConnectRetrying'), "error");
        setTimeout(init, 3000); // Retry after 3 seconds
      }
      setIsLoadingMail(false);
    };
    init();

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (inboxCheckIntervalRef.current) clearInterval(inboxCheckIntervalRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [getNewEmail, showToast, t]);

  // Start inbox checking interval once email data is available
  useEffect(() => {
    if (currentEmailData) {
      if (inboxCheckIntervalRef.current) clearInterval(inboxCheckIntervalRef.current);
      inboxCheckIntervalRef.current = setInterval(checkInbox, 10000); // Check every 10 seconds
      checkInbox(); // Initial check
    }
    return () => {
      if (inboxCheckIntervalRef.current) clearInterval(inboxCheckIntervalRef.current);
    };
  }, [currentEmailData, checkInbox]);

  // Dark mode toggle effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [isDarkMode]);

  // --- Render Logic ---

  // Format timer display
  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  const renderHomeView = () => (
    <div className="flex min-h-screen w-full flex-col p-4 sm:p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100">
      <header className="flex w-full items-center justify-between pb-6">
        <div className="w-10"></div> {/* Spacer */}
        <h1 className="text-2xl font-bold tracking-tight text-center">
          <span className="text-[#FFCC00]">AR</span> {t('tempMail')}
        </h1>
        <button
          onClick={() => setIsDarkMode(prev => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 shadow-sm text-gray-200 button-glow-on-focus"
          aria-label={isDarkMode ? 'Toggle light mode' : 'Toggle dark mode'}
        >
          <span className="material-symbols-outlined text-xl">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </header>

      <main className="flex flex-1 flex-col gap-6">
        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={getNewEmail}
            disabled={isProcessingAction || isLoadingMail}
            className="flex h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#00BFFF] py-3 text-base font-bold text-white shadow-lg shadow-blue-500/30 button-glow-on-focus transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('changeMail')}
          >
            {isProcessingAction && (
              <div className="spinner"></div>
            )}
            {!isProcessingAction && (
              <>
                <span className="material-symbols-outlined text-xl">autorenew</span>
                <span>{t('changeMail')}</span>
              </>
            )}
          </button>
          <button
            onClick={deleteEmailAccount}
            disabled={isProcessingAction || isLoadingMail || !currentEmailData}
            className="flex h-[46px] w-full items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-transparent py-3 text-base font-bold text-red-500 button-glow-on-focus transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('deleteMail')}
          >
            {isProcessingAction && (
              <div className="spinner spinner-dark"></div>
            )}
            {!isProcessingAction && (
              <>
                <span className="material-symbols-outlined text-xl">delete</span>
                <span>{t('deleteMail')}</span>
              </>
            )}
          </button>
        </div>

        {/* Email Address Card */}
        <div className="rounded-lg bg-gray-800 p-4 shadow-sm border border-gray-700">
          <p className="mb-2 text-sm text-gray-400">{t('yourTempEmailAddress')}</p>
          <div className="flex items-center gap-2 rounded-md border border-gray-600 bg-gray-900 p-3">
            <span className="material-symbols-outlined text-base text-[#FFCC00]">alternate_email</span>
            <p id="email-display" className="flex-1 truncate font-medium">
              {isLoadingMail ? t('loading') : currentEmailData?.address || t('loading')}
            </p>
            <button
              onClick={copyToClipboard}
              disabled={isLoadingMail || !currentEmailData}
              className="flex items-center gap-1.5 rounded-full bg-[#FFCC00]/10 px-3 py-1.5 text-sm font-medium text-[#FFCC00] button-glow-on-focus disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t('copy')}
            >
              <span ref={copyBtnIconRef} className="material-symbols-outlined text-base">content_copy</span>
              <span ref={copyBtnTextRef}>{t('copy')}</span>
            </button>
          </div>
        </div>

        {/* Timer Card */}
        <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-800 p-4 shadow-sm border border-gray-700">
          <div className="flex flex-col">
            <p className="text-sm text-gray-400">{t('emailLifetime')}</p>
            <p className="text-xl font-bold text-[#00BFFF]">{`${minutes}:${seconds}`}</p>
          </div>
          <button
            onClick={extendTimer}
            disabled={isProcessingAction || isLoadingMail}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#00BFFF]/50 bg-transparent px-4 py-2 font-medium text-[#00BFFF] button-glow-on-focus transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('extend')}
          >
            {isProcessingAction && (
              <div className="spinner spinner-dark"></div>
            )}
            {!isProcessingAction && (
              <>
                <span className="material-symbols-outlined">timer</span>
                <span>{t('extend')}</span>
              </>
            )}
          </button>
        </div>

        {/* Inbox Card */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg bg-gray-800 shadow-sm border border-gray-700">
          <div className="flex items-center justify-between border-b border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{t('inbox')}</h2>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFCC00] text-sm font-bold text-gray-900">
                {inboxMessages.length}
              </div>
            </div>
            <button
              onClick={() => { showToast(t('refreshingInbox')); checkInbox(); }}
              disabled={isLoadingMail || isProcessingAction}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-700 button-glow-on-focus disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t('refreshInbox')}
            >
              <span className="material-symbols-outlined">refresh</span>
            </button>
          </div>

          {/* Inbox List */}
          <div className="flex-1 space-y-1 overflow-y-auto p-2 no-scrollbar">
            {inboxMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <span className="material-symbols-outlined text-5xl text-gray-600">inbox</span>
                <p className="mt-2 font-medium text-gray-200">{t('yourInboxIsEmpty')}</p>
                <p className="text-sm text-gray-400">{t('waitingForIncomingEmails')}</p>
              </div>
            ) : (
              inboxMessages
                .slice() // Create a shallow copy to avoid mutating state directly
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(msg => (
                  <div
                    key={msg.id}
                    className="message-item flex flex-col gap-1 rounded-md p-3 hover:bg-gray-700 cursor-pointer border border-transparent hover:border-blue-500 transition-all duration-150 ease-in-out"
                    onClick={() => openEmail(msg.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open email from ${msg.from?.name || msg.from?.address || t('unknownSender')} with subject ${msg.subject || t('noSubject')}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`font-bold ${msg.from?.name?.toLowerCase().includes('social') ? 'text-[#00BFFF]' : ''}`}>
                        {escapeHTML(msg.from?.name || msg.from?.address || t('unknownSender'))}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(msg.createdAt)}</p>
                    </div>
                    <p className="font-medium text-gray-50">
                      {escapeHTML(msg.subject || t('noSubject'))}
                    </p>
                    <p className="truncate text-sm text-gray-300">
                      {escapeHTML(msg.intro ? msg.intro : t('clickToReadMessage'))}
                    </p>
                  </div>
                ))
            )}
          </div>
        </div>
      </main>
    </div>
  );

  const renderEmailDetailView = () => (
    <div className="relative flex h-full min-h-screen w-full flex-col bg-gray-800 text-gray-100">
      <header className="flex items-center justify-between p-4 sticky top-0 z-10 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700">
        <button
          onClick={() => setCurrentSubView('home')}
          className="flex size-10 items-center justify-center rounded-full text-gray-100 hover:bg-gray-700 button-glow-on-focus"
          aria-label="Back to inbox"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold">{t('emailDetails')}</h1>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      <main className="flex-1 flex-col overflow-y-auto no-scrollbar">
        {selectedMessage && (
          <div className="p-4">
            <div className="mb-6 flex flex-col gap-1 border-b border-gray-700 pb-6">
              <h2 className="text-xl font-bold text-gray-100">{selectedMessage.subject || t('noSubject')}</h2>
              <div className="flex items-center gap-3 pt-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFCC00]/10 text-[#FFCC00]">
                  <span className="text-xl font-bold">{selectedMessage.from?.name?.[0]?.toUpperCase() || selectedMessage.from?.address?.[0]?.toUpperCase() || 'U'}</span>
                </div>
                <div className="flex flex-col">
                  <p className="font-bold text-gray-100">{selectedMessage.from?.name || selectedMessage.from?.address || t('unknownSender')}</p>
                  <p className="text-sm text-gray-400">{formatDate(selectedMessage.createdAt, true)}</p>
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div
              id="email-detail-body"
              className="flex-1 text-base leading-relaxed text-gray-300"
              dangerouslySetInnerHTML={{ __html: selectedMessage.html?.[0] || selectedMessage.text || "(No content)" }}
            />
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 z-10 bg-gray-800/80 p-4 backdrop-blur-sm border-t border-gray-700">
        <div className="flex w-full flex-col items-stretch gap-3">
          <button
            onClick={() => selectedMessage && deleteSingleMessage(selectedMessage.id)}
            disabled={isProcessingAction}
            className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-red-600 text-white text-base font-bold leading-normal tracking-wide button-glow-on-focus transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('deleteMessage')}
          >
            {isProcessingAction && (
              <div className="spinner"></div>
            )}
            {!isProcessingAction && (
              <>
                <span className="material-symbols-outlined">delete</span>
                <span>{t('deleteMessage')}</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );

  return (
    <div className="w-full max-w-2xl p-0 rounded-xl shadow-lg border border-gray-700 text-center min-h-[300px] flex flex-col items-center justify-center animate-subtlePulse
                    bg-gradient-to-br from-green-800 to-emerald-900 glassmorphism-bg animate-fadeInSlideUp overflow-hidden">
      {isLoadingMail ? (
        <div className="flex flex-col items-center justify-center flex-grow p-8">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-300 text-lg">{t('loading')} {t('arTempmail')}...</p>
        </div>
      ) : (
        <>
          {currentSubView === 'home' && renderHomeView()}
          {currentSubView === 'detail' && renderEmailDetailView()}
        </>
      )}

      {/* Toast Notification (positioned over all views) */}
      {toast.visible && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm rounded-lg p-3 text-white shadow-lg text-center transition-all duration-300 ease-out animate-fadeInSlideUp
                        ${toast.type === 'info' ? 'bg-[#00BFFF]' : 'bg-red-600'}`}>
          <span id="toast-message">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default TempMailView;