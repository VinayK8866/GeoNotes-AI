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
  onRequestLocation: () => void;
  onError: (message: string) => void;
}

const TITLE_MAX_LENGTH = 150;
const CONTENT_MAX_LENGTH = 10000;

const NoteForm: React.FC<NoteFormProps> = ({ noteToEdit, onSave, onCancel, categories, userLocation, onRequestLocation, onError }) => {
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
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

  const debouncedSearchTerm = useDebounce(locationSearch, 100);

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
    if (!title.trim() || !userLocation) {
      if (!title.trim()) setErrors(prev => ({ ...prev, title: 'A title is needed for AI Fill.' }));
      if (!userLocation) {
        onRequestLocation();
        onError("Please allow location access, then try again.");
      }
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

      if (generatedData.location?.coordinates) {
        const locationData = {
          name: generatedData.location.name,
          coordinates: generatedData.location.coordinates,
        };
        setSelectedLocation(locationData);
        setLocationSearch(locationData.name);
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
      created_at: noteToEdit?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isArchived: noteToEdit?.isArchived || false,
    };
    onSave(noteData);
  };

  const formTitle = noteToEdit ? 'Edit Note' : 'Add New Note';

  return (
    <div className="fixed inset-0 bg-black/60 z-[1100] flex justify-center items-start p-4 pt-16 sm:pt-24" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto text-gray-900 dark:text-white" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{formTitle}</h2>
              <button type="button" onClick={onCancel} className="p-2 -mr-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`flex-grow w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 border ${errors.title ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'}`}
                  required
                />
                <button
                  type="button"
                  onClick={handleAiFill}
                  disabled={isAutoFilling || !title.trim()}
                  title="Auto-fill note with AI (requires a title)"
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  {isAutoFilling ? (
                    <>
                      <SpinnerIcon className="w-5 h-5 animate-spin" />
                      Filling...
                    </>
                  ) : (
                    <>
                      <AiIcon className="w-5 h-5" />
                      AI Fill
                    </>
                  )}
                </button>
              </div>
              <div className="flex justify-between items-center mt-1">
                {errors.title ? <p className="text-sm text-red-500 dark:text-red-400">{errors.title}</p> : <div></div>}
                <p className={`text-sm ml-auto ${title.trim().length > TITLE_MAX_LENGTH ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {title.trim().length} / {TITLE_MAX_LENGTH}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
                <button
                  type="button"
                  onClick={handleAiAssist}
                  disabled={isGeneratingContent || !title.trim()}
                  title="Generate content with AI (requires a title)"
                  className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed disabled:bg-transparent transition-colors"
                >
                  {isGeneratingContent ? (
                    <>
                      <SpinnerIcon className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <AiIcon className="w-4 h-4" />
                      AI Assist
                    </>
                  )}
                </button>
              </div>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className={`w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 border ${errors.content ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'}`}
              />
              <div className="flex justify-between items-center mt-1">
                {errors.content ? <p className="text-sm text-red-500 dark:text-red-400">{errors.content}</p> : <div></div>}
                <p className={`text-sm ml-auto ${content.length > CONTENT_MAX_LENGTH ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {content.length} / {CONTENT_MAX_LENGTH}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <div className="flex items-center gap-2">
                  <select
                    id="category"
                    value={categoryId || ''}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="flex-grow w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
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
                    className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCategorizing ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <AiIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="relative">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
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
                    className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md p-2 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 pl-10"
                    disabled={!userLocation}
                  />
                  {isSearching && <SpinnerIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />}
                  {selectedLocation && (
                    <button type="button" onClick={handleClearLocation} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                      <CloseIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
                {!userLocation && (
                  <button type="button" onClick={onRequestLocation} className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 hover:underline text-left">
                    Enable location access to search.
                  </button>
                )}

                {locationSuggestions.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {locationSuggestions.map((s, index) => (
                      <li
                        key={index}
                        onClick={() => handleSelectSuggestion(s)}
                        className="px-4 py-2 text-gray-900 dark:text-white hover:bg-indigo-600 hover:text-white cursor-pointer"
                      >
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{s.address}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-gray-900 px-6 py-4 flex justify-end gap-3 sticky bottom-0 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={Object.keys(errors).length > 0}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {noteToEdit ? 'Save Changes' : 'Add Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteForm;