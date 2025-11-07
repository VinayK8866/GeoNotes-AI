import React, { useState, useEffect, useCallback, lazy, Suspense, useRef, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { Note, Category, SortOption } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { useTheme } from './hooks/useTheme';
import { getDistance } from './utils/geolocation';
import { REMINDER_RADIUS_METERS, NOTES_PER_PAGE } from './constants';
import * as db from './utils/db';
import { supabase } from './supabaseClient';
import { Header } from './components/Header';
import { NoteCard } from './components/NoteCard';
import { CategoryFilter } from './components/CategoryFilter';
import { UndoToast } from './components/UndoToast';
import { ErrorToast } from './components/ErrorToast';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { PlusIcon, SpinnerIcon, CloseIcon, AiIcon, ArrowsUpDownIcon } from './components/Icons';
import { searchNotesWithAi } from './services/geminiService';

const MapView = lazy(() => import('./components/MapView'));
const NoteForm = lazy(() => import('./components/NoteForm'));

const DEFAULT_CATEGORIES: Category[] = [
    { id: 'cat-1', name: 'Work', color: 'bg-blue-500' },
    { id: 'cat-2', name: 'Personal', color: 'bg-green-500' },
    { id: 'cat-3', name: 'Shopping', color: 'bg-yellow-500' },
    { id: 'cat-4', name: 'Ideas', color: 'bg-purple-500' },
];

const MOCK_NOTES: Note[] = [
    { id: crypto.randomUUID(), title: 'Finalize Q3 Report', content: '- Review sales data\n- Write executive summary\n- Circulate for feedback', category: DEFAULT_CATEGORIES[0], created_at: new Date('2024-08-05T10:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Book flight to NYC', content: 'Check prices for September 15-20. Prefer a morning flight.', category: DEFAULT_CATEGORIES[1], created_at: new Date('2024-08-04T14:30:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Grocery List', content: '- Milk\n- Bread\n- Eggs\n- Avocados\n- Chicken breast', category: DEFAULT_CATEGORIES[2], location: { name: 'Trader Joe\'s, Downtown', coordinates: { latitude: 34.0522, longitude: -118.2437 }}, created_at: new Date('2024-08-05T09:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'App Idea: Pet Finder', content: 'Develop an app that uses image recognition to identify lost pets. Gamify the search process.', category: DEFAULT_CATEGORIES[3], created_at: new Date('2024-08-03T18:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Pick up dry cleaning', content: 'Receipt is in the car glove box. They close at 6 PM.', category: DEFAULT_CATEGORIES[1], location: { name: 'Sunshine Cleaners', coordinates: { latitude: 34.0600, longitude: -118.2500 }}, created_at: new Date('2024-08-05T11:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Client Meeting Prep', content: 'Prepare slides for Acme Corp presentation. Focus on YoY growth metrics.', category: DEFAULT_CATEGORIES[0], created_at: new Date('2024-08-02T16:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Buy birthday gift for Sarah', content: 'She mentioned wanting a new cookbook or a nice bottle of wine.', category: DEFAULT_CATEGORIES[2], created_at: new Date('2024-08-01T12:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Brainstorm marketing slogans', content: 'Need something catchy for the new "Nova" product launch.', category: DEFAULT_CATEGORIES[3], created_at: new Date('2024-07-31T15:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Renew gym membership', content: 'Current plan expires at the end of the month.', category: DEFAULT_CATEGORIES[1], created_at: new Date('2024-07-30T08:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Hardware Store Run', content: '- Screws\n- Wood glue\n- Sandpaper (120 grit)', category: DEFAULT_CATEGORIES[2], location: { name: 'The Home Depot', coordinates: { latitude: 40.7128, longitude: -74.0060 }}, created_at: new Date('2024-08-05T13:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Plan weekend hike', content: 'Look up trails at Griffith Park. Check weather forecast.', category: DEFAULT_CATEGORIES[1], location: { name: 'Griffith Observatory', coordinates: { latitude: 34.1184, longitude: -118.3004 }}, created_at: new Date('2024-07-29T11:00:00Z').toISOString(), isArchived: true },
    { id: crypto.randomUUID(), title: 'Update project timeline', content: 'Adjust dates for Phase 2 deliverables. Inform stakeholders.', category: DEFAULT_CATEGORIES[0], created_at: new Date('2024-07-28T10:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Idea for a novel', content: 'A detective story set in a futuristic, underwater city.', category: DEFAULT_CATEGORIES[3], created_at: new Date('2024-07-27T20:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Get a new passport photo', content: 'Make sure it meets the state department requirements.', category: DEFAULT_CATEGORIES[1], created_at: new Date('2024-07-26T13:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Return library books', content: '"Dune" and "The Martian" are due on Friday.', category: DEFAULT_CATEGORIES[1], location: { name: 'Central Library', coordinates: { latitude: 34.0544, longitude: -118.2542 }}, created_at: new Date('2024-08-05T15:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Submit expense report', content: 'Include receipts for the conference travel and meals.', category: DEFAULT_CATEGORIES[0], created_at: new Date('2024-07-25T09:00:00Z').toISOString(), isArchived: true },
    { id: crypto.randomUUID(), title: 'Pick up new glasses', content: 'Order is ready at the optometrist.', category: DEFAULT_CATEGORIES[2], created_at: new Date('2024-07-24T17:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Research new coffee machine', content: 'Look at reviews for Breville vs. De\'Longhi espresso makers.', category: DEFAULT_CATEGORIES[3], created_at: new Date('2024-07-23T19:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Schedule dentist appointment', content: 'Due for a cleaning. Call Dr. Smith\'s office.', category: DEFAULT_CATEGORIES[1], created_at: new Date('2024-07-22T11:30:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Take photos at Golden Gate', content: 'Go during sunset for the best light.', category: DEFAULT_CATEGORIES[1], location: { name: 'Golden Gate Bridge Welcome Center', coordinates: { latitude: 37.8078, longitude: -122.4750 }}, created_at: new Date('2024-07-21T18:00:00Z').toISOString(), isArchived: false },
];

const App: React.FC = () => {
  const USE_MOCK_DATA = false;

  const { theme, setTheme, effectiveTheme } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
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
  const observer = useRef<IntersectionObserver | null>(null);
  const noteRefs = useRef(new Map<string, HTMLDivElement>());

  const syncAndFetchInitialNotes = useCallback(async (currentSession: Session) => {
    if (!isOnline || isSyncing) return;
    setError(null);
    setIsSyncing(true);
    
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

      const { data: onlineNotes, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', currentSession.user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      if (onlineNotes) {
        await db.saveAllNotesToDB(onlineNotes);
        setNotes(onlineNotes);
        setHasMoreOnlineNotes(onlineNotes.length >= NOTES_PER_PAGE);
      }
    } catch (err: any) {
      setError(`Could not sync with server. Reason: ${err.message}. Showing local data.`);
      const localNotes = await db.getNotesFromDB();
      setNotes(localNotes);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);


  useEffect(() => {
    if (USE_MOCK_DATA) {
      setNotes(MOCK_NOTES);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        syncAndFetchInitialNotes(session);
      } else {
        db.getNotesFromDB().then(setNotes);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        syncAndFetchInitialNotes(session);
      }
    });
    return () => subscription.unsubscribe();
  }, [USE_MOCK_DATA, syncAndFetchInitialNotes]);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online && session) {
        setTimeout(() => syncAndFetchInitialNotes(session), 2000); // Sync after a delay when coming online
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

    const intervalId = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [location, notes, sentNotifications]);


   const handleSaveNote = async (note: Note) => {
    const isNew = !notes.some(n => n.id === note.id);
    const optimisticNotes = isNew ? [note, ...notes] : notes.map(n => (n.id === note.id ? note : n));
    setNotes(optimisticNotes);
    setShowNoteForm(false);
    setEditingNote(null);
    
    if (USE_MOCK_DATA) return;

    await db.saveNoteToDB(note);
    if (isOnline && session) {
      await db.queueUpdate({ type: 'SAVE', payload: note });
      syncAndFetchInitialNotes(session);
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
          url: window.location.href, // You could create a specific URL for the note if you had a backend for it
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
    
    if (USE_MOCK_DATA) return;

    await db.saveNoteToDB(updatedNote);
    if (isOnline && session) {
      await db.queueUpdate({ type: 'SAVE', payload: updatedNote });
      syncAndFetchInitialNotes(session);
    } else {
      await db.queueUpdate({ type: 'SAVE', payload: updatedNote });
    }
  };
  
  const handleUnarchiveNote = async (note: Note) => {
    const updatedNote = { ...note, isArchived: false };
    setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
    
    if (USE_MOCK_DATA) return;
    
    await db.saveNoteToDB(updatedNote);
    if (isOnline && session) {
        await db.queueUpdate({ type: 'SAVE', payload: updatedNote });
        syncAndFetchInitialNotes(session);
    } else {
        await db.queueUpdate({ type: 'SAVE', payload: updatedNote });
    }
  };
  
  const handleDeleteNotePermanently = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this note? This action cannot be undone.')) return;
    
    setNotes(notes.filter(n => n.id !== id));
    if (USE_MOCK_DATA) return;
    
    await db.deleteNoteFromDB(id);
    if(isOnline && session) {
      await db.queueUpdate({ type: 'DELETE', payload: { id } });
      syncAndFetchInitialNotes(session);
    } else {
      await db.queueUpdate({ type: 'DELETE', payload: { id } });
    }
  };

  const handleUndoArchive = async () => {
    if (!recentlyArchived) return;
    
    const originalNote = { ...recentlyArchived, isArchived: false };
    setNotes(notes.map(n => n.id === originalNote.id ? originalNote : n));
    
    if (USE_MOCK_DATA) {
        setRecentlyArchived(null);
        return;
    }

    await db.saveNoteToDB(originalNote);
    
    if (isOnline && session) {
        await db.queueUpdate({ type: 'SAVE', payload: originalNote });
        syncAndFetchInitialNotes(session);
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      <Header 
        session={session} 
        onSignOut={() => supabase.auth.signOut()} 
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