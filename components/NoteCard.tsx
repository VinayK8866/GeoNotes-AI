import React, { forwardRef } from 'react';
import { Note, Coordinates } from '../types';
import { getDistance } from '../utils/geolocation';
import { REMINDER_RADIUS_METERS } from '../constants';
import { MapPinIcon, TrashIcon, EditIcon, ArchiveBoxIcon, ArrowUpOnSquareIcon, ShareIcon } from './Icons';
import { CategoryPill } from './CategoryPill';

interface NoteCardProps {
  note: Note;
  userLocation: Coordinates | null;
  onArchive: (note: Note) => void;
  onUnarchive: (note: Note) => void;
  onDeletePermanently: (id: string) => void;
  onEdit: (note: Note) => void;
  onShare: (note: Note) => void;
  isArchivedView: boolean;
  isActive: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const getRelativeTime = (dateStr: string): string => {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const CATEGORY_COLORS: Record<string, string> = {
  'bg-blue-500': '#3b82f6',
  'bg-green-500': '#22c55e',
  'bg-yellow-500': '#eab308',
  'bg-purple-500': '#a855f7',
  'bg-red-500': '#ef4444',
  'bg-pink-500': '#ec4899',
  'bg-orange-500': '#f97316',
  'bg-teal-500': '#14b8a6',
};

export const NoteCard = forwardRef<HTMLDivElement, NoteCardProps>(({
  note, userLocation, onArchive, onUnarchive, onDeletePermanently, onEdit, onShare,
  isArchivedView, isActive, onMouseEnter, onMouseLeave
}, ref) => {
  const distance = note.location && userLocation ? getDistance(note.location.coordinates, userLocation) : null;
  const isNearby = distance !== null && distance <= REMINDER_RADIUS_METERS;
  const stripeColor = note.category ? (CATEGORY_COLORS[note.category.color] || '#6366f1') : undefined;

  return (
    <div
      ref={ref}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`
        premium-card group p-5 flex flex-col h-full cursor-default
        ${stripeColor ? 'accent-stripe' : ''}
        ${isActive
          ? 'ring-2 ring-indigo-400/50 dark:ring-indigo-500/40 shadow-lg shadow-indigo-500/10'
          : isNearby
            ? 'ring-1 ring-emerald-300 dark:ring-emerald-600'
            : ''
        }
      `}
      style={stripeColor ? { '--stripe-color': stripeColor } as React.CSSProperties : undefined}
    >
      {/* Header: Title + Actions */}
      <div className="flex justify-between items-start gap-2 mb-2.5 pl-2">
        <h3 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 flex-1">
          {note.title}
        </h3>
        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button onClick={() => onEdit(note)} className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Edit">
            <EditIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onShare(note)} className="p-1.5 rounded-md text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors" title="Share">
            <ShareIcon className="w-3.5 h-3.5" />
          </button>
          {isArchivedView ? (
            <>
              <button onClick={() => onUnarchive(note)} className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" title="Unarchive">
                <ArrowUpOnSquareIcon className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDeletePermanently(note.id)} className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete permanently">
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button onClick={() => onArchive(note)} className="p-1.5 rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Archive">
              <ArchiveBoxIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow mb-3 pl-2">
        <p className="text-xs text-slate-500 dark:text-slate-500 whitespace-pre-wrap line-clamp-3 leading-relaxed">
          {note.content}
        </p>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700/40 flex items-center justify-between gap-2 pl-2">
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-500 min-w-0">
          {note.category && <CategoryPill category={note.category} />}
          {note.location && (
            <span className="flex items-center gap-0.5 truncate max-w-[100px]" title={note.location.name}>
              <MapPinIcon className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{note.location.name}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {distance !== null && (
            <span className={`text-[10px] font-semibold ${isNearby ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
              {distance > 1000 ? `${(distance / 1000).toFixed(1)}km` : `${Math.round(distance)}m`}
            </span>
          )}
          <span className="text-[10px] text-slate-500 dark:text-slate-500">
            {getRelativeTime(note.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
});