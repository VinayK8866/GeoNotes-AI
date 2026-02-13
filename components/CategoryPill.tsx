import React from 'react';
import { Category } from '../types';

interface CategoryPillProps {
  category: Category;
}

export const CategoryPill: React.FC<CategoryPillProps> = ({ category }) => {
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white whitespace-nowrap ${category.color}`}
    >
      {category.name}
    </span>
  );
};
