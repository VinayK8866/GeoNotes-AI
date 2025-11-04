import React, { useState, useEffect } from 'react';
import { Note, Category, LocationSuggestion, Coordinates } from '../types';
import { suggestLocations, categorizeNote } from '../services/geminiService';
import { useDebounce } from '../hooks/useDebounce';
import { CloseIcon, MapPinIcon, SpinnerIcon, AiIcon } from './Icons';

interface NoteFormProps {
  noteToEdit: Note | null;
  onSave: (note: Note) => void;
  onCancel: () => void;
  categories: Category[];
  userLocation: Coordinates | null;
}

const TITLE_MAX_LENGTH = 150;
const CONTENT_MAX_LENGTH = 10000;

export const NoteForm: React.FC<NoteFormProps> = ({ noteToEdit, onSave, onCancel, categories, userLocation }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [locationSearch, setLocationSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; coordinates: Coordinates } | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

  const debouncedSearchTerm = useDebounce(locationSearch, 500);

  const validateForm = () => {
    const newErrors: { title?: string; content?: string } = {};

    if (!title.trim()) {
        newErrors.title = 'Title is required.';
    } else if (title.trim().length > TITLE_MAX_LENGTH) {
        newErrors.title = `Title must be ${TITLE_MAX_LENGTH} characters or less.`;
    }

    if (content.length > CONTENT_MAX_LENGTH) {
        newErrors.content = `Content must be ${CONTENT_MAX_LENGTH} characters or less.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (noteToEdit) {
      setTitle(noteToEdit.title);
      setContent(noteToEdit.content);
      setCategoryId(noteToEdit.category?.id);
      setSelectedLocation(noteToEdit.location || null);
      setLocationSearch(noteToEdit.location?.name || '');
    }
  }, [noteToEdit]);

  useEffect(() => {
    if (debouncedSearchTerm.trim().length > 2 && userLocation) {
      const fetchSuggestions = async () => {
        setIsSearching(true);
        setLocationSuggestions([]);
        try {
          const suggestions = await suggestLocations(debouncedSearchTerm, userLocation);
          setLocationSuggestions(suggestions);
        } catch (error) {
          console.error(error);
          // TODO: Show an error to the user
        } finally {
          setIsSearching(false);
        }
      };
      fetchSuggestions();
    } else {
      setLocationSuggestions([]);
    }
  }, [debouncedSearchTerm, userLocation]);

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setSelectedLocation({
      name: suggestion.name,
      coordinates: suggestion.coordinates,
    });
    setLocationSearch(suggestion.name);
    setLocationSuggestions([]);
  };

  const handleClearLocation = () => {
    setSelectedLocation(null);
    setLocationSearch('');
    setLocationSuggestions([]);
  };

  const handleAiCategorize = async () => {
    if (!title && !content) return;
    setIsCategorizing(true);
    try {
        const category = await categorizeNote(title, content, categories);
        if (category) {
            setCategoryId(category.id);
        }
    } catch (error) {
        console.error("Failed to categorize note with AI", error);
    } finally {
        setIsCategorizing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
        return;
    }

    const selectedCategory = categories.find(c => c.id === categoryId);

    const noteData: Note = {
      id: noteToEdit?.id || new Date().toISOString() + Math.random(),
      title: title.trim(),
      content,
      category: selectedCategory,
      location: selectedLocation || undefined,
      created_at: noteToEdit?.created_at || new Date().toISOString(),
      isArchived: noteToEdit?.isArchived || false,
    };
    onSave(noteData);
  };

  const isFormValid = validateForm; // Re-check on each render

  const formTitle = noteToEdit ? 'Edit Note' : 'Add New Note';

  return (
    <div className="fixed inset-0 bg-black/60 z-20 flex justify-center items-center p-4 animate-fade-in">
        <style>{`
            @keyframes fade-in {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }
            .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        `}</style>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">{formTitle}</h2>
              <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Title</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full bg-gray-700 text-white rounded-md ${errors.title ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'}`}
                required
              />
              <div className="flex justify-between items-center mt-1">
                {errors.title ? <p className="text-sm text-red-400">{errors.title}</p> : <div></div>}
                <p className={`text-sm ml-auto ${title.trim().length > TITLE_MAX_LENGTH ? 'text-red-400' : 'text-gray-400'}`}>
                    {title.trim().length} / {TITLE_MAX_LENGTH}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-1">Content</label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className={`w-full bg-gray-700 text-white rounded-md ${errors.content ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'}`}
              />
              <div className="flex justify-between items-center mt-1">
                {errors.content ? <p className="text-sm text-red-400">{errors.content}</p> : <div></div>}
                <p className={`text-sm ml-auto ${content.length > CONTENT_MAX_LENGTH ? 'text-red-400' : 'text-gray-400'}`}>
                    {content.length} / {CONTENT_MAX_LENGTH}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <div className="flex items-center gap-2">
                    <select
                        id="category"
                        value={categoryId || ''}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="flex-grow w-full bg-gray-700 text-white rounded-md border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="">No Category</option>
                        {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <button 
                        type="button" 
                        onClick={handleAiCategorize} 
                        disabled={isCategorizing || categories.length === 0}
                        title="Suggest category with AI"
                        className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                        {isCategorizing ? <SpinnerIcon className="w-5 h-5 animate-spin"/> : <AiIcon className="w-5 h-5"/>}
                    </button>
                </div>
              </div>
              
              <div className="relative">
                <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                <div className="relative">
                  <MapPinIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="location"
                    value={locationSearch}
                    onChange={(e) => {
                      setLocationSearch(e.target.value);
                      if (selectedLocation) setSelectedLocation(null);
                    }}
                    placeholder="Search for a location with AI..."
                    className="w-full bg-gray-700 text-white rounded-md border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 pl-10"
                    disabled={!userLocation}
                  />
                  {isSearching && <SpinnerIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />}
                  {selectedLocation && (
                    <button type="button" onClick={handleClearLocation} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
                 {!userLocation && <p className="text-xs text-yellow-400 mt-1">Enable location access to search.</p>}

                {locationSuggestions.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {locationSuggestions.map((s, index) => (
                      <li
                        key={index}
                        onClick={() => handleSelectSuggestion(s)}
                        className="px-4 py-2 text-white hover:bg-indigo-600 cursor-pointer"
                      >
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-sm text-gray-400">{s.address}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-900 px-6 py-4 flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
              Cancel
            </button>
            <button 
                type="submit"
                disabled={Object.keys(errors).length > 0}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {noteToEdit ? 'Save Changes' : 'Add Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};