
import React, { useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { fileToBase64 } from '../utils/imageUtils'; // Import the utility

interface ChatInputProps {
  onSendMessage: (message: string, imageData?: { base64: string; mimeType: string; }) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ base64: string; mimeType: string; } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      try {
        const base64 = await fileToBase64(file);
        setImageData({ base64, mimeType: file.type });
      } catch (error) {
        console.error("Error converting file to base64:", error);
        // Handle error, e.g., clear image or show message
        handleRemoveImage();
      }
    } else {
      handleRemoveImage(); // Clear if not an image or no file selected
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
    setImageData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || imageData) && !isLoading) {
      onSendMessage(input, imageData || undefined);
      setInput('');
      handleRemoveImage(); // Clear image after sending
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col p-4 bg-gray-900 border-t border-gray-700">
      {imagePreviewUrl && (
        <div className="mb-4 p-2 border border-gray-700 rounded-lg bg-gray-800 flex flex-col items-center">
          <p className="text-gray-300 text-sm mb-2">{t('imagePreview')}</p>
          <img src={imagePreviewUrl} alt="Preview" className="max-w-full h-auto max-h-48 rounded-md object-contain mb-2" />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm button-glow-on-focus"
            aria-label={t('removeImage')}
          >
            {t('removeImage')}
          </button>
        </div>
      )}

      <div className="flex">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden" // Hide the actual file input
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-3 mr-2 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FFCC00] disabled:bg-gray-600 disabled:text-gray-500 flex items-center justify-center transition-colors duration-200 ease-in-out button-glow-on-focus"
          disabled={isLoading}
          aria-label={t('attachImage')}
          title={t('attachImage')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.5 12h.01M12 10.5V16m-4.5-4.5h9M12 21a9 9 0 110-18 9 9 0 010 18z"></path>
          </svg>
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isLoading ? t('aiIsThinking') : t('typeYourMessage')}
          className="flex-grow p-3 rounded-l-lg bg-gray-800 border border-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FFCC00] placeholder-gray-400 disabled:bg-gray-700 disabled:text-gray-500 button-glow-on-focus"
          disabled={isLoading}
          aria-label="Chat input"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#FFCC00] disabled:bg-blue-800 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200 ease-in-out button-glow-on-focus"
          disabled={isLoading || (!input.trim() && !imageData)}
          aria-label="Send message"
        >
          {isLoading ? (
            <div className="loading-spinner"></div>
          ) : (
            <span>{t('send')}</span>
          )}
        </button>
      </div>
    </form>
  );
};

export default ChatInput;