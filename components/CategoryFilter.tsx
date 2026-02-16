import React from 'react';
import { Category } from '../types';

interface CategoryFilterProps {
  categories: Category[];
  activeFilter: string | null;
  onSelectFilter: (categoryId: string | null) => void;
}

const CATEGORY_DOT_COLORS: Record<string, string> = {
  'bg-blue-500': '#3b82f6',
  'bg-green-500': '#22c55e',
  'bg-yellow-500': '#eab308',
  'bg-purple-500': '#a855f7',
  'bg-red-500': '#ef4444',
  'bg-pink-500': '#ec4899',
  'bg-orange-500': '#f97316',
  'bg-teal-500': '#14b8a6',
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories, activeFilter, onSelectFilter }) => {
  if (categories.length === 0) return null;

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => onSelectFilter(null)}
        className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200 whitespace-nowrap ${activeFilter === null
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1a2540] hover:text-slate-700 dark:hover:text-slate-200'
          }`}
      >
        All
      </button>
      {categories.map(category => {
        const dotColor = CATEGORY_DOT_COLORS[category.color] || '#6366f1';
        const isActive = activeFilter === category.id;
        return (
          <button
            key={category.id}
            onClick={() => onSelectFilter(category.id)}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${isActive
                ? 'shadow-sm text-white'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1a2540] hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            style={isActive ? { backgroundColor: dotColor, boxShadow: `0 2px 8px ${dotColor}40` } : undefined}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.8)' : dotColor }} />
            {category.name}
          </button>
        );
      })}
    </div>
  );
};