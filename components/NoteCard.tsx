import React from 'react';
import { Note, Coordinates } from '../types';
import { getDistance } from '../utils/geolocation';
import { REMINDER_RADIUS_METERS } from '../constants';
import { MapPinIcon, TrashIcon, EditIcon } from './Icons';
import { CategoryPill } from './CategoryPill';

interface NoteCardProps {
  note: Note;
  userLocation: Coordinates | null;
  onDelete: (id: string) => void;
  onEdit: (note: Note) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, userLocation, onDelete, onEdit }) => {
  const distance = note.location && userLocation ? getDistance(note.location.coordinates, userLocation) : null;
  const isNearby = distance !== null && distance <= REMINDER_RADIUS_METERS;

  return (
    <div className={`bg-gray-800 rounded-lg shadow-md p-5 border-l-4 transition-all duration-300 ${isNearby ? 'border-green-400 scale-105 shadow-lg shadow-green-400/10' : 'border-gray-700'}`}>
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-bold text-white mb-2">{note.title}</h3>
        <div className="flex items-center space-x-2">
            <button onClick={() => onEdit(note)} className="text-gray-400 hover:text-white transition-colors"><EditIcon className="w-5 h-5" /></button>
            <button onClick={() => onDelete(note.id)} className="text-gray-400 hover:text-red-500 transition-colors"><TrashIcon className="w-5 h-5" /></button>
        </div>
      </div>
      <p className="text-gray-300 mb-4 whitespace-pre-wrap">{note.content}</p>
      
      {note.location && (
        <div className="flex items-center text-sm text-gray-400 mb-4">
          <MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{note.location.name}</span>
        </div>
      )}

      <div className="flex justify-between items-end mt-auto">
        <div className="flex-shrink-0">
          {note.category && <CategoryPill category={note.category} />}
        </div>
        {distance !== null && (
            <div className={`text-sm font-medium text-right ml-2 ${isNearby ? 'text-green-400' : 'text-gray-400'}`}>
              {distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`} away
            </div>
        )}
      </div>
    </div>
  );
};
