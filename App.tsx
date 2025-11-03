import React, { useState, useEffect, useMemo } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import { Note, Category } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { Header } from './components/Header';
import { NoteCard } from './components/NoteCard';
import { NoteForm } from './components/NoteForm';
import { CategoryFilter } from './components/CategoryFilter';
import { UndoToast } from './components/UndoToast';
import { PlusIcon, LocationPinIcon } from './components/Icons';

// In a real production app, these values should be stored in environment variables.
const supabaseUrl = 'https://plgpxrwycqsbrhsvzzcn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsZ3B4cnd5Y3FzYnJoc3Z6emNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTgxNzE3NTMsImV4cCI6MjAzMzc0Nzc1M30.bCd_3naPxgC3sw-4N3v2yv4dkElq3D6g3522j2j1GSA';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const initialCategories: Category[] = [
  { id: '1', name: 'Work', color: 'bg-blue-500' },
  { id: '2', name: 'Personal', color: 'bg-green-500' },
  { id: '3', name: 'Shopping', color: 'bg-yellow-500' },
  { id: '4', name: 'Urgent', color: 'bg-red-500' },
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
  const [categories] = useState<Category[]>(initialCategories);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const [lastDeletedNote, setLastDeletedNote] = useState<Note | null>(null);
  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null);
  
  const { location, error: geolocationError, requestLocation } = useGeolocation();
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  useEffect(() => {
    if (session) {
      fetchNotes();
    }
  }, [session]);

  const fetchNotes = async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  // FIX: The property is named `created_at` not `createdAt`.
  const handleSaveNote = async (noteData: Omit<Note, 'id' | 'created_at' | 'isArchived' | 'user_id'>, id?: string) => {
    if (!session) return;

    try {
      if (id) {
        const { data, error } = await supabase.from('notes').update(noteData).eq('id', id).select().single();
        if (error) throw error;
        setNotes(notes.map(n => n.id === id ? data : n));
      } else {
        const newNote = { ...noteData, user_id: session.user.id };
        const { data, error } = await supabase.from('notes').insert(newNote).select().single();
        if (error) throw error;
        setNotes([data, ...notes]);
      }
    } catch (error) {
      console.error("Error saving note:", error);
    }

    setIsFormVisible(false);
    setEditingNote(null);
  };

  const handleDeleteNote = async (id: string) => {
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;

    if(undoTimeoutId) clearTimeout(undoTimeoutId);
    
    setLastDeletedNote(noteToDelete);
    setNotes(notes.filter(n => n.id !== id)); // Optimistic UI update

    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
      console.error("Failed to delete note from DB:", error);
      setNotes(notes); // Revert UI change
    }
    
    const timeoutId = setTimeout(() => setLastDeletedNote(null), 5000);
    setUndoTimeoutId(timeoutId);
  };

  const handleUndoDelete = async () => {
    if (lastDeletedNote) {
      // Re-insert the note into the database
      const { error } = await supabase.from('notes').insert(lastDeletedNote);
      if (!error) {
        // FIX: The property is named `created_at` not `createdAt`.
        setNotes(prevNotes => [...prevNotes, lastDeletedNote].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setLastDeletedNote(null);
        if(undoTimeoutId) clearTimeout(undoTimeoutId);
        setUndoTimeoutId(null);
      } else {
        console.error("Failed to undo delete:", error);
        // If undo fails, refetch to sync with DB state
        fetchNotes();
      }
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsFormVisible(true);
  };

  const handleAddNewNote = () => {
    setEditingNote(null);
    setIsFormVisible(true);
  };

  const handleCancelForm = () => {
    setIsFormVisible(false);
    setEditingNote(null);
  };

  const filteredNotes = useMemo(() => {
    if (!activeFilter) return notes;
    return notes.filter(note => note.category?.id === activeFilter);
  }, [notes, activeFilter]);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!session) {
    return <Login onLogin={signInWithGoogle} />;
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <Header session={session} onSignOut={signOut} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {geolocationError && (
          <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-md mb-6" role="alert">
            <p><strong className="font-bold">Geolocation Error:</strong> {geolocationError}</p>
            <button onClick={requestLocation} className="mt-2 text-sm underline">Try again</button>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold tracking-tight">Your Notes</h2>
            <button onClick={handleAddNewNote} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center">
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Note
            </button>
        </div>

        <CategoryFilter categories={categories} activeFilter={activeFilter} onSelectFilter={setActiveFilter} />

        {filteredNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map(note => (
              <NoteCard key={note.id} note={note} userLocation={location} onDelete={handleDeleteNote} onEdit={handleEditNote} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-6 bg-gray-800 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-300">No notes yet</h3>
            <p className="text-gray-400 mt-2">Click "Add Note" to create your first geo-tagged reminder.</p>
          </div>
        )}

        {isFormVisible && (
          <NoteForm 
            onSave={handleSaveNote} 
            onCancel={handleCancelForm}
            existingNote={editingNote}
            categories={categories}
            userLocation={location}
          />
        )}
      </main>

      {lastDeletedNote && (
        <UndoToast message="Note deleted." onUndo={handleUndoDelete} />
      )}
    </div>
  );
};

export default App;