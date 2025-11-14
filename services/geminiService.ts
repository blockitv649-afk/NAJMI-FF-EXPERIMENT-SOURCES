
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { translations } from '../utils/translations';
import { SourceFileInfo as SharedSourceFileInfo } from '../types'; // Import from types

type Language = 'en' | 'hi' | 'bn';

interface SendMessageStreamResult {
  stream: AsyncGenerator<string>;
  cancel: () => void;
}

// Internal interface for mock admin files (now dynamic)
interface MockAdminFiles {
  [code: string]: Omit<SharedSourceFileInfo, 'code'>; // Omit code from here as key is code
}

// Function to load mock admin files from localStorage
const loadMockAdminFiles = (): MockAdminFiles => {
  const filesJson = localStorage.getItem('mockAdminFiles');
  return filesJson ? JSON.parse(filesJson) : {
    '12345678': {
      fileName: 'Project Alpha Report - Q3 2024.pdf',
      downloadUrl: 'https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&cad=rja&uact=8&ved=2ahUKEwjG_4_Jj9mGAxW8c_UHHc-aDqwQFnoECCAQAQ&url=https%3A%2F%2Fwww.africau.edu%2Fimages%2Fdefault%2Fsample.pdf&usg=AOvVaw2B1kIe1hS_Q5r_h_m_o1A', // Sample PDF
    },
    '87654321': {
      fileName: 'Marketing Strategy - Annual Plan 2025.docx',
      downloadUrl: 'https://file-examples.com/storage/fe342127276360f0c0340c1/2017/02/file-sample_100kB.docx', // Sample DOCX
    },
    '00001111': {
      fileName: 'User Manual - Version 2.0.zip',
      downloadUrl: 'https://file-examples.com/storage/fe342127276360f0c0340c1/2017/02/zip_10MB.zip', // Sample ZIP
    },
    // Add more mock files as needed by the admin
  };
};

// Function to save mock admin files to localStorage
const saveMockAdminFiles = (files: MockAdminFiles) => {
  localStorage.setItem('mockAdminFiles', JSON.stringify(files));
};

let mockAdminFiles: MockAdminFiles = loadMockAdminFiles();


export const geminiService = {
  /**
   * Sends a message to the Gemini model and returns a stream of text chunks.
   * @param prompt The user's prompt.
   * @param language The desired response language for the AI.
   * @param imageData Optional image data to send with the prompt.
   * @returns An object containing an async generator for text chunks and a cancel function.
   */
  sendMessageStream: async (prompt: string, language: string, imageData?: { base64: string; mimeType: string; }): Promise<SendMessageStreamResult> => {
    // CRITICAL: Create a new GoogleGenAI instance right before making an API call
    // to ensure it always uses the most up-to-date API key from the dialog.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let abortController = new AbortController();

    let systemInstruction = '';
    if (language === 'hi') {
      systemInstruction = 'आप एक सहायक सहायक हैं और हिंदी में उत्तर देते हैं।';
    } else if (language === 'bn') {
      systemInstruction = 'আপনি একজন সহায়ক সহকারী এবং বাংলায় উত্তর দেন।';
    } else {
      systemInstruction = 'You are a helpful assistant and respond in English.';
    }

    const contents: any[] = [{ text: prompt }];
    if (imageData) {
      contents.unshift({ // Add image data at the beginning
        inlineData: {
          mimeType: imageData.mimeType,
          data: imageData.base64,
        },
      });
    }

    const streamGenerator = (async function* () {
      try {
        // Correct usage: pass model name directly in the generateContentStream call
        const response: AsyncIterable<GenerateContentResponse> = await ai.models.generateContentStream({
          model: 'gemini-2.5-flash', // Use gemini-2.5-flash for multimodal support
          contents: [{ parts: contents }],
          config: {
            systemInstruction: systemInstruction,
          }
        }, { signal: abortController.signal });

        for await (const chunk of response) {
          if (chunk.text) {
            yield chunk.text;
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Gemini stream aborted.');
        } else {
          console.error('Gemini API Error:', error);
          if (error.message && error.message.includes("Requested entity was not found.")) {
            // Assume API key issue, prompt user to re-select
            await window.aistudio.openSelectKey();
          }
          throw new Error(`${translations.failedToGetResponse[language]} ${error.message || translations.unknownError[language]}`);
        }
      }
    })();

    const cancel = () => {
      abortController.abort();
    };

    return { stream: streamGenerator, cancel };
  },

  /**
   * Retrieves file information from a mock admin database based on a 8-digit source code.
   * This simulates an "admin panel" where files are associated with specific codes.
   * @param sourceCode The 8-digit code for the source file.
   * @returns A promise resolving to SourceFileInfo if found, or null otherwise.
   */
  getAdminSourceFile: async (sourceCode: string): Promise<SharedSourceFileInfo | null> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const files = loadMockAdminFiles(); // Load current state
    if (files[sourceCode]) {
      return { code: sourceCode, ...files[sourceCode] };
    }
    return null;
  },

  /**
   * Retrieves all source files from the mock admin database.
   * @returns A promise resolving to an array of SourceFileInfo.
   */
  getAdminSourceFiles: async (): Promise<SharedSourceFileInfo[]> => {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
    const files = loadMockAdminFiles();
    return Object.entries(files).map(([code, info]) => ({ code, ...info }));
  },

  /**
   * Adds or updates a source file in the mock admin database.
   * @param fileInfo The SourceFileInfo to add or update.
   * @returns A promise resolving when the operation is complete.
   */
  updateAdminSourceFile: async (fileInfo: SharedSourceFileInfo): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    const files = loadMockAdminFiles();
    files[fileInfo.code] = {
      fileName: fileInfo.fileName,
      downloadUrl: fileInfo.downloadUrl,
    };
    saveMockAdminFiles(files);
  },

  /**
   * Checks if an API key has been selected by the user.
   * If not, prompts the user to select one.
   * @returns true if an API key is selected or successfully selected, false otherwise.
   */
  ensureApiKey: async (): Promise<boolean> => {
    if (typeof window.aistudio === 'undefined' || !window.aistudio.hasSelectedApiKey || !window.aistudio.openSelectKey) {
      console.warn("window.aistudio object or its methods are not available.");
      // In a real scenario, you might want to show a fallback message or disable functionality.
      // For this example, we'll proceed assuming an API_KEY might be set via env var for testing.
      return !!process.env.API_KEY;
    }

    let hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      // Prompt user to select an API key
      await window.aistudio.openSelectKey();
      // Assume selection was successful to avoid race conditions.
      // The API call itself will re-check if needed.
      return true;
    }
    return true;
  }
};
