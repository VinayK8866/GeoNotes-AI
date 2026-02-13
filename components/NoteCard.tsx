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

export const NoteCard = forwardRef<HTMLDivElement, NoteCardProps>(({ note, userLocation, onArchive, onUnarchive, onDeletePermanently, onEdit, onShare, isArchivedView, isActive, onMouseEnter, onMouseLeave }, ref) => {
  const distance = note.location && userLocation ? getDistance(note.location.coordinates, userLocation) : null;
  const isNearby = distance !== null && distance <= REMINDER_RADIUS_METERS;

  const cardClasses = `
    bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 border-l-4 transition-all duration-300 flex flex-col
    ${isNearby ? 'border-green-400 shadow-lg shadow-green-400/10' : 'border-gray-200 dark:border-gray-700'}
    ${isActive ? 'scale-105 border-indigo-500 dark:border-indigo-400 shadow-indigo-500/20' : ''}
  `;

  const canShare = 'share' in navigator;

  return (
    <div
      className={cardClasses}
      ref={ref}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white pr-2">{note.title}</h3>
        <div className="flex items-center space-x-1 flex-shrink-0 -mr-2">
          <button onClick={() => onEdit(note)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Edit note"><EditIcon className="w-5 h-5" /></button>
          {canShare && <button onClick={() => onShare(note)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Share note"><ShareIcon className="w-5 h-5" /></button>}
          {isArchivedView ? (
            <>
              <button onClick={() => onUnarchive(note)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Unarchive note"><ArrowUpOnSquareIcon className="w-5 h-5" /></button>
              <button onClick={() => onDeletePermanently(note.id)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Delete permanently"><TrashIcon className="w-5 h-5" /></button>
            </>
          ) : (
            <button onClick={() => onArchive(note)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Archive note"><ArchiveBoxIcon className="w-5 h-5" /></button>
          )}
        </div>
      </div>
      <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap flex-grow">{note.content}</p>

      {note.location && (
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-4">
          <MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{note.location.name}</span>
        </div>
      )}

      <div className="flex justify-between items-end mt-auto pt-2">
        <div className="flex-shrink-0">
          {note.category && <CategoryPill category={note.category} />}
        </div>
        {distance !== null && (
          <div className={`text-sm font-medium text-right ml-2 ${isNearby ? 'text-green-500 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`} away
          </div>
        )}
      </div>
    </div>
  );
});