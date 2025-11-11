





import React, { useState, useEffect, useCallback, lazy, Suspense, useRef, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { Note, Category, SortOption } from './types';
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
import { PlusIcon, SpinnerIcon, CloseIcon, AiIcon, ArrowsUpDownIcon } from './components/Icons';
import { searchNotesWithAi } from './services/geminiService';
import { NoteCardSkeleton } from './components/NoteCardSkeleton';
import { EmptyState } from './components/EmptyState';

const MapView = lazy(() => import('./components/MapView'));
const NoteForm = lazy(() => import('./components/NoteForm'));

const DEFAULT_CATEGORIES: Category[] = [
    { id: 'cat-1', name: 'Work', color: 'bg-blue-500' },
    { id: 'cat-2', name: 'Personal', color: 'bg-green-500' },
    { id: 'cat-3', name: 'Shopping', color: 'bg-yellow-500' },
    { id: 'cat-4', name: 'Ideas', color: 'bg-purple-500' },
];

const App: React.FC = () => {
  const { theme, setTheme, effectiveTheme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [recentlyArchived, setRecentlyArchived] = useState<Note | null>(null);
  const [page, setPage] = useState(1);
  const [hasMoreOnlineNotes, setHasMoreOnlineNotes] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [sentNotifications, setSentNotifications] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sentNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('created_at_desc');
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState<string | null>(null);

  const { location, error: locationError, requestLocation } = useGeolocation();
  const noteRefs = useRef(new Map<string, HTMLDivElement>());

  const syncAndFetchInitialNotes = useCallback(async (currentSession: Session) => {
    setIsSyncing(true);
    if (!navigator.onLine) {
      setError("You are offline. Showing locally saved data.");
      const localNotes = await db.getNotesFromDB();
      setNotes(localNotes);
      setIsSyncing(false);
      return;
    };
    setError(null);
    
    try {
      const queuedUpdates = await db.getQueuedUpdates();
      if (queuedUpdates.length > 0) {
        console.log(`Syncing ${queuedUpdates.length} offline updates...`);
        for (const update of queuedUpdates) {
          if (update.type === 'SAVE') {
            const { error: saveError } = await supabase
              .from('notes')
              .upsert({ ...update.payload, user_id: currentSession.user.id });
            if (saveError) throw saveError;
          } else if (update.type === 'DELETE') {
            const { error: deleteError } = await supabase
              .from('notes')
              .delete()
              .match({ id: update.payload.id, user_id: currentSession.user.id });
            if (deleteError) throw deleteError;
          }
          await db.deleteNoteFromQueue(update.id);
        }
        console.log('Offline sync complete.');
      }

      const from = 0;
      const to = NOTES_PER_PAGE - 1;
      const { data: onlineNotes, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', currentSession.user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;
      
      if (onlineNotes) {
        await db.saveAllNotesToDB(onlineNotes);
        setNotes(onlineNotes);
        setPage(1);
        setHasMoreOnlineNotes(onlineNotes.length === NOTES_PER_PAGE);
      }
    } catch (err: any) {
      setError(`Could not sync with server. Reason: ${err.message}. Showing local data.`);
      const localNotes = await db.getNotesFromDB();
      setNotes(localNotes);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
        setIsAuthLoading(false);
        return;
    }
    // onAuthStateChange is called immediately with the current session,
    // making an initial getSession() call redundant and avoiding potential race conditions.
    setIsAuthLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        if (session) {
            await syncAndFetchInitialNotes(session);
        } else {
            // Clear all user-specific data on sign out
            await db.clearLocalData();
            setNotes([]);
            setActiveFilter(null);
            setSearchQuery('');
            setSortOption('created_at_desc');
            setViewMode('active');
            setAiSearchResult(null);
            setRecentlyArchived(null);
            setIsSyncing(false); // Ensure syncing is off when logged out
        }
        // Auth check is complete, we can now show the UI
        setIsAuthLoading(false);
    });

    return () => {
        subscription.unsubscribe();
    };
  }, [syncAndFetchInitialNotes]);


  const loadMoreNotes = useCallback(async () => {
      if (isLoadingMore || !hasMoreOnlineNotes || !isOnline || !session) return;

      setIsLoadingMore(true);
      const nextPage = page + 1;
      const from = page * NOTES_PER_PAGE;
      const to = from + NOTES_PER_PAGE - 1;

      try {
          const { data, error } = await supabase
              .from('notes')
              .select('*')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false })
              .range(from, to);

          if (error) throw error;

          if (data) {
              await db.addNotesToDB(data);
              setNotes(prev => [...prev, ...data]);
              setPage(nextPage);
              setHasMoreOnlineNotes(data.length === NOTES_PER_PAGE);
          }
      } catch (err: any) {
          setError(`Could not load more notes: ${err.message}`);
      } finally {
          setIsLoadingMore(false);
      }
  }, [isLoadingMore, hasMoreOnlineNotes, isOnline, session, page]);

  const observer = useRef<IntersectionObserver>();
  const lastNoteElementRef = useCallback(node => {
      if (isLoadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting && hasMoreOnlineNotes && isOnline) {
              loadMoreNotes();
          }
      });
      if (node) observer.current.observe(node);
  }, [isLoadingMore, hasMoreOnlineNotes, isOnline, loadMoreNotes]);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online && session) {
        // FIX: The error "Expected 1 arguments, but got 0" was likely caused by
        // an incorrect call to syncAndFetchInitialNotes. The function requires the
        // session object to be passed as an argument.
        syncAndFetchInitialNotes(session);
      }
    };
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [session, syncAndFetchInitialNotes]);

  useEffect(() => {
    if (!location || !('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;

    const checkReminders = () => {
      const notesToCheck = notes.filter(n => n.location && !n.isArchived);
      let updatedSentNotifications = false;
      const newSentSet = new Set(sentNotifications);

      for (const note of notesToCheck) {
        if (!note.location) continue;
        const distance = getDistance(location, note.location.coordinates);
        if (distance <= REMINDER_RADIUS_METERS && !sentNotifications.has(note.id)) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: {
              title: `Reminder: ${note.title}`,
              body: `You're near ${note.location.name}. Don't forget your task!`,
              tag: note.id,
            },
          });
          newSentSet.add(note.id);
          updatedSentNotifications = true;
        }
      }

      if (updatedSentNotifications) {
        setSentNotifications(newSentSet);
        localStorage.setItem('sentNotifications', JSON.stringify(Array.from(newSentSet)));
      }
    };

    const intervalId = setInterval(checkReminders, 60000);
    return () => clearInterval(intervalId);
  }, [location, notes, sentNotifications]);


   const handleSaveNote = async (note: Note) => {
    const isNew = !notes.some(n => n.id === note.id);
    const optimisticNotes = isNew ? [note, ...notes] : notes.map(n => (n.id === note.id ? note : n));
    setNotes(optimisticNotes);
    setShowNoteForm(false);
    setEditingNote(null);
    
    await db.saveNoteToDB(note);
    if (isOnline && session) {
      await db.queueUpdate({ type: 'SAVE', payload: note });
      // FIX: Awaited the sync function to prevent race conditions.
      await syncAndFetchInitialNotes(session);
    } else {
      await db.queueUpdate({ type: 'SAVE', payload: note });
    }
  };

  const handleShareNote = async (note: Note) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: note.title,
          text: `Check out my note: "${note.title}"\n\n${note.content}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing note:', error);
        setError('Could not share note.');
      }
    } else {
      setError('Web Share API is not available on your browser.');
    }
  };

  const handleArchiveNote = async (note: Note) => {
    const updatedNote = { ...note, isArchived: true };
    setRecentlyArchived(note);
    setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
    
    await db.saveNoteToDB(updatedNote);
    if (isOnline && session) {
      await db.queueUpdate({ type: 'SAVE', payload: updatedNote });
      // FIX: Awaited the sync function to prevent race conditions.
      await syncAndFetchInitialNotes(session);
    } else {
      await db.queueUpdate({ type: 'SAVE', payload: updatedNote });
    }
  };
  
  const handleUnarchiveNote = async (note: Note) => {
    const updatedNote = { ...note, isArchived: false };
    setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
    
    await db.saveNoteToDB(updatedNote);
    if (isOnline && session) {
        await db.queueUpdate({ type: 'SAVE', payload: updatedNote });
        // FIX: Awaited the sync function to prevent race conditions.
        await syncAndFetchInitialNotes(session);
    } else {
        await db.queueUpdate({ type: 'SAVE', payload: updatedNote });
    }
  };
  
  const handleDeleteNotePermanently = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this note? This action cannot be undone.')) return;
    
    setNotes(notes.filter(n => n.id !== id));
    
    await db.deleteNoteFromDB(id);
    if(isOnline && session) {
      await db.queueUpdate({ type: 'DELETE', payload: { id } });
      // FIX: Awaited the sync function to prevent race conditions.
      await syncAndFetchInitialNotes(session);
    } else {
      await db.queueUpdate({ type: 'DELETE', payload: { id } });
    }
  };

  const handleUndoArchive = async () => {
    if (!recentlyArchived) return;
    
    const originalNote = { ...recentlyArchived, isArchived: false };
    setNotes(notes.map(n => n.id === originalNote.id ? originalNote : n));
    
    await db.saveNoteToDB(originalNote);
    
    if (isOnline && session) {
        await db.queueUpdate({ type: 'SAVE', payload: originalNote });
        // FIX: Awaited the sync function to prevent race conditions.
        await syncAndFetchInitialNotes(session);
    } else {
        await db.queueUpdate({ type: 'SAVE', payload: originalNote });
    }
    setRecentlyArchived(null);
  };
  
  const handleAiSearch = async () => {
      if (!searchQuery.trim()) return;
      setIsAiSearching(true);
      setAiSearchResult(null);
      setError(null);
      try {
          const result = await searchNotesWithAi(searchQuery, notes);
          setAiSearchResult(result);
      } catch (err: any) {
          setError(err.message || 'Failed to search with AI.');
      } finally {
          setIsAiSearching(false);
      }
  };

  const handleSignIn = async () => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                queryParams: {
                    prompt: 'select_account',
                },
            },
        });
        if (error) throw error;
    } catch (error: any) {
        setError(`Authentication failed: ${error.message}`);
    }
  };
  
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        setError(`Failed to sign out: ${error.message}`);
    }
  };

  const handleMarkerClick = (noteId: string) => {
    setActiveNoteId(noteId);
    const node = noteRefs.current.get(noteId);
    if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const processedNotes = useMemo(() => {
    let tempNotes = [...notes];
    tempNotes = tempNotes.filter(note => viewMode === 'archived' ? note.isArchived : !note.isArchived);
    if (activeFilter) tempNotes = tempNotes.filter(n => n.category?.id === activeFilter);
    if (searchQuery.trim() !== '') {
      const lowercasedQuery = searchQuery.toLowerCase();
      tempNotes = tempNotes.filter(n =>
        n.title.toLowerCase().includes(lowercasedQuery) ||
        n.content.toLowerCase().includes(lowercasedQuery)
      );
    }
    tempNotes.sort((a, b) => {
      switch (sortOption) {
        case 'created_at_asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title_asc': return a.title.localeCompare(b.title);
        case 'title_desc': return b.title.localeCompare(a.title);
        case 'distance_asc':
            if (!location) return 0;
            const distA = a.location ? getDistance(location, a.location.coordinates) : Infinity;
            const distB = b.location ? getDistance(location, b.location.coordinates) : Infinity;
            return distA - distB;
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return tempNotes;
  }, [notes, viewMode, activeFilter, searchQuery, sortOption, location]);

  const renderContent = () => {
    if (isSyncing && notes.length === 0) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: NOTES_PER_PAGE }).map((_, index) => <NoteCardSkeleton key={index} />)}
            </div>
        );
    }

    if (processedNotes.length === 0) {
        return (
            <EmptyState 
                onAddNote={() => { setEditingNote(null); setShowNoteForm(true); }}
                viewMode={viewMode}
                isFiltered={!!activeFilter || searchQuery.trim() !== ''}
            />
        );
    }
    
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {processedNotes.map((note) => (
            <NoteCard
              ref={nodeRef => {
                  if (nodeRef) noteRefs.current.set(note.id, nodeRef);
                  else noteRefs.current.delete(note.id);
              }}
              key={note.id}
              note={note}
              userLocation={location}
              onArchive={() => handleArchiveNote(note)}
              onUnarchive={() => handleUnarchiveNote(note)}
              onDeletePermanently={() => handleDeleteNotePermanently(note.id)}
              onEdit={(noteToEdit) => { setEditingNote(noteToEdit); setShowNoteForm(true); }}
              onShare={() => handleShareNote(note)}
              isArchivedView={viewMode === 'archived'}
              isActive={note.id === activeNoteId}
              onMouseEnter={() => setActiveNoteId(note.id)}
              onMouseLeave={() => setActiveNoteId(null)}
            />
          ))}
        </div>
        <div ref={lastNoteElementRef} className="flex justify-center py-8">
            {isLoadingMore && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <SpinnerIcon className="w-6 h-6 animate-spin"/>
                    <span>Loading more notes...</span>
                </div>
            )}
            {!hasMoreOnlineNotes && notes.length > 0 && !isSyncing && (
                <p className="text-gray-500 dark:text-gray-400">You've reached the end.</p>
            )}
        </div>
      </>
    );
  };

  if (!isSupabaseConfigured) {
    return (
        <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 justify-center items-center p-4">
            <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-2xl mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h1 className="text-2xl font-bold text-red-500 dark:text-red-400 mt-4 mb-2">Configuration Error</h1>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                    The application is not configured to connect to the backend service. This is required for authentication and data storage.
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                    To fix this, please set the <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> environment variables with your Supabase project credentials.
                </p>
                <div className="mt-6 text-left bg-gray-100 dark:bg-gray-700 p-4 rounded-md font-mono text-sm text-gray-800 dark:text-gray-200">
                    <p><span className="font-semibold text-indigo-500 dark:text-indigo-400">SUPABASE_URL</span>="https://your-project-id.supabase.co"</p>
                    <p><span className="font-semibold text-indigo-500 dark:text-indigo-400">SUPABASE_ANON_KEY</span>="your-public-anon-key"</p>
                </div>
                 <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
                    Note: This is a local development message. Environment variables are typically managed by your hosting provider in production.
                </p>
            </div>
        </div>
    );
  }

  if (isAuthLoading) {
    return (
        <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 justify-center items-center">
            <div className="flex items-center gap-3">
                <SpinnerIcon className="w-10 h-10 text-indigo-500 animate-spin" />
                <span className="text-xl text-gray-700 dark:text-gray-300">Connecting...</span>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
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
       />
      {notificationPermission !== 'granted' && <NotificationPermissionBanner status={notificationPermission} onRequest={() => Notification.requestPermission().then(setNotificationPermission)} />}
      
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
        {recentlyArchived && <UndoToast message="Note archived." onUndo={handleUndoArchive} />}
        {showNoteForm && (
          <Suspense fallback={<div>Loading form...</div>}>
            <NoteForm 
              noteToEdit={editingNote} 
              onSave={handleSaveNote} 
              onCancel={() => { setShowNoteForm(false); setEditingNote(null); }}
              categories={DEFAULT_CATEGORIES} 
              userLocation={location}
              onError={setError}
            />
          </Suspense>
        )}
        
        {aiSearchResult && (
            <div className="fixed inset-0 bg-black/60 z-[1200] flex justify-center items-center p-4" onClick={() => setAiSearchResult(null)}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><AiIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400" /> AI Assistant's Answer</h3>
                        <button onClick={() => setAiSearchResult(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{aiSearchResult}</p>
                    </div>
                </div>
            </div>
        )}

        <div className="mb-6">
          <Suspense fallback={<div className="bg-gray-200 dark:bg-slate-700 rounded-lg h-[60vh] flex items-center justify-center text-gray-400">Loading Map...</div>}>
            <MapView notes={processedNotes} userLocation={location} activeNoteId={activeNoteId} onMarkerClick={handleMarkerClick} theme={effectiveTheme} />
          </Suspense>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
                <button onClick={() => setViewMode('active')} className={`px-4 py-2 text-sm font-semibold rounded-md ${viewMode === 'active' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Active</button>
                <button onClick={() => setViewMode('archived')} className={`px-4 py-2 text-sm font-semibold rounded-md ${viewMode === 'archived' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Archived</button>
            </div>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            <CategoryFilter categories={DEFAULT_CATEGORIES} activeFilter={activeFilter} onSelectFilter={setActiveFilter} />
            <div className="relative ml-auto">
                <select 
                    value={sortOption} 
                    onChange={e => setSortOption(e.target.value as SortOption)}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md py-2 pl-4 pr-8 appearance-none focus:ring-indigo-500 focus:border-indigo-500 border-transparent"
                    aria-label="Sort notes"
                >
                    <option value="created_at_desc">Date: Newest</option>
                    <option value="created_at_asc">Date: Oldest</option>
                    <option value="title_asc">Title: A-Z</option>
                    <option value="title_desc">Title: Z-A</option>
                    {location && <option value="distance_asc">Distance: Closest</option>}
                </select>
                <ArrowsUpDownIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"/>
            </div>
        </div>
        
        {session ? renderContent() : (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Welcome to GeoNotes AI</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Please sign in to manage your notes.</p>
            </div>
        )}

      </main>
      <button
        onClick={() => { setEditingNote(null); setShowNoteForm(true); }}
        className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition-transform transform hover:scale-110 z-50"
        aria-label="Add new note"
      >
        <PlusIcon className="w-8 h-8" />
      </button>
    </div>
  );
};

export default App;