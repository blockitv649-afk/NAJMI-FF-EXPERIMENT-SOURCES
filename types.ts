
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageData?: { base64: string; mimeType: string; }; // New field for image data
}

// New: User interface for authentication
export interface User {
  id: string;
  fullName: string;
  email: string;
}

// New: Interface for Source File information (used by SourcesView and AdminDashboardView)
export interface SourceFileInfo {
  code: string; // 8-digit code
  fileName: string;
  downloadUrl: string;
}
