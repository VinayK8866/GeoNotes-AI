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
    }
  }, [noteToEdit]);

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
      isArchived: noteToEdit?.isArchived || false,
    };
    onSave(noteData);
  };

  const formTitle = noteToEdit ? 'Edit Note' : 'Add New Note';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1100] flex justify-center items-center p-4 animate-fade-in" onClick={onCancel}>
      <div className="glass-card w-full max-w-2xl max-h-[85vh] overflow-y-auto text-slate-900 dark:text-white animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200/60 dark:border-[#1e2d45]">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{formTitle}</h2>
              <button type="button" onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <CloseIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Title</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a descriptive title..."
                    className={`flex-grow w-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all ${errors.title ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={handleAiFill}
                    disabled={isAutoFilling || !title.trim()}
                    title="Auto-fill note with AI"
                    className="flex-shrink-0 flex items-center justify-center w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                  >
                    {isAutoFilling ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <AiIcon className="w-5 h-5" />}
                  </button>
                </div>
                {errors.title && <p className="text-xs text-red-500 mt-1 ml-1">{errors.title}</p>}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="content" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Content</label>
                  <button
                    type="button"
                    onClick={handleAiAssist}
                    disabled={isGeneratingContent || !title.trim()}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:text-gray-400 dark:disabled:text-gray-600 transition-colors"
                  >
                    {isGeneratingContent ? <SpinnerIcon className="w-3 h-3 animate-spin" /> : <AiIcon className="w-3 h-3" />}
                    <span>AI Assist</span>
                  </button>
                </div>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  placeholder="What's on your mind?"
                  className={`w-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all ${errors.content ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                />
                {errors.content && <p className="text-xs text-red-500 mt-1 ml-1">{errors.content}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <div className="flex gap-2">
                    <select
                      id="category"
                      value={categoryId || ''}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none"
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
                      className="flex-shrink-0 flex items-center justify-center w-12 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
                    >
                      {isCategorizing ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <AiIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <label htmlFor="location" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Location</label>
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
                      placeholder="Search places..."
                      className="w-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-3 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 pl-10 transition-all"
                    />
                    {isSearching && <SpinnerIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />}
                    {selectedLocation && (
                      <button type="button" onClick={handleClearLocation} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <CloseIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {locationSuggestions.length > 0 && (
                    <ul className="absolute z-20 w-full mt-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                      {locationSuggestions.map((s, index) => (
                        <li
                          key={index}
                          onClick={() => handleSelectSuggestion(s)}
                          className="px-4 py-3 text-sm text-gray-900 dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer border-b last:border-0 border-gray-100 dark:border-gray-700/50 transition-colors"
                        >
                          <p className="font-semibold">{s.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.address}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 md:px-8 bg-slate-50/50 dark:bg-[#0b1121]/30 border-t border-slate-200/60 dark:border-[#1e2d45] flex justify-end gap-3 rounded-b-2xl">
            <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={Object.keys(errors).length > 0}
              className="btn-gradient px-6 py-2.5 text-sm"
            >
              {noteToEdit ? 'Save Changes' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteForm;