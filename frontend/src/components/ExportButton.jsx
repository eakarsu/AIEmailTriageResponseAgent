import React from 'react';
import { Download } from 'lucide-react';

const ExportButton = ({ onClick, label = 'Export CSV' }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
    >
      <Download className="w-4 h-4" />
      {label}
    </button>
  );
};

export default ExportButton;
