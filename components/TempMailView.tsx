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
  const [isLoadingInitialMail, setIsLoadingInitialMail] = useState(true); // For initial email generation only
  const [isActionProcessing, setIsActionProcessing] = useState(false); // For button actions
  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({ message: '', type: 'info', visible: false });
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.theme === 'dark');

  // New state for rate limiting
  const [retryAttempt, setRetryAttempt] = useState(0); // For UI display mostly
  const [isRateLimited, setIsRateLimited] = useState(false); // To indicate active rate limit + retry schedule

  // --- Refs ---
  const timerIntervalRef = useRef<number | null>(null);
  const inboxCheckIntervalRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const copyBtnTextRef = useRef<HTMLSpanElement>(null);
  const copyBtnIconRef = useRef<HTMLSpanElement>(null);

  // Refs for immediate access in closures (useEffect for syncing)
  const retryAttemptRef = useRef(0);
  const isRateLimitedRef = useRef(false);
  const isActionProcessingRef = useRef(false);

  // Sync state to refs for use in callbacks without stale closures
  useEffect(() => { retryAttemptRef.current = retryAttempt; }, [retryAttempt]);
  useEffect(() => { isRateLimitedRef.current = isRateLimited; }, [isRateLimited]);
  useEffect(() => { isActionProcessingRef.current = isActionProcessing; }, [isActionProcessing]);


  // --- Utility Functions ---
  const fetchWithTimeout = useCallback(async (url: string, options: RequestInit = {}, timeout = 8000) => {
    const controller = new AbortController();
    const id = window.setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      window.clearTimeout(id);

      // Check for 429 specifically here
      if (response.status === 429) {
        const errorText = await response.text();
        console.error(`API Error (429 Too Many Requests) for ${url}:`, errorText);
        throw new Error('RATE_LIMITED');
      }
      return response;
    } catch (err: any) {
      window.clearTimeout(id);
      console.error(`Fetch error for ${url}:`, err);
      if (err.name === 'AbortError') {
        throw new Error(t('requestTimedOut'));
      }
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        throw new Error(t('failedToConnectNetwork'));
      }
      throw err; // Re-throw other errors
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
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
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

  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = window.setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          window.clearInterval(timerIntervalRef.current!);
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

  const getNewEmail = useCallback(async (isScheduledRetry = false) => {
    // Only set processing for non-scheduled retries or if not already processing from a button click
    if (!isScheduledRetry && !isActionProcessingRef.current) {
        setIsActionProcessing(true); // Disable buttons
        setRetryAttempt(0); // Reset for fresh attempt
        setIsRateLimited(false); // Clear rate limit status
        showToast(t('loading') + ' ' + t('arTempmail') + '...'); // Initial loading message
    }

    try {
      // 1. Get an available domain
      const domainResponse = await fetchWithTimeout(`${API_BASE_URL}/domains`);
      if (!domainResponse.ok) {
        console.error('API Error: Failed to get domain from Mail.tm', domainResponse.status, await domainResponse.text());
        throw new Error(t('tempMailFailedToGetDomains')); // More specific error
      }
      const domains = await domainResponse.json();
      const domain = domains['hydra:member'][0]?.domain;
      if (!domain) throw new Error(t('tempMailNoAvailableDomains')); // More specific error

      // 2. Create random address and password
      const address = `artempmail${randomString(6)}@${domain}`;
      const password = randomString(12);

      // 3. Create the account
      const createResponse = await fetchWithTimeout(`${API_BASE_URL}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
      });
      if (!createResponse.ok) {
        console.error('API Error: Failed to create account on Mail.tm', createResponse.status, await createResponse.text());
        throw new Error(t('tempMailFailedToCreateAccount')); // More specific error
      }
      const accountData = await createResponse.json();
      const accountId = accountData.id;

      // 4. Get the auth token
      const tokenResponse = await fetchWithTimeout(`${API_BASE_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
      });
      if (!tokenResponse.ok) {
        console.error('API Error: Failed to get token from Mail.tm', tokenResponse.status, await tokenResponse.text());
        throw new Error(t('tempMailFailedToGetToken')); // More specific error
      }
      const tokenData = await tokenResponse.json();
      const token = tokenData.token;

      // 5. Store data and update UI
      setCurrentEmailData({ accountId, address, token });
      setInboxMessages([]);
      resetTimer();
      showToast(t('newEmailGenerated'));
      setRetryAttempt(0); // Reset on success
      setIsRateLimited(false); // Clear on success
      return true;

    } catch (err: any) {
      console.error("Failed to get new email:", err);
      // On failure, explicitly clear the current email data
      setCurrentEmailData(null); // Clear data on any failure

      if (err.message === 'RATE_LIMITED') {
          const newRetryAttempt = retryAttemptRef.current + 1;
          retryAttemptRef.current = newRetryAttempt; // Update ref immediately
          setRetryAttempt(newRetryAttempt); // Update state for UI

          const delay = Math.min(60000, 2000 * Math.pow(2, newRetryAttempt - 1)); // Max 60s
          setIsRateLimited(true); // Set rate limited flag
          showToast(t('tempMailTooManyRequestsWithRetry', { delayInSeconds: String(delay / 1000) }), "error");

          // Schedule retry
          window.setTimeout(() => getNewEmail(true), delay); // Recursive call
          return false; // Indicate failure for this specific attempt
      } else {
          // Other errors (network, API issues not 429)
          showToast(err.message || t('errorGeneratingEmail'), "error");
          setRetryAttempt(0); // Reset retry count
          setIsRateLimited(false); // Clear rate limited flag
          return false;
      }
    } finally {
      // Only stop processing if not actively rate-limited (and retrying)
      if (!isRateLimitedRef.current) {
          setIsActionProcessing(false);
      }
      // setIsLoadingInitialMail will be handled by init's finally block
    }
  }, [fetchWithTimeout, randomString, showToast, t, resetTimer]);

  const checkInbox = useCallback(async () => {
    if (!currentEmailData || !currentEmailData.token) return;

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/messages`, {
        headers: { 'Authorization': `Bearer ${currentEmailData.token}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          showToast(t('sessionExpired'), "error");
          await getNewEmail(false); // Attempt to get a new email on token expiry
        } else if (response.status === 429) {
            showToast(t('tempMailTooManyRequests'), "error"); // Just a toast for inbox
        } else {
            console.error('API Error: Failed to check inbox on Mail.tm', response.status, await response.text());
            throw new Error(t('tempMailFailedToCheckInbox')); // More specific error
        }
      }

      const data = await response.json();
      setInboxMessages(data['hydra:member'] || []);
    } catch (err: any) {
      console.error("Failed to check inbox:", err);
      // Only show toast for actual network/API errors, not just 401 which is handled or 429 which has its own toast
      if (err.message !== t('sessionExpired') && err.message !== 'RATE_LIMITED') {
         showToast(err.message || t('tempMailFailedToCheckInbox'), "error");
      }
    }
  }, [currentEmailData, fetchWithTimeout, showToast, t, getNewEmail]);


  const openEmail = useCallback(async (messageId: string) => {
    if (!currentEmailData) return;
    if (isActionProcessingRef.current) return;
    setIsActionProcessing(true); // Disable buttons while loading email detail

    showToast(t('loadingEmail'));
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/messages/${messageId}`, {
        headers: { 'Authorization': `Bearer ${currentEmailData.token}` }
      });
      if (!response.ok) {
        console.error('API Error: Failed to load email from Mail.tm', response.status, await response.text());
        throw new Error(t('errorLoadingEmail')); // More specific error
      }

      const data = await response.json();
      setSelectedMessage(data);
      setCurrentSubView('detail');
    } catch (err: any) {
      console.error("Failed to open email:", err);
      showToast(err.message || t('errorLoadingEmail'), "error");
    } finally {
      setIsActionProcessing(false); // Re-enable buttons
    }
  }, [currentEmailData, fetchWithTimeout, showToast, t]);

  const handleExtendTimer = useCallback(() => {
    if (isActionProcessingRef.current) return;
    setIsActionProcessing(true); // Explicitly set for this action
    resetTimer(); // Resets timer and calls startTimer
    showToast(t('timerReset'));
    setIsActionProcessing(false); // Timer extend is instant, so immediately clear
  }, [resetTimer, showToast, t]);

  const handleCopyToClipboard = useCallback(() => {
    if (!currentEmailData || !currentEmailData.address || isActionProcessingRef.current) return;

    navigator.clipboard.writeText(currentEmailData.address)
      .then(() => {
        if (copyBtnTextRef.current && copyBtnIconRef.current) {
          copyBtnTextRef.current.textContent = t('copied');
          copyBtnIconRef.current.textContent = "check";
          window.setTimeout(() => {
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
  }, [currentEmailData, showToast, t]);

  const handleDeleteEmailAccount = useCallback(async () => {
    if (!currentEmailData || isActionProcessingRef.current) return;
    setIsActionProcessing(true);
    showToast(t('deletingEmail'));

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/accounts/${currentEmailData.accountId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentEmailData.token}` }
      });
      // 404 might mean it already expired/deleted, so don't treat as critical failure
      if (!response.ok && response.status !== 404) {
        console.warn('API Error: Failed to delete account on Mail.tm', response.status, await response.text());
        throw new Error(t('errorDeletingEmailAccount'));
      }
    } catch (err: any) {
      console.error("Failed to delete account (network/other error), but getting new one anyway.", err);
      if (err.message !== 'RATE_LIMITED') { // Don't show generic error if it's just a rate limit that getNewEmail will handle
        showToast(err.message || t('errorDeletingEmailAccount'), "error");
      }
    } finally {
      await getNewEmail(false); // Always get a new email after trying to delete
      // setIsActionProcessing(false) is handled by getNewEmail's finally
    }
  }, [currentEmailData, fetchWithTimeout, showToast, t, getNewEmail]);

  const handleDeleteSingleMessage = useCallback(async (messageId: string) => {
    if (!currentEmailData || isActionProcessingRef.current) return;
    setIsActionProcessing(true);
    showToast(t('deletingMessage'));

    try {
      // The mail.tm API doesn't have a direct DELETE /messages/{id}.
      // Messages eventually expire. For local UI, we'll just filter it out.
      setInboxMessages(prev => prev.filter(m => m.id !== messageId));
      showToast(t('messageDeleted'));
      setSelectedMessage(null); // Clear selected message
      setCurrentSubView('home'); // Go back to home
    } catch (err: any) {
      console.error("Failed to delete message locally:", err);
      showToast(err.message || t('errorDeletingMessage'), "error");
    } finally {
      setIsActionProcessing(false);
    }
  }, [currentEmailData, showToast, t]);

  const handleRefreshInbox = useCallback(() => {
    if (isActionProcessingRef.current) return;
    setIsActionProcessing(true); // Set processing for refresh
    showToast(t('refreshingInbox'));
    checkInbox().finally(() => setIsActionProcessing(false)); // Clear after inbox check
  }, [checkInbox, showToast, t]);


  // --- Effects ---

  // Initial app setup (get first email)
  useEffect(() => {
    const init = async () => {
        setIsLoadingInitialMail(true); // Show full screen loader
        const success = await getNewEmail(false); // Call getNewEmail, not a scheduled retry
        if (!success && !isRateLimitedRef.current) { // Only re-init if not rate-limited and it failed
            console.log("Initial email generation failed, retrying init in 3 seconds...");
            window.setTimeout(init, 3000); // Retry init for non-rate-limit failures
        }
        // If success or rate limited, getNewEmail or its scheduled retry will handle it
        setIsLoadingInitialMail(false); // Hide full screen loader regardless
    };
    init();

    return () => {
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
      if (inboxCheckIntervalRef.current) window.clearInterval(inboxCheckIntervalRef.current);
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    };
  }, [getNewEmail, t]); // Depend on getNewEmail as it handles the core logic


  // Start inbox checking interval once email data is available
  useEffect(() => {
    if (currentEmailData) {
      if (inboxCheckIntervalRef.current) window.clearInterval(inboxCheckIntervalRef.current);
      inboxCheckIntervalRef.current = window.setInterval(checkInbox, 10000); // Use window.setInterval
      checkInbox(); // Initial check
    }
    return () => {
      if (inboxCheckIntervalRef.current) window.clearInterval(inboxCheckIntervalRef.current);
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
            onClick={() => getNewEmail(false)} // Pass false as it's not a scheduled retry
            disabled={isActionProcessing || isRateLimited}
            className="flex h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#00BFFF] py-3 text-base font-bold text-white shadow-lg shadow-blue-500/30 button-glow-on-focus transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('changeMail')}
          >
            {(isActionProcessing || isRateLimited) ? (
              <div className="spinner"></div>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">autorenew</span>
                <span>{t('changeMail')}</span>
              </>
            )}
          </button>
          <button
            onClick={handleDeleteEmailAccount}
            disabled={isActionProcessing || isRateLimited || !currentEmailData}
            className="flex h-[46px] w-full items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-transparent py-3 text-base font-bold text-red-500 button-glow-on-focus transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('deleteMail')}
          >
            {(isActionProcessing || isRateLimited) ? (
              <div className="spinner spinner-dark"></div>
            ) : (
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
              {isRateLimited ? t('tempMailTooManyRequestsWithRetry', { delayInSeconds: String(Math.round(Math.min(60000, 2000 * Math.pow(2, retryAttempt - 1)))/1000)}) :
               currentEmailData?.address || t('tempMailFailedToGenerateAddress')}
            </p>
            <button
              onClick={handleCopyToClipboard}
              disabled={isActionProcessing || isRateLimited || !currentEmailData}
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
            onClick={handleExtendTimer}
            disabled={isActionProcessing || isRateLimited}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#00BFFF]/50 bg-transparent px-4 py-2 font-medium text-[#00BFFF] button-glow-on-focus transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('extend')}
          >
            {isActionProcessing ? ( // Only isActionProcessing for extend
              <div className="spinner spinner-dark"></div>
            ) : (
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
              onClick={handleRefreshInbox}
              disabled={isActionProcessing || isRateLimited || !currentEmailData}
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
            onClick={() => selectedMessage && handleDeleteSingleMessage(selectedMessage.id)}
            disabled={isActionProcessing}
            className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-red-600 text-white text-base font-bold leading-normal tracking-wide button-glow-on-focus transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('deleteMessage')}
          >
            {isActionProcessing ? (
              <div className="spinner"></div>
            ) : (
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
      {isLoadingInitialMail ? (
        <div className="flex flex-col items-center justify-center flex-grow p-8">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-300 text-lg">
              {isRateLimited ? t('tempMailTooManyRequestsWithRetry', {delayInSeconds: String(Math.round(Math.min(60000, 2000 * Math.pow(2, retryAttempt - 1)))/1000)}) :
               t('loading') + ' ' + t('arTempmail') + '...'}
          </p>
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