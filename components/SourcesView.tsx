
import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
// Fix: Import SourceFileInfo directly from '../types' as it is defined there.
import { SourceFileInfo } from '../types';

const SourcesView: React.FC = () => {
  const { language, t } = useLanguage();
  const [sourceCode, setSourceCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileInfo, setFileInfo] = useState<SourceFileInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRequestFile = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setFileInfo(null);

    // Validate 8-digit numeric input
    if (!/^\d{8}$/.test(sourceCode)) {
      setErrorMessage(t('pleaseEnter8Digits'));
      return;
    }

    setIsLoading(true);
    try {
      const info = await geminiService.getAdminSourceFile(sourceCode);
      if (info) {
        setFileInfo(info);
        setSuccessMessage(t('fileRetrievalSuccessful'));
      } else {
        setErrorMessage(t('codeDoesNotExist'));
      }
    } catch (err: any) {
      console.error('Error requesting source file:', err);
      setErrorMessage(err.message || t('failedToGetSourceInfo'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (fileInfo?.downloadUrl) {
      const link = document.createElement('a');
      link.href = fileInfo.downloadUrl;
      link.download = fileInfo.fileName || `source_${sourceCode}.pdf`; // Fallback file name
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-gradient-to-br from-green-900 to-teal-900 p-8 rounded-xl shadow-lg border border-gray-700 text-center flex flex-col items-center animate-subtlePulse">
      <h2 className="text-3xl font-bold text-gray-100 mb-6 text-center">{t('sourcesTitle')}</h2>
      <p className="text-gray-200 mb-8 text-center">
        {t('enter8DigitCode')}
      </p>

      <div className="flex flex-col gap-4 mb-8 w-full">
        <label htmlFor="source-code" className="sr-only">Source Code</label>
        <input
          id="source-code"
          type="text"
          inputMode="numeric" // Suggest numeric keyboard on mobile
          pattern="\d{8}"      // HTML5 pattern for 8 digits
          maxLength={8}       // Max length 8 characters
          value={sourceCode}
          onChange={(e) => setSourceCode(e.target.value)}
          placeholder={isLoading ? t('requestingFile') : t('enter8DigitCodePlaceholder')}
          className="p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FFCC00] placeholder-gray-400 disabled:bg-gray-600 disabled:text-gray-500 button-glow-on-focus"
          disabled={isLoading}
          aria-label="Source code input"
        />
        <button
          onClick={handleRequestFile}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#FFCC00] disabled:bg-blue-800 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200 ease-in-out button-glow-on-focus"
          disabled={isLoading}
          aria-label="Request file"
        >
          {isLoading ? (
            <div className="loading-spinner"></div>
          ) : (
            <span>{t('requestFile')}</span>
          )}
        </button>
      </div>

      {errorMessage && (
        <div className="bg-red-800 text-white p-4 rounded-lg mt-4 text-sm w-full" role="alert">
          <p>{t('errorOccurred')} {errorMessage}</p>
          {errorMessage.includes(t('failedToGetSourceInfo')) && (
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
          )}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-700 text-white p-4 rounded-lg mt-4 text-sm w-full" role="status">
          <p>{t('successful')} {successMessage}</p>
        </div>
      )}

      {fileInfo && (
        <div className="bg-gray-700 p-6 rounded-lg shadow-inner mt-8 w-full">
          <h3 className="text-xl font-semibold text-gray-200 mb-4">{t('fileInformation')}</h3>
          <p className="text-gray-300 mb-2">
            <span className="font-medium">{t('fileName')}</span> {fileInfo.fileName}
          </p>
          <p className="text-gray-300 mb-4 break-words">
            <span className="font-medium">{t('downloadUrl')}</span>{' '}
            <a href={fileInfo.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              {fileInfo.downloadUrl}
            </a>
          </p>
          <button
            onClick={handleDownload}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-[#FFCC00] transition-colors duration-200 ease-in-out button-glow-on-focus"
            aria-label={`Download ${fileInfo.fileName}`}
          >
            {t('downloadFile')}
          </button>
        </div>
      )}
    </div>
  );
};

export default SourcesView;
