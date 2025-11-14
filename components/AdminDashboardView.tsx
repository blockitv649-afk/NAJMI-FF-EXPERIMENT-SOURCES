
// components/AdminDashboardView.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import FloatingLabelInput from './FloatingLabelInput';
import { geminiService } from '../services/geminiService';
// Fix: Import SourceFileInfo directly from '../types' as it is defined there.
import { SourceFileInfo } from '../types';

interface AdminDashboardViewProps {
  onAdminLogout: () => void;
}

const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onAdminLogout }) => {
  const { t } = useLanguage();
  const { isLoading: authLoading, adminLogout } = useAuth(); // Use adminLogout from auth context

  const [code, setCode] = useState('');
  const [fileName, setFileName] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentFiles, setCurrentFiles] = useState<SourceFileInfo[]>([]);
  const [isUpdatingFiles, setIsUpdatingFiles] = useState(false);

  // Load files on component mount and whenever a file is updated
  useEffect(() => {
    const loadFiles = async () => {
      setIsUpdatingFiles(true);
      try {
        const files = await geminiService.getAdminSourceFiles();
        setCurrentFiles(files);
      } catch (err) {
        console.error("Failed to load admin files:", err);
        setFormError(t('unknownError'));
      } finally {
        setIsUpdatingFiles(false);
      }
    };
    loadFiles();
  }, [successMessage, t]); // Reload when success message changes (implies update)


  const handleAddUpdateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!code || !fileName || !downloadUrl) {
      setFormError(t('allFieldsRequired'));
      return;
    }

    if (!/^\d{8}$/.test(code)) {
      setFormError(t('invalidSourceCodeFormat'));
      return;
    }

    try {
      new URL(downloadUrl); // Validate URL format
    } catch (_) {
      setFormError(t('invalidUrlFormat'));
      return;
    }

    setIsUpdatingFiles(true);
    try {
      await geminiService.updateAdminSourceFile({ code, fileName, downloadUrl });
      setSuccessMessage(t('fileAddedSuccessfully'));
      setCode('');
      setFileName('');
      setDownloadUrl('');
      // Files will reload due to successMessage dependency in useEffect
    } catch (err: any) {
      console.error("Error updating file:", err);
      setFormError(err.message || t('unknownError'));
    } finally {
      setIsUpdatingFiles(false);
    }
  };

  return (
    <div className="w-full max-w-3xl p-8 rounded-xl shadow-lg border border-gray-700 text-center min-h-[500px] flex flex-col items-center
                    bg-gradient-to-br from-indigo-900 via-gray-900 to-purple-900 animate-fadeInSlideUp">
      <h2 className="text-4xl font-bold mb-6 animate-neon-glow-title text-center leading-tight">
        {t('adminDashboard')}
      </h2>
      <p className="text-gray-300 mb-6">{t('adminPanelDescription')}</p>

      {/* Add/Update Source File Form */}
      <div className="glassmorphism-bg p-6 rounded-xl shadow-xl border border-gray-800 w-full mb-8">
        <h3 className="text-2xl font-semibold text-gray-100 mb-4">{t('addNewSourceFile')}</h3>
        <form onSubmit={handleAddUpdateFile} className="flex flex-col gap-4">
          <FloatingLabelInput
            id="source-code-admin"
            type="text"
            inputMode="numeric"
            pattern="\d{8}"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            label={t('sourceCodePlaceholder')}
            disabled={isUpdatingFiles}
          />
          <FloatingLabelInput
            id="file-name-admin"
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            label={t('fileNamePlaceholder')}
            disabled={isUpdatingFiles}
          />
          <FloatingLabelInput
            id="download-url-admin"
            type="url"
            value={downloadUrl}
            onChange={(e) => setDownloadUrl(e.target.value)}
            label={t('downloadUrlPlaceholder')}
            disabled={isUpdatingFiles}
          />

          {formError && (
            <p className="text-red-500 text-sm text-center">{formError}</p>
          )}
          {successMessage && (
            <p className="text-green-500 text-sm text-center animate-fade-in">{successMessage}</p>
          )}

          <button
            type="submit"
            className="w-full relative px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md overflow-hidden transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
                       before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-700 before:via-cyan-600 before:to-blue-800 before:opacity-0 before:hover:opacity-100 before:transition-opacity before:duration-300 before:ease-in-out"
            disabled={isUpdatingFiles}
          >
            {isUpdatingFiles ? (
              <div className="loading-spinner mx-auto"></div>
            ) : (
              <span className="relative z-10">{t('addUpdateFile')}</span>
            )}
          </button>
        </form>
      </div>

      {/* Current Source Files List */}
      <div className="glassmorphism-bg p-6 rounded-xl shadow-xl border border-gray-800 w-full">
        <h3 className="text-2xl font-semibold text-gray-100 mb-4">{t('currentSourceFiles')}</h3>
        {isUpdatingFiles ? (
            <div className="loading-spinner mx-auto my-8"></div>
        ) : currentFiles.length > 0 ? (
          <ul className="text-left space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
            {currentFiles.map((file) => (
              <li key={file.code} className="bg-gray-800 bg-opacity-50 p-3 rounded-lg border border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-yellow-400 font-bold text-lg mb-1">{file.fileName}</p>
                  <p className="text-gray-300 text-sm">
                    {t('sourceCodePlaceholder')}: <span className="font-mono">{file.code}</span>
                  </p>
                  <p className="text-blue-400 text-sm break-words">
                    {t('downloadUrl')}:{' '}
                    <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {file.downloadUrl}
                    </a>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">{t('noFilesFound')}</p>
        )}
      </div>

      {/* Admin Logout Button */}
      <button
        onClick={adminLogout}
        className="mt-8 relative px-8 py-4 bg-red-600 text-white font-semibold rounded-lg shadow-md overflow-hidden transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed
                   before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-br before:from-red-700 before:via-pink-600 before:to-red-800 before:opacity-0 before:hover:opacity-100 before:transition-opacity before:duration-300 before:ease-in-out"
        disabled={authLoading}
      >
        <span className="relative z-10 flex items-center justify-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
          {t('adminLogout')}
        </span>
      </button>
    </div>
  );
};

export default AdminDashboardView;
