
// components/FloatingLabelInput.tsx
import React from 'react';

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  error?: string;
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  error,
  ...props
}) => {
  return (
    <div className="floating-label-group">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder=" " // Required for :placeholder-shown to work correctly with floating labels
        className={`floating-label-input input-glow-on-focus ${error ? 'border-red-500' : ''}`}
        {...props}
      />
      <label htmlFor={id} className="floating-label">
        {label}
      </label>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default FloatingLabelInput;