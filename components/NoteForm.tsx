import React, { useState, useEffect } from 'react';
import { Note, Category, LocationSuggestion, Coordinates } from '../types';
import { suggestLocations, categorizeNote, generateNoteContent, generateFullNote } from '../services/geminiService';
import { useDebounce } from '../hooks/useDebounce';
import { CloseIcon, MapPinIcon, SpinnerIcon, AiIcon } from './Icons';

interface NoteFormProps {
  noteToEdit: Note | null;
  onSave: (note: Note) => void;
  onCancel: () => void;
  categories: Category[];
  userLocation: Coordinates | null;
  onError: (message: string) => void;
}

const TITLE_MAX_LENGTH = 150;
const CONTENT_MAX_LENGTH = 10000;

const NoteForm: React.FC<NoteFormProps> = ({ noteToEdit, onSave, onCancel, categories, userLocation, onError }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [locationSearch, setLocationSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; coordinates: Coordinates } | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [reminderRadius, setReminderRadius] = useState(1000); // meters
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

  const debouncedSearchTerm = useDebounce(locationSearch, 300);

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
      setReminderRadius(noteToEdit.reminderRadius || 1000);
    } else if (userLocation && !selectedLocation && !locationSearch) {
        // Auto-assign current location for new notes as a default
        const currentLoc = {
            name: 'Current Location',
            coordinates: userLocation
        };
        setSelectedLocation(currentLoc);
        setLocationSearch('Current Location');
    }
  }, [noteToEdit, userLocation, selectedLocation, locationSearch]);

  useEffect(() => {
    if (debouncedSearchTerm.trim().length > 2) {
      const fetchSuggestions = async () => {
        setIsSearching(true);
        setLocationSuggestions([]);
        try {
          const suggestions = await suggestLocations(debouncedSearchTerm, userLocation);
          setLocationSuggestions(suggestions);
        } catch (error) {
          console.error(error);
          onError((error as Error).message || 'Failed to get location suggestions from AI.');
        } finally {
          setIsSearching(false);
        }
      };
      fetchSuggestions();
    } else {
      setLocationSuggestions([]);
    }
  }, [debouncedSearchTerm, userLocation, onError]);

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
      onError("Failed to categorize note with AI.");
    } finally {
      setIsCategorizing(false);
    }
  };

  const handleAiAssist = async () => {
    if (!title.trim()) {
      setErrors(prev => ({ ...prev, title: 'A title is needed for AI assist.' }));
      return;
    }
    setIsGeneratingContent(true);
    try {
      const newContent = await generateNoteContent(title, content);
      setContent(prevContent => (prevContent ? `${prevContent}\n\n${newContent}` : newContent).trim());
    } catch (error) {
      console.error("Failed to generate content with AI", error);
      onError((error as Error).message || 'Failed to generate content with AI.');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleAiFill = async () => {
    if (!title.trim()) {
      setErrors(prev => ({ ...prev, title: 'A title is needed for AI Fill.' }));
      return;
    }
    setIsAutoFilling(true);
    try {
      const generatedData = await generateFullNote(title, userLocation, categories);

      if (generatedData.content) {
        setContent(prev => (prev ? `${prev}\n\n${generatedData.content}` : generatedData.content).trim());
      }

      if (generatedData.categoryName) {
        const foundCategory = categories.find(c => c.name.toLowerCase() === generatedData.categoryName.toLowerCase());
        if (foundCategory) {
          setCategoryId(foundCategory.id);
        }
      }

      // Handle location: If AI provides a name/address, try to geocode it
      if (generatedData.locationName) {
        const query = generatedData.locationAddress
          ? `${generatedData.locationName}, ${generatedData.locationAddress}`
          : generatedData.locationName;

        setLocationSearch(query);
        setIsSearching(true);

        // Trigger generic search to find coordinates for this name
        try {
          const suggestions = await suggestLocations(query, userLocation);
          if (suggestions.length > 0) {
            // Auto-select the first suggestion if it matches well
            const topMatch = suggestions[0];
            setSelectedLocation({
              name: topMatch.name,
              coordinates: topMatch.coordinates
            });
            setLocationSearch(topMatch.name); // Keep it clean
          } else {
            // No coordinates found, but fill the search box so user can refine
            setSelectedLocation(null);
          }
        } catch (e) {
          console.error("Failed to resolve location from AI suggestion", e);
        } finally {
          setIsSearching(false);
        }
      }
    } catch (error) {
      console.error("Failed to auto-fill note with AI", error);
      onError((error as Error).message || 'Failed to auto-fill note with AI.');
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const selectedCategory = categories.find(c => c.id === categoryId);

    const noteData: Note = {
      id: noteToEdit?.id || crypto.randomUUID(),
      title: title.trim(),
      content,
      category: selectedCategory,
      location: selectedLocation || undefined,
      reminderRadius: selectedLocation ? reminderRadius : undefined,
      created_at: noteToEdit?.created_at || new Date().toISOString(),
      isArchived: noteToEdit?.isArchived || false,
    };
    onSave(noteData);
  };

  const formTitle = noteToEdit ? 'Edit Note' : 'Add New Note';

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col h-full bg-white dark:bg-[#131c2e]">
      <div className="p-6 md:p-8 space-y-6 flex-grow pb-[calc(2rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-2">Title</label>
            <div className="flex gap-2">
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title..."
                className={`flex-grow w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border text-base placeholder-slate-400 dark:placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all ${errors.title ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
                required
              />
              <button
                type="button"
                onClick={handleAiFill}
                disabled={isAutoFilling || !title.trim()}
                title="Auto-fill note with AI"
                className="flex-shrink-0 flex items-center justify-center w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
              >
                {isAutoFilling ? <SpinnerIcon className="w-6 h-6 animate-spin" /> : <AiIcon className="w-6 h-6" />}
              </button>
            </div>
            {errors.title && <p className="text-xs text-red-500 mt-2 ml-1 font-medium">{errors.title}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="content" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">Content</label>
              <button
                type="button"
                onClick={handleAiAssist}
                disabled={isGeneratingContent || !title.trim()}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:text-slate-400 dark:disabled:text-slate-700 transition-colors bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full"
              >
                {isGeneratingContent ? <SpinnerIcon className="w-3 h-3 animate-spin" /> : <AiIcon className="w-3.5 h-3.5" />}
                <span>AI Assist</span>
              </button>
            </div>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="What's on your mind?"
              className={`w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border text-base placeholder-slate-400 dark:placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all min-h-[120px] ${errors.content ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
            />
            {errors.content && <p className="text-xs text-red-500 mt-2 ml-1 font-medium">{errors.content}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="category" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-2">Category</label>
              <div className="flex gap-2">
                <select
                  id="category"
                  value={categoryId || ''}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none text-base"
                >
                  <option value="">Select a category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAiCategorize}
                  disabled={isCategorizing || categories.length === 0}
                  className="flex-shrink-0 flex items-center justify-center w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  {isCategorizing ? <SpinnerIcon className="w-6 h-6 animate-spin" /> : <AiIcon className="w-6 h-6" />}
                </button>
              </div>
            </div>

            <div className="relative">
              <label htmlFor="location" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-2">Location</label>
              <div className="relative">
                <div className="flex gap-2">
                    <MapPinIcon className="w-5 h-5 text-indigo-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                    type="text"
                    id="location"
                    value={locationSearch}
                    onChange={(e) => {
                        setLocationSearch(e.target.value);
                        if (selectedLocation) setSelectedLocation(null);
                    }}
                    placeholder="Search places..."
                    className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 pl-11 transition-all text-base font-medium"
                    />
                    {isSearching && <SpinnerIcon className="w-5 h-5 text-indigo-500 absolute right-4 top-1/2 -translate-y-1/2 animate-spin" />}
                    {!isSearching && selectedLocation && (
                    <button type="button" onClick={handleClearLocation} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                    )}
                </div>
              </div>
              {locationSuggestions.length > 0 && (
                <ul className="absolute z-20 w-full mt-2 bg-white dark:bg-[#1e2536] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar ring-8 ring-white/10">
                  {locationSuggestions.map((s, index) => (
                    <li
                      key={index}
                      onClick={() => handleSelectSuggestion(s)}
                      className="px-4 py-4 text-sm text-slate-900 dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer border-b last:border-0 border-slate-100 dark:border-slate-800 transition-colors"
                    >
                      <p className="font-bold text-base">{s.name}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400 truncate mt-0.5">{s.address}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {selectedLocation && (
            <div className="animate-fade-in pt-2">
              <label htmlFor="radius" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500 mb-2 flex items-center justify-between">
                <span>Reminder Radius</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-black">
                   {reminderRadius >= 1000 ? `${reminderRadius/1000}km` : `${reminderRadius}m`}
                </span>
              </label>
              <input 
                type="range"
                id="radius"
                min="100"
                max="5000"
                step="100"
                value={reminderRadius}
                onChange={(e) => setReminderRadius(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between mt-2 px-1">
                 <span className="text-[10px] font-bold text-slate-400">100m</span>
                 <span className="text-[10px] font-bold text-slate-400">5km</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 bg-slate-50/80 dark:bg-black/20 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-end gap-3 sticky bottom-0 z-10 backdrop-blur-md">
        <button type="button" onClick={onCancel} className="hidden md:block px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-colors">
          Cancel
        </button>
        <button
          type="submit"
          disabled={Object.keys(errors).length > 0}
          className="btn-gradient w-full md:w-auto px-8 py-4 text-base shadow-indigo-500/25"
        >
          {noteToEdit ? 'Save Changes' : 'Create Note'}
        </button>
      </div>
    </form>
  );
};

export default NoteForm;