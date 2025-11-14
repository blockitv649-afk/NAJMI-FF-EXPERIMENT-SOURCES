
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';

interface ChatMessageProps {
  message: ChatMessage;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  // Updated colors: User messages yellow (#FFCC00), AI messages deep black (#0A0A0A)
  const messageClasses = isUser
    ? 'bg-[#FFCC00] text-gray-900 self-end rounded-br-none shadow-lg' // User: Yellow background, dark text, shadow
    : 'bg-[#0A0A0A] text-gray-100 self-start rounded-bl-none shadow-lg'; // AI: Deep black background, light text, shadow
  const containerClasses = isUser ? 'justify-end' : 'justify-start';

  return (
    <div className={`flex w-full mb-4 ${containerClasses}`}>
      <div className={`max-w-xl p-4 rounded-lg shadow-md flex flex-col ${messageClasses}`}>
        {message.imageData && (
          <img
            src={`data:${message.imageData.mimeType};base64,${message.imageData.base64}`}
            alt="User uploaded"
            className="max-w-full h-auto rounded-md mb-2 object-contain"
            style={{ maxHeight: '200px' }} // Limit image height
          />
        )}
        <ReactMarkdown className="markdown-content text-sm sm:text-base">
          {message.text}
        </ReactMarkdown>
        <span className="text-xs text-opacity-75 mt-2 self-end">
          {message.timestamp.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;