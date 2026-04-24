import React from 'react';

const pulse = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

export const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
    <div className={`h-4 w-3/4 ${pulse}`} />
    <div className={`h-3 w-1/2 ${pulse}`} />
    <div className={`h-3 w-full ${pulse}`} />
    <div className={`h-3 w-2/3 ${pulse}`} />
  </div>
);

export const SkeletonRow = () => (
  <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
    <div className={`h-10 w-10 rounded-full ${pulse}`} />
    <div className="flex-1 space-y-2">
      <div className={`h-4 w-1/3 ${pulse}`} />
      <div className={`h-3 w-2/3 ${pulse}`} />
    </div>
    <div className={`h-6 w-16 ${pulse}`} />
  </div>
);

export const SkeletonGrid = ({ count = 6 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div className="grid gap-0">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className={`h-4 flex-1 ${pulse}`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);
