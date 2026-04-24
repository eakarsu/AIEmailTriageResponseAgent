import React from 'react';
import { getPasswordStrength } from '../utils/validation';

const PasswordStrengthMeter = ({ password }) => {
  const { score, label, color } = getPasswordStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= score ? color : 'bg-gray-200 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
      {label && (
        <p className={`text-xs ${score <= 2 ? 'text-red-500' : score <= 3 ? 'text-yellow-500' : 'text-green-500'}`}>
          {label}
        </p>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
