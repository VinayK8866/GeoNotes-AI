import React from 'react';
import { Category } from '../types';

interface CategoryFilterProps {
  categories: Category[];
  activeFilter: string | null;
  onSelectFilter: (categoryId: string | null) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories, activeFilter, onSelectFilter }) => {
  if (categories.length === 0) {
      return null;
  }
  
  const buttonClass = (isActive: boolean) => `
    px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200
    ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}
  `;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => onSelectFilter(null)} className={buttonClass(activeFilter === null)}>
        All
      </button>
      {categories.map(category => (
        <button key={category.id} onClick={() => onSelectFilter(category.id)} className={buttonClass(activeFilter === category.id)}>
          {category.name}
        </button>
      ))}
    </div>
  );
};