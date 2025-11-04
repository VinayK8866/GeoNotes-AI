import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Session } from '@supabase/supabase-js';
import { Note, Category } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { getDistance } from './utils/geolocation';
import { REMINDER_RADIUS_METERS } from './constants';
import * as db from './utils/db';
import { supabase } from './supabaseClient';
import { Header } from './components/Header';
import { NoteCard } from './components/NoteCard';
import { NoteForm } from './components/NoteForm';
import { CategoryFilter } from './components/CategoryFilter';
import { UndoToast } from './components/UndoToast';
import { ErrorToast } from './components/ErrorToast';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { PlusIcon, LocationPinIcon } from './components/Icons';

const MapView = lazy(() => import('./components/MapView'));

const MOCK_CATEGORIES: Category[] = [
    { id: 'cat-1', name: 'Work', color: 'bg-blue-500' },
    { id: 'cat-2', name: 'Personal', color: 'bg-green-500' },
    { id: 'cat-3', name: 'Shopping', color: 'bg-yellow-500' },
    { id: 'cat-4', name: 'Ideas', color: 'bg-purple-500' },
];

const Login: React.FC<{ onLogin: () => Promise<void> }> = ({ onLogin }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
    <div className="text-center p-8 max-w-md">
      <div className="flex items-center justify-center mb-6">
        <LocationPinIcon className="h-12 w-12 text-indigo-400" />
        <h1 className="text-4xl font-bold ml-4 tracking-tight">
          GeoNotes <span className="text-indigo-400">AI</span>
        </h1>
      </div>
      <p className="text-gray-400 mb-8">Your intelligent, location-aware notebook. Sign in to continue.</p>
      <button
        onClick={onLogin}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors w-full flex items-center justify-center"
      >
        Sign In with Google
      </button>
    </div>
  </div>
);

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const [notes, setNotes] = useState<Note[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    
    const [lastDeletedNote, setLastDeletedNote] = useState<Note | null>(null);
    const [showUndoToast, setShowUndoToast] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
    const [notifiedNoteIds, setNotifiedNoteIds] = useState(new Set<string>());

    const { location, error: locationError } = useGeolocation();

    useEffect(() => {
        if (typeof Notification !== 'undefined') {
            setNotificationPermission(Notification.permission);
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Syncing logic
    const syncData = useCallback(async () => {
        if (!isOnline || isSyncing || !session) return;

        const queuedUpdates = await db.getQueuedUpdates();
        if (queuedUpdates.length === 0) return;

        setIsSyncing(true);
        setError(null);
        
        try {
            for (const update of queuedUpdates) {
                if (update.type === 'SAVE') {
                    const noteToSave = { ...update.payload, user_id: session.user.id };
                    const { error } = await supabase.from('notes').upsert(noteToSave);
                    if (error) throw error;
                } else if (update.type === 'DELETE') {
                    const { error } = await supabase.from('notes').delete().eq('id', update.payload.id);
                    if (error && error.code !== 'PGRST204') throw error;
                }
                await db.deleteNoteFromQueue(update.id);
            }
        } catch (err: any) {
            console.error("Sync failed:", err);
            setError('Failed to sync changes. They will be retried.');
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline, isSyncing, session]);

    // Initial Data Load & Sync
    useEffect(() => {
        const loadAndSyncNotes = async () => {
            if (!session) return;
            
            setLoading(true);
            const localNotes = await db.getNotesFromDB();
            setNotes(localNotes);

            if (isOnline) {
                const { data: serverNotes, error: fetchError } = await supabase
                    .from('notes')
                    .select('*')
                    .eq('user_id', session.user.id);

                if (fetchError) {
                    setError('Could not fetch notes from server.');
                } else if (serverNotes) {
                    await db.saveAllNotesToDB(serverNotes);
                    setNotes(serverNotes.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
                }
                await syncData();
            }
            setLoading(false);
        };
        loadAndSyncNotes();
    }, [session, isOnline, syncData]);
    
    // Real-Time Subscription
    useEffect(() => {
        if (!session) return;

        const channel = supabase
            .channel('realtime-notes')
            .on<Note>('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${session.user.id}` },
                (payload) => {
                    console.log('Realtime change received!', payload);
                    if (payload.eventType === 'INSERT') {
                        const newNote = payload.new as Note;
                        setNotes(prev => [newNote, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
                        db.saveNoteToDB(newNote);
                    }
                    if (payload.eventType === 'UPDATE') {
                        const updatedNote = payload.new as Note;
                        setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
                        db.saveNoteToDB(updatedNote);
                    }
                    if (payload.eventType === 'DELETE') {
                        const { id } = payload.old as { id: string };
                        setNotes(prev => prev.filter(n => n.id !== id));
                        db.deleteNoteFromDB(id);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session]);


    // Online/Offline status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Geo-fenced Notifications
    useEffect(() => {
        if (location && notificationPermission === 'granted' && navigator.serviceWorker.ready) {
            const nowNotified = new Set(notifiedNoteIds);
            let changed = false;

            notes.forEach(note => {
                if (note.location) {
                    const distance = getDistance(location, note.location.coordinates);
                    const isCurrentlyNearby = distance <= REMINDER_RADIUS_METERS;
                    const wasAlreadyNotified = notifiedNoteIds.has(note.id);

                    if (isCurrentlyNearby && !wasAlreadyNotified) {
                        navigator.serviceWorker.ready.then(registration => {
                            registration.showNotification(note.title, {
                                body: `You are near "${note.location?.name}".\n${note.content.substring(0, 100)}`,
                                icon: '/vite.svg',
                                tag: note.id
                            });
                        });
                        nowNotified.add(note.id);
                        changed = true;
                    } else if (!isCurrentlyNearby && wasAlreadyNotified) {
                        nowNotified.delete(note.id);
                        changed = true;
                    }
                }
            });
            if (changed) {
                setNotifiedNoteIds(nowNotified);
            }
        }
    }, [location, notes, notificationPermission, notifiedNoteIds]);

    const handleSaveNote = async (note: Note) => {
        const isEditing = !!noteToEdit;
        const newNotes = isEditing
            ? notes.map(n => (n.id === note.id ? note : n))
            : [note, ...notes];
        
        setNotes(newNotes.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        await db.saveNoteToDB(note);
        await db.queueUpdate({ type: 'SAVE', payload: note });
        syncData();
        
        setIsFormOpen(false);
        setNoteToEdit(null);
    };

    const handleDeleteNote = async (id: string) => {
        const noteToDelete = notes.find(n => n.id === id);
        if (!noteToDelete) return;
        
        setLastDeletedNote(noteToDelete);
        setShowUndoToast(true);

        const newNotes = notes.filter(n => n.id !== id);
        setNotes(newNotes);

        const timer = setTimeout(async () => {
            await db.deleteNoteFromDB(id);
            await db.queueUpdate({ type: 'DELETE', payload: { id } });
            syncData();
            setShowUndoToast(false);
            setLastDeletedNote(null);
        }, 5000);
        
        (noteToDelete as any)._deleteTimer = timer;
    };
    
    const handleUndoDelete = async () => {
        if (!lastDeletedNote) return;
        
        clearTimeout((lastDeletedNote as any)._deleteTimer);
        setNotes(prevNotes => [lastDeletedNote, ...prevNotes].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        
        setShowUndoToast(false);
        setLastDeletedNote(null);
    };

    const handleEditNote = (note: Note) => {
        setNoteToEdit(note);
        setIsFormOpen(true);
    };

    const handleRequestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
        }
    };

    async function signInWithGoogle() {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
    }

    async function signOut() {
        await supabase.auth.signOut();
    }
    
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
    }

    if (!session) {
        return <Login onLogin={signInWithGoogle} />;
    }

    const filteredNotes = activeFilter
        ? notes.filter(note => note.category?.id === activeFilter)
        : notes;

    return (
        <div className="bg-gray-900 text-gray-100 min-h-screen font-sans">
            <Header session={session} onSignOut={signOut} isOnline={isOnline} isSyncing={isSyncing} />
            
            {notificationPermission !== 'granted' && (
                <NotificationPermissionBanner 
                    status={notificationPermission} 
                    onRequest={handleRequestNotificationPermission} 
                />
            )}

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {isFormOpen && (
                    <NoteForm 
                        noteToEdit={noteToEdit} 
                        onSave={handleSaveNote} 
                        onCancel={() => { setIsFormOpen(false); setNoteToEdit(null); }}
                        categories={MOCK_CATEGORIES}
                        userLocation={location}
                    />
                )}
                
                <Suspense fallback={<div className="bg-slate-700 rounded-lg h-[60vh] flex items-center justify-center text-white">Loading Map...</div>}>
                    <MapView notes={filteredNotes} userLocation={location} />
                </Suspense>

                <div className="mt-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold tracking-tight text-white">Your Notes</h2>
                        <button 
                            onClick={() => { setNoteToEdit(null); setIsFormOpen(true); }}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                        >
                           <PlusIcon className="w-5 h-5" />
                           Add Note
                        </button>
                    </div>

                    <CategoryFilter
                        categories={MOCK_CATEGORIES}
                        activeFilter={activeFilter}
                        onSelectFilter={setActiveFilter}
                    />

                    {filteredNotes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredNotes.map(note => (
                                <NoteCard 
                                    key={note.id}
                                    note={note}
                                    userLocation={location}
                                    onDelete={handleDeleteNote}
                                    onEdit={handleEditNote}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 px-6 bg-gray-800 rounded-lg">
                            <h3 className="text-xl font-semibold text-white">No notes yet</h3>
                            <p className="text-gray-400 mt-2">Click "Add Note" to create your first location-based reminder.</p>
                        </div>
                    )}
                </div>
            </main>
            
            {showUndoToast && lastDeletedNote && (
                <UndoToast message={`Note "${lastDeletedNote.title}" deleted.`} onUndo={handleUndoDelete} />
            )}
            {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}
            {locationError && <ErrorToast message={locationError} onDismiss={() => {}} />}
        </div>
    );
};

export default App;
