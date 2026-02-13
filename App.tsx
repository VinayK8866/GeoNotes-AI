
import React, { useState, useEffect, useCallback, lazy, Suspense, useRef, useMemo } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Session } from '@supabase/supabase-js';
import { Note, Category, SortOption, LocationAccuracy } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { useTheme } from './hooks/useTheme';
import { getDistance } from './utils/geolocation';
import { REMINDER_RADIUS_METERS, NOTES_PER_PAGE } from './constants';
import * as db from './utils/db';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Header } from './components/Header';
import { NoteCard } from './components/NoteCard';
import { CategoryFilter } from './components/CategoryFilter';
import { UndoToast } from './components/UndoToast';
import { ErrorToast } from './components/ErrorToast';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { PlusIcon, SpinnerIcon, CloseIcon, AiIcon, ArrowsUpDownIcon, LocationPinIcon, CloudIcon, WifiSlashIcon, GoogleIcon, ComputerDesktopIcon } from './components/Icons';
import { searchNotesWithAi } from './services/geminiService';
import { NoteCardSkeleton } from './components/NoteCardSkeleton';
import { EmptyState } from './components/EmptyState';
import { SettingsModal } from './components/SettingsModal';

const MapView = lazy(() => import('./components/MapView'));
const NoteForm = lazy(() => import('./components/NoteForm'));

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Work', color: 'bg-blue-500' },
  { id: 'cat-2', name: 'Personal', color: 'bg-green-500' },
  { id: 'cat-3', name: 'Shopping', color: 'bg-yellow-500' },
  { id: 'cat-4', name: 'Ideas', color: 'bg-purple-500' },
];

interface AuthProps {
  onSignIn: () => void;
  isConfigured: boolean;
}

const Auth: React.FC<AuthProps> = ({ onSignIn, isConfigured }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-center">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800/50 p-8 sm:p-10 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div>
          <LocationPinIcon className="mx-auto h-12 w-auto text-indigo-500 dark:text-indigo-400" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Welcome to GeoNotes AI
          </h2>
          <p className="mt-2 text-md text-gray-600 dark:text-gray-400">
            Your world, your notes. Synced everywhere.
          </p>
        </div>

        <div className="mt-8 space-y-6 text-left">
          <ul className="space-y-4 text-gray-700 dark:text-gray-300">
            <li className="flex items-start">
              <div className="flex-shrink-0">
                <CloudIcon className="w-6 h-6 text-green-500 dark:text-green-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-md font-medium text-gray-900 dark:text-white">Cloud Sync & Backup</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Securely back up and sync your notes across all your devices.</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0">
                <WifiSlashIcon className="w-6 h-6 text-yellow-500 dark:text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-md font-medium text-gray-900 dark:text-white">Full Offline Access</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your notes are always available, even without an internet connection.</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0">
                <AiIcon className="w-6 h-6 text-purple-500 dark:text-purple-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-md font-medium text-gray-900 dark:text-white">AI-Powered Features</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Leverage AI to organize, brainstorm, and find what you need, faster.</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="mt-6">
          <button
            onClick={onSignIn}
            type="button"
            className="group relative w-full flex justify-center items-center gap-3 py-3 px-4 border border-transparent text-sm font-semibold rounded-md text-gray-700 bg-white dark:text-gray-200 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-md border-gray-300 dark:border-gray-600"
          >
            <GoogleIcon className="w-6 h-6" />
            Sign in with Google
          </button>
          {!isConfigured && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md">
              <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
                <strong>Local Mode:</strong> Backend services (Supabase) are not configured. Sign-in is disabled, but you can still create and save notes locally in your browser.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          By continuing, you agree to our <a href="#" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">Terms of Service</a> and <a href="#" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { theme, setTheme, effectiveTheme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [recentlyArchived, setRecentlyArchived] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState<string | null>(null);

  const [locationAccuracy, setLocationAccuracy] = useState<LocationAccuracy>(() => {
    return (localStorage.getItem('locationAccuracy') as LocationAccuracy) || 'high';
  });
  const [showSettings, setShowSettings] = useState(false);

  const { location, error: locationError, requestLocation } = useGeolocation(locationAccuracy);
  useEffect(() => {
    if (locationError) console.error("App location error:", locationError);
    if (location) console.log("App location update:", location);
  }, [location, locationError]);

  const handleAccuracyChange = (newAccuracy: LocationAccuracy) => {
    setLocationAccuracy(newAccuracy);
    localStorage.setItem('locationAccuracy', newAccuracy);
  };

  /* Sync & Pagination State */
  const [page, setPage] = useState(1);
  const [hasMoreNotes, setHasMoreNotes] = useState(true);

  const syncAndFetchInitialNotes = useCallback(async () => {
    // 1. Initial Load from Local DB
    const localNotes = await db.getNotesFromDB(1, NOTES_PER_PAGE);
    setNotes(localNotes);
    if (localNotes.length < NOTES_PER_PAGE) setHasMoreNotes(false);

    if (!supabase || !isSupabaseConfigured) {
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    if (!navigator.onLine) {
      setIsSyncing(false);
      return;
    }

    try {
      // 2. Push Local Changes
      const queuedUpdates = await db.getQueuedUpdates();
      if (queuedUpdates.length > 0) {
        for (const update of queuedUpdates) {
          // Note: In a real app, you'd handle conflict resolution here.
          if (update.type === 'SAVE') {
            await supabase.from('notes').upsert(update.payload);
          } else if (update.type === 'DELETE') {
            await supabase.from('notes').delete().eq('id', update.payload.id);
          }
        }
        await db.clearQueuedUpdates();
      }

      // 3. Pull Remote Changes (Differential Sync)
      const lastSyncTime = db.getLastSyncTime();
      let query = supabase.from('notes').select('*');

      if (lastSyncTime) {
        query = query.gt('updated_at', lastSyncTime);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        await db.addNotesToDB(data);
      }

      db.setLastSyncTime(new Date().toISOString());

      // 4. Update UI with latest data from DB (refresh current view)
      // We accept that this might shift things around if new notes appeared.
      const freshNotes = await db.getNotesFromDB(1, NOTES_PER_PAGE * page);
      setNotes(freshNotes);

    } catch (err: any) {
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [page]);

  const loadMoreNotes = async () => {
    const nextPage = page + 1;
    const moreNotes = await db.getNotesFromDB(nextPage, NOTES_PER_PAGE);
    if (moreNotes.length === 0) {
      setHasMoreNotes(false);
    } else {
      setNotes(prev => [...prev, ...moreNotes]);
      setPage(nextPage);
    }
  };

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setIsAuthLoading(false);
        syncAndFetchInitialNotes();
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session) syncAndFetchInitialNotes();
      });

      return () => subscription.unsubscribe();
    } else {
      setIsAuthLoading(false);
      syncAndFetchInitialNotes();
    }
  }, [syncAndFetchInitialNotes]);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const handleSignIn = async () => {
    if (!supabase || !isSupabaseConfigured) {
      setError("Sign-in requires a valid Supabase configuration (SUPABASE_URL and SUPABASE_ANON_KEY environment variables). The app will continue in Local-Only Mode.");
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (signInError) throw signInError;
    } catch (err: any) {
      setError(err.message || "Failed to initiate sign-in.");
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      setSession(null);
      // We might want to clear local DB here or keep it for offline. 
      // For now, keep it for seamless offline-first experience.
    } catch (err: any) {
      setError(err.message || "Failed to sign out.");
    }
  };

  const handleSaveNote = async (note: Note) => {
    const updatedNotes = notes.some(n => n.id === note.id)
      ? notes.map(n => n.id === note.id ? note : n)
      : [note, ...notes];

    setNotes(updatedNotes);
    await db.saveNoteToDB(note);
    setShowNoteForm(false);
    setEditingNote(null);

    if (navigator.onLine && supabase && isSupabaseConfigured && session) {
      await supabase.from('notes').upsert({ ...note, user_id: session.user.id });
    } else {
      await db.queueUpdate({ type: 'SAVE', payload: note });
    }
  };

  const handleArchiveNote = async (note: Note) => {
    const updatedNote = { ...note, isArchived: !note.isArchived };
    handleSaveNote(updatedNote);
    if (!note.isArchived) setRecentlyArchived(note);
  };

  const handleDeletePermanently = async (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    await db.deleteNoteFromDB(id);
    if (navigator.onLine && supabase && isSupabaseConfigured && session) {
      await supabase.from('notes').delete().eq('id', id);
    } else {
      await db.queueUpdate({ type: 'DELETE', payload: { id } });
    }
  };

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsAiSearching(true);
    setAiSearchResult(null);
    try {
      const result = await searchNotesWithAi(searchQuery, notes);
      setAiSearchResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAiSearching(false);
    }
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesFilter = activeFilter ? note.category?.id === activeFilter : true;
      const matchesView = note.isArchived === (viewMode === 'archived');
      const matchesSearch = searchQuery
        ? note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesFilter && matchesView && matchesSearch;
    });
  }, [notes, activeFilter, viewMode, searchQuery]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <SpinnerIcon className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // Show Auth screen if not logged in AND we have a valid configuration to try.
  // If no config, we skip to the main app in local mode.
  if (!session && isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Auth onSignIn={handleSignIn} isConfigured={isSupabaseConfigured} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col">
        <Header
          session={session}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          isOnline={isOnline}
          isSyncing={isSyncing}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAiSearch={handleAiSearch}
          isAiSearching={isAiSearching}
          theme={theme}
          setTheme={setTheme}
          onOpenSettings={() => setShowSettings(true)}
        />

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <div className="flex-grow">
              <div className="flex items-center justify-between mb-6">
                <CategoryFilter
                  categories={DEFAULT_CATEGORIES}
                  activeFilter={activeFilter}
                  onSelectFilter={setActiveFilter}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')}
                    className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    {viewMode === 'active' ? 'View Archive' : 'View Active Notes'}
                  </button>
                </div>
              </div>

              <Suspense fallback={<div className="h-[60vh] bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg flex items-center justify-center text-gray-400">Loading Map...</div>}>
                <ErrorBoundary>
                  <MapView
                    notes={filteredNotes}
                    userLocation={location}
                    activeNoteId={activeNoteId}
                    onMarkerClick={setActiveNoteId}
                    theme={effectiveTheme}
                  />
                </ErrorBoundary>
              </Suspense>
            </div>
          </div>

          {aiSearchResult && (
            <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 p-6 rounded-lg mb-8 relative shadow-sm">
              <button onClick={() => setAiSearchResult(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <CloseIcon className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-2">
                <AiIcon className="w-5 h-5" /> AI Search Result
              </h3>
              <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
                {aiSearchResult}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.length > 0 ? (
              filteredNotes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  userLocation={location}
                  isActive={note.id === activeNoteId}
                  isArchivedView={viewMode === 'archived'}
                  onEdit={(n) => { setEditingNote(n); setShowNoteForm(true); }}
                  onArchive={handleArchiveNote}
                  onUnarchive={handleArchiveNote}
                  onDeletePermanently={handleDeletePermanently}
                  onShare={(n) => navigator.share({ title: n.title, text: n.content })}
                  onMouseEnter={() => setActiveNoteId(note.id)}
                  onMouseLeave={() => setActiveNoteId(null)}
                />
              ))
            ) : (
              <div className="col-span-full">
                <EmptyState
                  onAddNote={() => setShowNoteForm(true)}
                  viewMode={viewMode}
                  isFiltered={!!activeFilter || !!searchQuery}
                />
              </div>
            )}
          </div>

          {hasMoreNotes && !activeFilter && !searchQuery && !viewMode.includes('archived') && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMoreNotes}
                className="px-6 py-3 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-semibold rounded-full shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Load More Notes
              </button>
            </div>
          )}
        </main>

        <button
          onClick={() => { setEditingNote(null); setShowNoteForm(true); }}
          className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 transition-transform hover:scale-110 z-50 focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
          aria-label="Add new note"
        >
          <PlusIcon className="w-8 h-8" />
        </button>

        {showNoteForm && (
          <Suspense fallback={null}>
            <NoteForm
              noteToEdit={editingNote}
              onSave={handleSaveNote}
              onCancel={() => { setShowNoteForm(false); setEditingNote(null); }}
              categories={DEFAULT_CATEGORIES}
              userLocation={location}
              onRequestLocation={requestLocation}
              onError={setError}
            />
          </Suspense>
        )}

        {showSettings && (
          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            accuracy={locationAccuracy}
            onAccuracyChange={handleAccuracyChange}
          />
        )}

        {recentlyArchived && <UndoToast message="Note archived" onUndo={() => { handleArchiveNote(recentlyArchived); setRecentlyArchived(null); }} />}
        {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
      </div>
    </ErrorBoundary>
  );
};

export default App;
