import React, { useState, useEffect } from 'react';
import { Note, Category, LocationSuggestion, Coordinates } from '../types';
import { parseNoteFromText, searchLocations } from '../services/geminiService';
import { SparklesIcon, XIcon } from './Icons';

interface NoteFormProps {
  onSave: (note: Omit<Note, 'id' | 'created_at' | 'isArchived' | 'user_id'>, id?: string) => void;
  onCancel: () => void;
  existingNote?: Note | null;
  categories: Category[];
  userLocation: Coordinates | null;
}

export const NoteForm: React.FC<NoteFormProps> = ({ onSave, onCancel, existingNote, categories, userLocation }) => {
  const [naturalInput, setNaturalInput] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  
  const [isParsing, setIsParsing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  // Debounce logic for location search
  useEffect(() => {
    if (!locationQuery.trim() || selectedLocation) {
      setLocationSuggestions([]);
      return;
    }

    const search = async () => {
        setIsSearching(true);
        try {
            const results = await searchLocations(locationQuery, userLocation);
            // Only update suggestions if the query hasn't changed
            setLocationSuggestions(results);
        } catch(err) {
            console.error("Location search failed", err);
            setError("Failed to search for locations.");
        } finally {
            setIsSearching(false);
        }
    };

    const debounceTimeout = setTimeout(() => {
        search();
    }, 500); // 500ms debounce delay

    return () => clearTimeout(debounceTimeout);
  }, [locationQuery, selectedLocation, userLocation]);


  useEffect(() => {
    if (existingNote) {
      setTitle(existingNote.title);
      setContent(existingNote.content);
      if (existingNote.location) {
        const suggestion: LocationSuggestion = {
            name: existingNote.location.name,
            address: '', // not stored
            coordinates: existingNote.location.coordinates,
            placeType: '' // not stored
        };
        setSelectedLocation(suggestion);
        setLocationQuery(existingNote.location.name);
      }
      setSelectedCategoryId(existingNote.category?.id);
    }
  }, [existingNote]);

  const handleParseText = async () => {
    if (!naturalInput.trim()) return;
    setIsParsing(true);
    setError('');
    try {
      const parsedData = await parseNoteFromText(naturalInput, userLocation);
      setTitle(parsedData.title || '');
      setContent(parsedData.content || '');
      if (parsedData.locationQuery) {
        setSelectedLocation(null); // Reset selected location to trigger a new search
        setLocationQuery(parsedData.locationQuery);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during parsing.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setSelectedLocation(suggestion);
    setLocationQuery(suggestion.name);
    setLocationSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }
    
    const selectedCategory = categories.find(c => c.id === selectedCategoryId);

    const newNoteData: Omit<Note, 'id' | 'created_at' | 'isArchived' | 'user_id'> = {
      title,
      content,
      category: selectedCategory,
      location: selectedLocation ? {
        name: selectedLocation.name,
        coordinates: selectedLocation.coordinates
      } : undefined,
    };
    onSave(newNoteData, existingNote?.id);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-20 flex justify-center items-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">{existingNote ? 'Edit Note' : 'Add New Note'}</h2>
            
            <div className="mb-4">
                <label htmlFor="natural-input" className="block text-sm font-medium text-gray-300 mb-2">Start with your idea</label>
                <div className="relative">
                    <textarea
                        id="natural-input"
                        value={naturalInput}
                        onChange={(e) => setNaturalInput(e.target.value)}
                        placeholder="e.g., 'remind me to buy milk at the grocery store near my current location'"
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-28"
                        rows={3}
                    />
                    <button onClick={handleParseText} disabled={isParsing || !naturalInput.trim()} className="absolute top-1/2 right-3 -translate-y-1/2 bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center">
                        <SparklesIcon className="w-5 h-5 mr-1.5"/>
                        {isParsing ? 'Parsing...' : 'Parse'}
                    </button>
                </div>
            </div>

            <hr className="border-gray-600 my-6" />

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                        <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" required/>
                    </div>
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">Content</label>
                        <textarea id="content" value={content} onChange={e => setContent(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" rows={4} required></textarea>
                    </div>
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                        <div className="relative">
                            <input type="text" id="location" value={locationQuery} onChange={e => {setLocationQuery(e.target.value); setSelectedLocation(null);}} placeholder="Search for a location..." className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
                            {locationQuery && !selectedLocation && (
                                <button type="button" onClick={() => {setLocationQuery(''); setLocationSuggestions([]);}} className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-white">
                                    <XIcon className="w-5 h-5"/>
                                </button>
                            )}
                        </div>
                        {isSearching && <p className="text-sm text-gray-400 mt-2">Searching...</p>}
                        {locationSuggestions.length > 0 && !selectedLocation && (
                            <ul className="bg-gray-700 border border-gray-600 rounded-md mt-2 max-h-48 overflow-y-auto">
                                {locationSuggestions.map((s, i) => (
                                    <li key={`${s.name}-${i}`} onClick={() => handleSelectSuggestion(s)} className="p-3 hover:bg-gray-600 cursor-pointer text-white">
                                        <p className="font-semibold">{s.name}</p>
                                        <p className="text-sm text-gray-400">{s.address}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                     <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                        <select id="category" value={selectedCategoryId || ''} onChange={e => setSelectedCategoryId(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="">No Category</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}

                <div className="flex justify-end gap-4 mt-8">
                    <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors">Cancel</button>
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Save Note</button>
                </div>
            </form>
        </div>
    </div>
  );
};