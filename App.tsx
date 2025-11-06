import React, { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { Note, Category } from './types';
import { useGeolocation } from './hooks/useGeolocation';
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
import { PlusIcon, LocationPinIcon, SearchIcon, SpinnerIcon } from './components/Icons';

const MapView = lazy(() => import('./components/MapView'));
const NoteForm = lazy(() => import('./components/NoteForm'));

const MOCK_CATEGORIES: Category[] = [
    { id: 'cat-1', name: 'Work', color: 'bg-blue-500' },
    { id: 'cat-2', name: 'Personal', color: 'bg-green-500' },
    { id: 'cat-3', name: 'Shopping', color: 'bg-yellow-500' },
    { id: 'cat-4', name: 'Ideas', color: 'bg-purple-500' },
];

const MOCK_NOTES: Note[] = [
    { id: crypto.randomUUID(), title: 'Finalize Q3 Report', content: '- Review sales data\n- Write executive summary\n- Circulate for feedback', category: MOCK_CATEGORIES[0], created_at: new Date('2024-08-05T10:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Book flight to NYC', content: 'Check prices for September 15-20. Prefer a morning flight.', category: MOCK_CATEGORIES[1], created_at: new Date('2024-08-04T14:30:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Grocery List', content: '- Milk\n- Bread\n- Eggs\n- Avocados\n- Chicken breast', category: MOCK_CATEGORIES[2], location: { name: 'Trader Joe\'s, Downtown', coordinates: { latitude: 34.0522, longitude: -118.2437 }}, created_at: new Date('2024-08-05T09:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'App Idea: Pet Finder', content: 'Develop an app that uses image recognition to identify lost pets. Gamify the search process.', category: MOCK_CATEGORIES[3], created_at: new Date('2024-08-03T18:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Pick up dry cleaning', content: 'Receipt is in the car glove box. They close at 6 PM.', category: MOCK_CATEGORIES[1], location: { name: 'Sunshine Cleaners', coordinates: { latitude: 34.0600, longitude: -118.2500 }}, created_at: new Date('2024-08-05T11:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Client Meeting Prep', content: 'Prepare slides for Acme Corp presentation. Focus on YoY growth metrics.', category: MOCK_CATEGORIES[0], created_at: new Date('2024-08-02T16:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Buy birthday gift for Sarah', content: 'She mentioned wanting a new cookbook or a nice bottle of wine.', category: MOCK_CATEGORIES[2], created_at: new Date('2024-08-01T12:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Brainstorm marketing slogans', content: 'Need something catchy for the new "Nova" product launch.', category: MOCK_CATEGORIES[3], created_at: new Date('2024-07-31T15:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Renew gym membership', content: 'Current plan expires at the end of the month.', category: MOCK_CATEGORIES[1], created_at: new Date('2024-07-30T08:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Hardware Store Run', content: '- Screws\n- Wood glue\n- Sandpaper (120 grit)', category: MOCK_CATEGORIES[2], location: { name: 'The Home Depot', coordinates: { latitude: 40.7128, longitude: -74.0060 }}, created_at: new Date('2024-08-05T13:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Plan weekend hike', content: 'Look up trails at Griffith Park. Check weather forecast.', category: MOCK_CATEGORIES[1], location: { name: 'Griffith Observatory', coordinates: { latitude: 34.1184, longitude: -118.3004 }}, created_at: new Date('2024-07-29T11:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Update project timeline', content: 'Adjust dates for Phase 2 deliverables. Inform stakeholders.', category: MOCK_CATEGORIES[0], created_at: new Date('2024-07-28T10:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Idea for a novel', content: 'A detective story set in a futuristic, underwater city.', category: MOCK_CATEGORIES[3], created_at: new Date('2024-07-27T20:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Get a new passport photo', content: 'Make sure it meets the state department requirements.', category: MOCK_CATEGORIES[1], created_at: new Date('2024-07-26T13:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Return library books', content: '"Dune" and "The Martian" are due on Friday.', category: MOCK_CATEGORIES[1], location: { name: 'Central Library', coordinates: { latitude: 34.0544, longitude: -118.2542 }}, created_at: new Date('2024-08-05T15:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Submit expense report', content: 'Include receipts for the conference travel and meals.', category: MOCK_CATEGORIES[0], created_at: new Date('2024-07-25T09:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Pick up new glasses', content: 'Order is ready at the optometrist.', category: MOCK_CATEGORIES[2], created_at: new Date('2024-07-24T17:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Research new coffee machine', content: 'Look at reviews for Breville vs. De\'Longhi espresso makers.', category: MOCK_CATEGORIES[3], created_at: new Date('2024-07-23T19:00:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Schedule dentist appointment', content: 'Due for a cleaning. Call Dr. Smith\'s office.', category: MOCK_CATEGORIES[1], created_at: new Date('2024-07-22T11:30:00Z').toISOString(), isArchived: false },
    { id: crypto.randomUUID(), title: 'Take photos at Golden Gate', content: 'Go during sunset for the best light.', category: MOCK_CATEGORIES[1], location: { name: 'Golden Gate Bridge Welcome Center', coordinates: { latitude: 37.8078, longitude: -122.4750 }}, created_at: new Date('2024-07-21T18:00:00Z').toISOString(), isArchived: false },
];

const Login: React.FC<{ onLogin: () => Promise<void> }> = ({ onLogin }) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div className="text-center">
            <LocationPinIcon className="h-16 w-16 text-indigo-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
                Welcome to GeoNotes <span className="text-indigo-400">AI</span>
            </h1>
            <p className="text-lg text-gray-300 max-w-xl mx-auto mb-8">
                Your intelligent, location-aware notebook. Never forget a task or idea when you're on the go.
            </p>
            <button
                onClick={() => onLogin()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105"
            >
                Sign In with Google
            </button>
        </div>
    </div>
);


const App: React.FC = () => {
  // --- SET TO `true` TO USE MOCK DATA FOR TESTING, `false` FOR LIVE DATA ---
  const USE_MOCK_DATA = false;

  const [session, setSession] = useState<Session | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState<Note | null>(null);
  const [page, setPage] = useState(1);
  const [hasMoreOnlineNotes, setHasMoreOnlineNotes] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [sentNotifications, setSentNotifications] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sentNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const { location, error: locationError, requestLocation } = useGeolocation();
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (USE_MOCK_DATA) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [USE_MOCK_DATA]);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const syncAndFetchInitialNotes = useCallback(async (currentSession: Session) => {
    if (!isOnline || isSyncing) return;
    setError(null);
    setIsSyncing(true);
  
    try {
      const queuedUpdates = await db.getQueuedUpdates();
      if (queuedUpdates.length > 0) {
        for (const update of queuedUpdates) {
          if (update.type === 'SAVE') {
            const { id, ...noteData } = update.payload;
            await supabase.from('notes').upsert({ ...noteData, user_id: currentSession.user.id, id });
          } else if (update.type === 'DELETE') {
            await supabase.from('notes').delete().match({ id: update.payload.id, user_id: currentSession.user.id });
          }
        }
        await db.clearQueuedUpdates();
      }
  
      const from = 0;
      const to = NOTES_PER_PAGE - 1;
      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', currentSession.user.id)
        .order('created_at', { ascending: false })
        .range(from, to);
  
      if (fetchError) throw fetchError;
  
      if (data) {
        await db.saveAllNotesToDB(data);
        setNotes(data);
        setPage(1);
        setHasMoreOnlineNotes(data.length === NOTES_PER_PAGE);
      }
    } catch (err: any) {
      setError(`Could not sync with server. Reason: ${err.message}. Showing local data.`);
      const localNotes = await db.getNotesFromDB();
      setNotes(localNotes);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  const fetchMoreNotes = useCallback(async (pageNum: number, currentSession: Session) => {
    if (isLoadingMore || !hasMoreOnlineNotes) return;
    setIsLoadingMore(true);

    try {
        const from = (pageNum - 1) * NOTES_PER_PAGE;
        const to = pageNum * NOTES_PER_PAGE - 1;

        const { data, error: fetchError } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', currentSession.user.id)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (fetchError) throw fetchError;

        if (data && data.length > 0) {
            setNotes(prev => [...prev, ...data]);
            setHasMoreOnlineNotes(data.length === NOTES_PER_PAGE);
        } else {
            setHasMoreOnlineNotes(false);
        }
    } catch (err: any) {
        setError(`Could not fetch more notes. Reason: ${err.message}`);
    } finally {
        setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreOnlineNotes]);

  useEffect(() => {
    if (USE_MOCK_DATA) {
      setNotes(MOCK_NOTES.slice(0, NOTES_PER_PAGE));
      setPage(1);
      setHasMoreOnlineNotes(MOCK_NOTES.length > NOTES_PER_PAGE);
      return;
    }

    if (session) {
      if (error === "You have local notes. Sign in to sync.") {
        setError(null);
      }
      syncAndFetchInitialNotes(session);
    } else {
      db.getNotesFromDB().then(localNotes => {
        if (localNotes.length > 0) {
          setError("You have local notes. Sign in to sync.");
          setNotes(localNotes);
        } else {
          setNotes([]);
          setError(null);
        }
      });
    }
  }, [session, isOnline, syncAndFetchInitialNotes, USE_MOCK_DATA]);

  useEffect(() => {
    if (page === 1) return; // Do not run on initial load, which is handled by another effect

    if (USE_MOCK_DATA) {
      setIsLoadingMore(true);
      // Simulate network delay for a better UX
      setTimeout(() => {
        const from = (page - 1) * NOTES_PER_PAGE;
        const to = page * NOTES_PER_PAGE;
        const newNotes = MOCK_NOTES.slice(from, to);

        if (newNotes.length > 0) {
          setNotes(prev => [...prev, ...newNotes]);
        }
        
        setHasMoreOnlineNotes(MOCK_NOTES.length > to);
        setIsLoadingMore(false);
      }, 1500);
    } else if (session) {
      fetchMoreNotes(page, session);
    }
  }, [page, session, fetchMoreNotes, USE_MOCK_DATA]);


  useEffect(() => {
    if (!session || !isOnline || USE_MOCK_DATA) return;

    const handleRealtimeUpdate = async (payload: any) => {
      if (isSyncing) return;

      if (payload.eventType === 'INSERT') {
        const newNote = payload.new as Note;
        await db.saveNoteToDB(newNote);
        setNotes(prev => {
          const filtered = prev.filter(n => n.id !== newNote.id);
          return [newNote, ...filtered].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        });
      }
      
      if (payload.eventType === 'UPDATE') {
        const updatedNote = payload.new as Note;
        await db.saveNoteToDB(updatedNote);
        setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
      }

      if (payload.eventType === 'DELETE') {
        const oldNoteId = payload.old.id as string;
        await db.deleteNoteFromDB(oldNoteId);
        setNotes(prev => prev.filter(n => n.id !== oldNoteId));
      }
    };

    const channel = supabase.channel('realtime-notes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notes',
          filter: `user_id=eq.${session.user.id}` 
        }, 
        handleRealtimeUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, isOnline, isSyncing, USE_MOCK_DATA]);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleRequestNotificationPermission = async () => {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            setNotificationPermission(permission);
        });
    }
  };

  useEffect(() => {
    if (location && notificationPermission === 'granted') {
      notes.forEach(note => {
        if (note.location && !sentNotifications.has(note.id)) {
          const distance = getDistance(location, note.location.coordinates);
          if (distance <= REMINDER_RADIUS_METERS) {
            new Notification('GeoNotes Reminder', {
              body: `You are near your note: "${note.title}"`,
              tag: note.id,
            });
            const newSent = new Set(sentNotifications);
            newSent.add(note.id);
            setSentNotifications(newSent);
            localStorage.setItem('sentNotifications', JSON.stringify(Array.from(newSent)));
          }
        }
      });
    }
  }, [location, notes, notificationPermission, sentNotifications]);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      console.error('Error signing in with Google:', error);
      setError('Failed to sign in. Please try again.');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setNotes([]);
    await db.clearQueuedUpdates();
    await db.saveAllNotesToDB([]);
  };

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

  const handleDeleteNote = async (id: string) => {
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;

    setRecentlyDeleted(noteToDelete);
    const optimisticNotes = notes.filter(n => n.id !== id);
    setNotes(optimisticNotes);
    
    if (USE_MOCK_DATA) return;

    await db.deleteNoteFromDB(id);
    if (isOnline && session) {
      await db.queueUpdate({ type: 'DELETE', payload: { id } });
      syncAndFetchInitialNotes(session);
    } else {
      await db.queueUpdate({ type: 'DELETE', payload: { id } });
    }
  };

  const handleUndoDelete = async () => {
    if (!recentlyDeleted) return;

    setNotes(prevNotes => [recentlyDeleted, ...prevNotes].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    
    if (USE_MOCK_DATA) {
        setRecentlyDeleted(null);
        return;
    }

    await db.saveNoteToDB(recentlyDeleted);
    
    if (isOnline && session) {
        await db.queueUpdate({ type: 'SAVE', payload: recentlyDeleted });
        syncAndFetchInitialNotes(session);
    } else {
        await db.queueUpdate({ type: 'SAVE', payload: recentlyDeleted });
    }

    setRecentlyDeleted(null);
  };
  
  const lastNoteElementRef = useCallback(node => {
    if (isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreOnlineNotes) {
        setPage(prevPage => prevPage + 1);
      }
    }, {
      rootMargin: '200px'
    });
    if (node) observer.current.observe(node);
  }, [isLoadingMore, hasMoreOnlineNotes]);

  if (!session && !USE_MOCK_DATA) {
    return <Login onLogin={signInWithGoogle} />;
  }

  const filteredNotes = activeFilter ? notes.filter(n => n.category?.id === activeFilter) : notes;

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <Header session={session} onSignOut={signOut} isOnline={isOnline} isSyncing={isSyncing} />
      {notificationPermission === 'default' && (
        <NotificationPermissionBanner status="default" onRequest={handleRequestNotificationPermission} />
      )}
      {notificationPermission === 'denied' && <NotificationPermissionBanner status="denied" />}
      
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
        {recentlyDeleted && (
          <UndoToast
            message="Note deleted."
            onUndo={handleUndoDelete}
          />
        )}
        
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/60 z-[1100] flex justify-center items-center">
             <SpinnerIcon className="w-10 h-10 animate-spin text-white"/>
          </div>
        }>
          {showNoteForm && (
            <NoteForm
              noteToEdit={editingNote}
              onSave={handleSaveNote}
              onCancel={() => { setShowNoteForm(false); setEditingNote(null); }}
              categories={MOCK_CATEGORIES}
              userLocation={location}
              onError={setError}
            />
          )}
        </Suspense>

        <div className="mb-6">
          <Suspense fallback={<div className="bg-slate-700 rounded-lg h-[60vh] flex items-center justify-center text-gray-400">Loading Map...</div>}>
            <MapView notes={notes} userLocation={location} hasMoreOnlineNotes={hasMoreOnlineNotes} />
          </Suspense>
        </div>

        <CategoryFilter categories={MOCK_CATEGORIES} activeFilter={activeFilter} onSelectFilter={setActiveFilter} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note, index) => {
            if (filteredNotes.length === index + 1) {
              return (
                <div ref={lastNoteElementRef} key={note.id}>
                  <NoteCard
                    note={note}
                    userLocation={location}
                    onDelete={handleDeleteNote}
                    onEdit={(noteToEdit) => { setEditingNote(noteToEdit); setShowNoteForm(true); }}
                  />
                </div>
              );
            }
            return (
              <NoteCard
                key={note.id}
                note={note}
                userLocation={location}
                onDelete={handleDeleteNote}
                onEdit={(noteToEdit) => { setEditingNote(noteToEdit); setShowNoteForm(true); }}
              />
            );
          })}
        </div>
        
        {isLoadingMore && (
            <p className="text-center text-gray-400 mt-8">Loading more notes...</p>
        )}

        {!hasMoreOnlineNotes && notes.length > 0 && !isLoadingMore && (
            <p className="text-center text-gray-500 mt-8">You've reached the end.</p>
        )}

        {filteredNotes.length === 0 && !isSyncing && (
             <div className="text-center py-16 text-gray-500">
                <p className="text-lg mb-2">No notes here yet.</p>
                <p>Click the '+' button to add your first note!</p>
            </div>
        )}

      </main>
      <button
        onClick={() => { setEditingNote(null); setShowNoteForm(true); }}
        className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition-transform transform hover:scale-110"
        aria-label="Add new note"
      >
        <PlusIcon className="w-8 h-8" />
      </button>
    </div>
  );
};

export default App;