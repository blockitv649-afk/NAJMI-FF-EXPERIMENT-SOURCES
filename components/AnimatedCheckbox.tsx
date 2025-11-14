
// components/AnimatedCheckbox.tsx
import React, { useState } from 'react';

interface AnimatedCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const AnimatedCheckbox: React.FC<AnimatedCheckboxProps> = ({ id, checked, onChange, disabled }) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div
      id={id}
      className={`custom-checkbox ${checked ? 'checked' : ''} ${isFocused ? 'focused' : ''}`}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }}
      role="checkbox"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      {/* Visual tick mark is handled by ::after in CSS */}
    </div>
  );
};

export default AnimatedCheckbox;