


import React, { useState, useEffect, useCallback, lazy, Suspense, useRef, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { Note, Category, SortOption } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { useTheme } from './hooks/useTheme';
import { useSubscription } from './hooks/useSubscription';
import { getDistance } from './utils/geolocation';
import { REMINDER_RADIUS_METERS, NOTES_PER_PAGE } from './constants';
import * as db from './utils/db';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { NoteCard } from './components/NoteCard';
import { CategoryFilter } from './components/CategoryFilter';
import { UndoToast } from './components/UndoToast';
import { ErrorToast } from './components/ErrorToast';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { UpgradeModal } from './components/UpgradeModal';
import { PlusIcon, SpinnerIcon, CloseIcon, AiIcon, ArrowsUpDownIcon, LocationPinIcon, Bars3Icon } from './components/Icons';
import { searchNotesWithAi } from './services/geminiService';
import { NoteCardSkeleton } from './components/NoteCardSkeleton';
import { EmptyState } from './components/EmptyState';
import { LandingPage } from './components/LandingPage';
import { PricingPage } from './components/PricingPage';
import { OnboardingFlow } from './components/OnboardingFlow';
import { SEO } from './components/SEO';
import { analytics, trackEvent } from './services/analyticsService';

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

  // Subscription & Pricing
  const [showPricingPage, setShowPricingPage] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeLimitType, setUpgradeLimitType] = useState<'notes' | 'aiSearches'>('notes');
  const subscription = useSubscription(session?.user?.id);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    return localStorage.getItem('onboarding_completed') === 'true';
  });

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { location, error: locationError, requestLocation } = useGeolocation();
  const noteRefs = useRef(new Map<string, HTMLDivElement>());

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

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

  // Track explicit sign out to prevent auth listener race conditions
  const isSignOut = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    // Safety timeout to prevent stuck loading screen
    const timeoutId = setTimeout(() => {
      console.warn('Auth loading timeout - forcing UI to show');
      setIsAuthLoading(false);
    }, 2000);

    setIsAuthLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // If we are explicitly signing out, ignore session updates that might trigger loading
      if (isSignOut.current) {
        setIsAuthLoading(false);
        return;
      }

      setSession(session);
      if (session) {
        await syncAndFetchInitialNotes(session).catch(console.error);
      } else {
        await db.clearLocalData();
        setNotes([]);
        setActiveFilter(null);
        setSearchQuery('');
        setSortOption('created_at_desc');
        setViewMode('active');
        setAiSearchResult(null);
        setRecentlyArchived(null);
        setIsSyncing(false);
      }

      clearTimeout(timeoutId);
      setIsAuthLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // ... (lines 193-467 skipped)

  const handleSignOut = async () => {
    try {
      // Set flag to block auth listener from overriding state
      isSignOut.current = true;

      // Immediately clear local session to update UI instantly
      setSession(null);
      setIsAuthLoading(false); // Ensure loading is false immediately

      // Perform cleanup in background
      await db.clearLocalData();
      setNotes([]);
      setActiveFilter(null);
      setSearchQuery('');
      setSortOption('created_at_desc');
      setViewMode('active');
      setAiSearchResult(null);
      setRecentlyArchived(null);
      setIsSyncing(false);
      localStorage.removeItem('onboarding_completed');

      // Call Supabase signOut (best effort)
      await supabase.auth.signOut();
    } catch (error: any) {
      console.error('Sign out error:', error);
    } finally {
      // Reset flag after a delay to allow future sign-ins
      setTimeout(() => {
        isSignOut.current = false;
      }, 1000);
    }
  };

  // Initialize analytics
  useEffect(() => {
    const initAnalytics = async () => {
      await analytics.initialize();
    };
    initAnalytics();
  }, []);

  // Track user and show onboarding for new users
  const hasTrackedSignIn = useRef(false);

  useEffect(() => {
    if (session?.user) {
      if (!hasTrackedSignIn.current) {
        analytics.identify(session.user.id, {
          plan_type: subscription?.subscription.tier || 'free',
          signup_date: session.user.created_at,
        });
        trackEvent.signIn(session.user.app_metadata.provider || 'email');
        hasTrackedSignIn.current = true;
      }

      const isNewUser = new Date(session.user.created_at).getTime() > Date.now() - 60000;
      if (!hasCompletedOnboarding && (isNewUser || notes.length === 0)) {
        setShowOnboarding(true);
      }
    } else {
      hasTrackedSignIn.current = false;
    }
  }, [session?.user?.id, hasCompletedOnboarding, notes.length, subscription?.subscription.tier]);

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

    if (isNew && subscription && !subscription.canCreateNote()) {
      setUpgradeLimitType('notes');
      setShowUpgradeModal(true);
      setShowNoteForm(false);
      return;
    }

    const optimisticNotes = isNew ? [note, ...notes] : notes.map(n => (n.id === note.id ? note : n));
    setNotes(optimisticNotes);
    setShowNoteForm(false);
    setEditingNote(null);

    await db.saveNoteToDB(note);

    if (isNew && subscription) {
      subscription.updateUsage('notesCount', 1);
      trackEvent.noteCreated(note.category?.name, !!note.location);
    } else {
      trackEvent.noteEdited();
    }

    if (isOnline && session) {
      await db.queueUpdate({ type: 'SAVE', payload: note });
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
      await syncAndFetchInitialNotes(session);
    } else {
      await db.queueUpdate({ type: 'SAVE', payload: updatedNote });
    }
  };

  const handleDeleteNotePermanently = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this note? This action cannot be undone.')) return;

    setNotes(notes.filter(n => n.id !== id));

    await db.deleteNoteFromDB(id);
    if (isOnline && session) {
      await db.queueUpdate({ type: 'DELETE', payload: { id } });
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
      await syncAndFetchInitialNotes(session);
    } else {
      await db.queueUpdate({ type: 'SAVE', payload: originalNote });
    }
    setRecentlyArchived(null);
  };

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return;

    if (subscription && !subscription.canUseAISearch()) {
      setUpgradeLimitType('aiSearches');
      setShowUpgradeModal(true);
      return;
    }

    setIsAiSearching(true);
    setAiSearchResult(null);
    setError(null);
    try {
      const result = await searchNotesWithAi(searchQuery, notes);
      setAiSearchResult(result);

      if (subscription) {
        subscription.updateUsage('aiSearchesCount', 1);
      }
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

  const activeNotesCount = useMemo(() => notes.filter(n => !n.isArchived).length, [notes]);

  const sidebarOffset = session ? (sidebarCollapsed ? '72px' : '260px') : '0px';

  const renderContent = () => {
    if (isSyncing && notes.length === 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger-children">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger-children">
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
            <div className="flex items-center gap-2 text-slate-500">
              <SpinnerIcon className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading more notes…</span>
            </div>
          )}
          {!hasMoreOnlineNotes && notes.length > 0 && !isSyncing && (
            <p className="text-sm text-slate-500 dark:text-slate-500">You've reached the end.</p>
          )}
        </div>
      </>
    );
  };

  // ========================
  // Supabase not configured
  // ========================
  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0b1121] justify-center items-center p-4">
        <div className="pro-card text-center p-10 max-w-lg mx-auto animate-fade-in-up">
          <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Configuration Required</h1>
          <p className="text-sm text-slate-600 dark:text-slate-500 mb-6">Set your Supabase credentials to connect the app to its backend.</p>
          <div className="text-left bg-slate-50 dark:bg-[#1a2540] p-4 rounded-lg font-mono text-xs text-slate-700 dark:text-slate-300 space-y-1 border border-slate-200 dark:border-[#1e2d45]">
            <p><span className="text-indigo-600 dark:text-indigo-400">SUPABASE_URL</span>="your-url"</p>
            <p><span className="text-indigo-600 dark:text-indigo-400">SUPABASE_ANON_KEY</span>="your-key"</p>
          </div>
        </div>
      </div>
    );
  }

  // ========================
  // Auth loading
  // ========================
  if (isAuthLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0b1121] justify-center items-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <SpinnerIcon className="w-6 h-6 text-white animate-spin" />
          </div>
          <span className="text-sm font-medium text-slate-500">Loading GeoNotes AI…</span>
        </div>
      </div>
    );
  }

  // ========================
  // Not logged in → Landing
  // ========================
  if (!session) {
    return <LandingPage onSignIn={handleSignIn} />;
  }

  // ========================
  // Main authenticated app
  // ========================
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0b1121] text-slate-900 dark:text-white transition-colors duration-300 relative overflow-x-hidden">

      {/* Sidebar */}
      <Sidebar
        session={session}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onViewPricing={() => {
          trackEvent.pricingPageViewed();
          setShowPricingPage(true);
        }}
        onSignOut={handleSignOut}
        subscriptionTier={subscription?.subscription.tier || 'free'}
        notesCount={activeNotesCount}
        isMobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main content area */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: window.innerWidth >= 768 ? sidebarOffset : '0px' }}
      >
        {/* Header */}
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
          onViewPricing={() => {
            trackEvent.pricingPageViewed();
            setShowPricingPage(true);
          }}
          subscriptionTier={subscription?.subscription.tier || 'free'}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        {notificationPermission !== 'granted' && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <NotificationPermissionBanner status={notificationPermission} onRequest={() => Notification.requestPermission().then(setNotificationPermission)} />
          </div>
        )}

        <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Welcome Strip - Dashboard hero */}
          <div className="welcome-strip animate-fade-in-up">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-lg sm:text-xl font-bold mb-1">
                  Welcome back{session?.user?.user_metadata?.full_name ? `, ${session.user.user_metadata.full_name.split(' ')[0]}` : ''} 👋
                </h1>
                <p className="text-sm opacity-80">Here's what's happening with your notes today.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="stat-mini">
                  <span className="stat-value">{activeNotesCount}</span>
                  <span className="stat-label">Notes</span>
                </div>
                <div className="stat-mini">
                  <span className="stat-value">{notes.filter(n => n.location).length}</span>
                  <span className="stat-label">Pinned</span>
                </div>
                <div className="stat-mini">
                  <span className="stat-value">{notes.filter(n => n.isArchived).length}</span>
                  <span className="stat-label">Archived</span>
                </div>
              </div>
            </div>
          </div>

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

          {/* AI Search Result Modal */}
          {aiSearchResult && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1200] flex justify-center items-center p-4 animate-fade-in" onClick={() => setAiSearchResult(null)}>
              <div className="glass-card w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-200/60 dark:border-[#1e2d45] flex justify-between items-center">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center"><AiIcon className="w-4 h-4 text-white" /></div>
                    AI Response
                  </h3>
                  <button onClick={() => setAiSearchResult(null)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><CloseIcon className="w-5 h-5" /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{aiSearchResult}</p>
                </div>
              </div>
            </div>
          )}

          {/* Map Section */}
          <div className="section-card animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="section-header">
              <div className="section-icon bg-blue-100 dark:bg-blue-900/30">
                <LocationPinIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span>Map View</span>
              <span className="ml-auto text-[11px] font-medium text-slate-500 dark:text-slate-500">
                {notes.filter(n => n.location && !n.isArchived).length} pinned locations
              </span>
            </div>
            <Suspense fallback={<div className="bg-slate-100 dark:bg-[#131c2e] h-[40vh] min-h-[280px] flex items-center justify-center text-slate-500 text-sm">Loading Map...</div>}>
              <MapView notes={processedNotes} userLocation={location} activeNoteId={activeNoteId} onMarkerClick={handleMarkerClick} theme={effectiveTheme} />
            </Suspense>
          </div>

          {/* Toolbar: Filters + Sort */}
          <div className="toolbar animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            {/* View Mode Label */}
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {viewMode === 'active' ? 'My Notes' : 'Archived'}
              </h2>
              {processedNotes.length > 0 && (
                <span className="badge badge-primary">{processedNotes.length}</span>
              )}
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

            {/* Category Filter */}
            <CategoryFilter categories={DEFAULT_CATEGORIES} activeFilter={activeFilter} onSelectFilter={setActiveFilter} />

            {/* Sort Dropdown */}
            <div className="relative ml-auto">
              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value as SortOption)}
                className="text-xs font-medium bg-white dark:bg-[#131c2e] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e2d45] rounded-lg py-2 pl-3 pr-9 appearance-none shadow-xs hover:border-slate-300 dark:hover:border-[#2a3f5f] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all cursor-pointer"
                aria-label="Sort notes"
              >
                <option value="created_at_desc">Newest first</option>
                <option value="created_at_asc">Oldest first</option>
                <option value="title_asc">Title: A → Z</option>
                <option value="title_desc">Title: Z → A</option>
                {location && <option value="distance_asc">Nearest</option>}
              </select>
              <ArrowsUpDownIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Content */}
          {renderContent()}
        </main>
      </div>

      {/* Pricing Page Overlay */}
      {showPricingPage && (
        <div className="fixed inset-0 bg-white dark:bg-[#0b1121] z-[2000] overflow-y-auto animate-fade-in">
          <PricingPage
            onSelectPlan={(priceId) => {
              if (priceId === 'free') {
                setShowPricingPage(false);
                return;
              }
              setShowPricingPage(false);
              subscription?.upgradeToPro(priceId.includes('yearly') ? 'year' : 'month');
            }}
            currentPlan={subscription?.subscription.tier || 'free'}
          />
          <button
            onClick={() => setShowPricingPage(false)}
            className="fixed top-4 right-4 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full p-2 shadow-lg z-[2001] transition-colors"
            aria-label="Close pricing"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Onboarding Flow */}
      {showOnboarding && (
        <OnboardingFlow
          onComplete={() => {
            setShowOnboarding(false);
            setHasCompletedOnboarding(true);
            localStorage.setItem('onboarding_completed', 'true');
          }}
          onSkip={() => {
            setShowOnboarding(false);
            setHasCompletedOnboarding(true);
            localStorage.setItem('onboarding_completed', 'true');
          }}
          userName={session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0]}
          onRequestLocation={requestLocation}
        />
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && subscription && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          onUpgrade={() => {
            setShowUpgradeModal(false);
            subscription.upgradeToPro('month');
          }}
          limitType={upgradeLimitType}
          currentCount={upgradeLimitType === 'notes' ? subscription.usage.notesCount : subscription.usage.aiSearchesCount}
          limit={upgradeLimitType === 'notes' ? (subscription.tierLimits.notesLimit || 50) : (subscription.tierLimits.aiSearchesPerDay || 5)}
        />
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => { setEditingNote(null); setShowNoteForm(true); }}
        className="fixed bottom-8 right-8 btn-gradient rounded-xl p-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all z-50 group"
        aria-label="Add new note"
      >
        <PlusIcon className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
      </button>
    </div>
  );
};

export default App;