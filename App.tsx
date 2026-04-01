


import React, { useState, useEffect, useCallback, lazy, Suspense, useRef, useMemo, startTransition } from 'react';
import { Session } from '@supabase/supabase-js';
import { Note, Category, SortOption } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { useTheme } from './hooks/useTheme';
import { useSubscription } from './hooks/useSubscription';
import { useAuth } from './hooks/useAuth';
import { getDistance } from './utils/geolocation';
import { REMINDER_RADIUS_METERS, NOTES_PER_PAGE } from './constants';
import * as db from './utils/db';
import { SettingsModal } from './components/SettingsModal';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { LocationAccuracy } from './types';
import * as cryptoUtils from './utils/crypto';
import { joinWaitlist } from './services/waitlistService';
import { Capacitor } from '@capacitor/core';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav, MobileTab } from './components/MobileBottomNav';
import { NoteCard } from './components/NoteCard';
import { SuccessToast } from './components/SuccessToast';
import { CategoryFilter } from './components/CategoryFilter';
import { UndoToast } from './components/UndoToast';
import { ErrorToast } from './components/ErrorToast';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';
import { SEO } from './components/SEO';
import { MobileAuth, MobileSplash } from './components/MobileAuth';
import { PlusIcon, SpinnerIcon, CloseIcon, AiIcon, ArrowsUpDownIcon, LocationPinIcon, Bars3Icon, CogIcon, SearchIcon, UserCircleIcon } from './components/Icons';
import { BottomDrawer } from './components/BottomDrawer';
import { searchNotesWithAi } from './services/geminiService';
import { analytics, trackEvent } from './services/analyticsService';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { NoteCardSkeleton } from './components/NoteCardSkeleton';
import { EmptyState } from './components/EmptyState';
import { AppSkeleton } from './components/AppSkeleton';

const MapView = lazy(() => import('./components/MapView'));
const NoteForm = lazy(() => import('./components/NoteForm'));
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
const PricingPage = lazy(() => import('./components/PricingPage').then(m => ({ default: m.PricingPage })));
const OnboardingFlow = lazy(() => import('./components/OnboardingFlow').then(m => ({ default: m.OnboardingFlow })));
const AppreciationModal = lazy(() => import('./components/AppreciationModal').then(m => ({ default: m.AppreciationModal })));
const UpgradeModal = lazy(() => import('./components/UpgradeModal').then(m => ({ default: m.UpgradeModal })));

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Work', color: 'bg-blue-500' },
  { id: 'cat-2', name: 'Personal', color: 'bg-green-500' },
  { id: 'cat-3', name: 'Shopping', color: 'bg-yellow-500' },
  { id: 'cat-4', name: 'Ideas', color: 'bg-purple-500' },
];

const App: React.FC = () => {
  const { theme, setTheme, effectiveTheme } = useTheme();

  // Use centralized auth hook
  const { session, isLoading: isAuthLoading, signIn: authSignIn, signOut: authSignOut, isSupabaseConfigured } = useAuth();

  const [notes, setNotes] = useState<Note[]>([]);
  const [totalNotesCount, setTotalNotesCount] = useState(0);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [recentlyArchived, setRecentlyArchived] = useState<Note | null>(null);
  const [page, setPage] = useState(1);
  const [hasMoreOnlineNotes, setHasMoreOnlineNotes] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(new Date());
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('notes');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [sentNotifications, setSentNotifications] = useState<Set<string>>(() => {
    if (typeof localStorage === 'undefined') return new Set();
    const saved = localStorage.getItem('sentNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('created_at_desc');
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState<string | null>(null);
  const [showAppreciation, setShowAppreciation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [accuracy, setAccuracy] = useState<LocationAccuracy>(() => {
    if (typeof localStorage === 'undefined') return 'high';
    return (localStorage.getItem('location_accuracy') as LocationAccuracy) || 'high';
  });
  const [encryptionEnabled, setEncryptionEnabled] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('encryption_enabled') === 'true';
  });
  const [masterPassword, setMasterPassword] = useState('');
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);

  // Subscription & Pricing
  const [showPricingPage, setShowPricingPage] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeLimitType, setUpgradeLimitType] = useState<'notes' | 'aiSearches'>('notes');
  const subscription = useSubscription(session?.user?.id);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('onboarding_completed') === 'true';
  });

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Native Background Geolocation Initialization
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const startBackgroundTracking = async () => {
        try {
          const { BackgroundGeolocation } = await import('@capacitor-community/background-geolocation');
          const watcherId = await BackgroundGeolocation.addWatcher(
            {
              backgroundTitle: "GeoNotes Active",
              backgroundMessage: "Tracking for location reminders",
              requestPermissions: true,
              stale: false,
              distanceFilter: 10 // Update every 10 meters
            },
            (location: any, error: any) => {
              if (error) {
                console.error('BG Geo Error:', error);
                return;
              }
              if (location) {
                // Background update logic
                console.log('BG update:', location);
              }
            }
          );
          return () => BackgroundGeolocation.removeWatcher({ id: watcherId });
        } catch (e) {
          console.error('Failed to init BG Geolocation:', e);
        }
      };
      startBackgroundTracking();
    }
  }, []);

  const { location, error: locationError, requestLocation } = useGeolocation({
    enableHighAccuracy: accuracy === 'high',
    timeout: 20000,
    maximumAge: 60000,
    autoEnable: !!session
  });
  useEffect(() => {
    localStorage.setItem('location_accuracy', accuracy);
  }, [accuracy]);

  useEffect(() => {
    localStorage.setItem('encryption_enabled', encryptionEnabled.toString());
  }, [encryptionEnabled]);

  // Derive key when password changes
  useEffect(() => {
    if (encryptionEnabled && masterPassword && session?.user.id) {
        cryptoUtils.deriveKey(masterPassword, session.user.id).then(setCryptoKey);
    } else {
        setCryptoKey(null);
    }
  }, [masterPassword, encryptionEnabled, session?.user.id]);

  const [decryptedNotes, setDecryptedNotes] = useState<Note[]>([]);

  useEffect(() => {
    const performDecryption = async () => {
        if (!encryptionEnabled || !cryptoKey) {
            setDecryptedNotes(notes);
            return;
        }

        const results = await Promise.all(notes.map(async (n) => {
            if (n.isEncrypted) {
                try {
                    const decryptedTitle = await cryptoUtils.decryptText(n.title, cryptoKey);
                    const decryptedContent = await cryptoUtils.decryptText(n.content, cryptoKey);
                    return { ...n, title: decryptedTitle, content: decryptedContent, isEncrypted: false };
                } catch (err) {
                    return { ...n, title: '🔒 Encrypted Note', content: 'Unlock with your Master Password in settings.' };
                }
            }
            return n;
        }));
        setDecryptedNotes(results);
    };

    performDecryption();
  }, [notes, encryptionEnabled, cryptoKey]);

  // Keyboard shortcut: ⌘K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const noteRefs = useRef(new Map<string, HTMLDivElement>());

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const syncAndFetchInitialNotes = useCallback(async (currentSession: Session) => {
    setIsSyncing(true);

    // Always load local data first for instant UI (stale-while-revalidate)
    try {
      const localNotes = await db.getNotesFromDB();
      if (localNotes && localNotes.length > 0) {
        setNotes(localNotes);
        setTotalNotesCount(localNotes.length); // Temporary local count
      }
    } catch (e) {
      console.warn('Failed to load local notes:', e);
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError("You are offline. Showing locally saved data.");
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

      // Fetch Count
      const { count, error: countError } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentSession.user.id)
        .eq('isArchived', false); // Only count active notes for the badge

      if (!countError && count !== null) {
        setTotalNotesCount(count);
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
        setLastSynced(new Date());
      }
    } catch (err: any) {
      setError(`Could not sync with server. Reason: ${err.message}. Showing local data.`);
      const localNotes = await db.getNotesFromDB();
      setNotes(localNotes);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // React to session changes to fetch data
  useEffect(() => {
    if (session) {
      syncAndFetchInitialNotes(session).catch(console.error);
    } else {
      // Clear data if no session (handled by useAuth cleanup mostly, but good to be safe)
      setNotes([]);
    }
  }, [session, syncAndFetchInitialNotes]);

  const handleSignIn = async () => {
    await authSignIn();
  };

  const handleSignOut = async () => {
    await authSignOut(() => {
      // UI cleanup callback
      setNotes([]);
      setActiveFilter(null);
      setSearchQuery('');
      setSortOption('created_at_desc');
      setViewMode('active');
      setAiSearchResult(null);
      setRecentlyArchived(null);
      setIsSyncing(false);
    });
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
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
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
        if (distance <= (note.reminderRadius || REMINDER_RADIUS_METERS) && !sentNotifications.has(note.id)) {
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

    let noteToSave = { ...note };

    // Apply Encryption
    if (encryptionEnabled && cryptoKey) {
        try {
            const encryptedTitle = await cryptoUtils.encryptText(noteToSave.title, cryptoKey);
            const encryptedContent = await cryptoUtils.encryptText(noteToSave.content, cryptoKey);
            noteToSave = {
                ...noteToSave,
                title: encryptedTitle,
                content: encryptedContent,
                isEncrypted: true
            };
        } catch (err) {
            setError('Encryption failed. Note not saved.');
            return;
        }
    }

    const optimisticNotes = isNew ? [noteToSave, ...notes] : notes.map(n => (n.id === noteToSave.id ? noteToSave : n));
    setNotes(optimisticNotes);
    setShowNoteForm(false);
    setEditingNote(null);

    await db.saveNoteToDB(noteToSave);

    if (isNew && subscription) {
      subscription.updateUsage('notesCount', 1);
      trackEvent.noteCreated(noteToSave.category?.name, !!noteToSave.location);
    } else {
      trackEvent.noteEdited();
    }

    if (isOnline && session) {
      await db.queueUpdate({ type: 'SAVE', payload: noteToSave });
      await syncAndFetchInitialNotes(session);
    } else {
      await db.queueUpdate({ type: 'SAVE', payload: noteToSave });
    }

    // Trigger appreciation on 3rd note milestone
    if (isNew && notes.length + 1 === 3) {
      setTimeout(() => setShowAppreciation(true), 1000);
    }

    // Success Toast on first note
    if (isNew && notes.length === 0) {
      setSuccessMessage('Your first note is pinned! 📍 Enjoy exploring your world!');
    }
  };

  const handleShareNote = async (note: Note) => {
    const shareText = `Check out my note: "${note.title}"\n\n${note.content}`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (navigator.share) {
      try {
        await navigator.share({
          title: note.title,
          text: shareText,
          url: shareUrl,
        });
        setSuccessMessage('Successfully shared!');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing note:', error);
          setError('Could not share note.');
        }
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setSuccessMessage('Share link copied to clipboard! 📋');
      } catch (err) {
        setError('Failed to copy share link.');
      }
    }
  };

  const handleJoinWaitlist = async () => {
    if (!session?.user.email) return;
    try {
        await joinWaitlist(session.user.email);
        setSuccessMessage("You're on the list! We'll notify you when Teams features launch. 🚀");
    } catch (err) {
        setError("Failed to join waitlist. Please try again later.");
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
      startTransition(() => {
        setShowUpgradeModal(true);
      });
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





  const handleMarkerClick = (noteId: string) => {
    setActiveNoteId(noteId);
    const node = noteRefs.current.get(noteId);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const processedNotes = useMemo(() => {
    let tempNotes = [...decryptedNotes];
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
  }, [decryptedNotes, viewMode, activeFilter, searchQuery, sortOption, location]);

  const activeNotesCount = useMemo(() => decryptedNotes.filter(n => !n.isArchived).length, [decryptedNotes]);

  const sidebarOffset = session ? (sidebarCollapsed ? '72px' : '260px') : '0px';

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = session?.user?.user_metadata?.full_name ? `, ${session.user.user_metadata.full_name.split(' ')[0]}` : '';
    
    if (hour < 12) return `Good morning${name} 🌅`;
    if (hour < 17) return `Good afternoon${name} ☀️`;
    return `Good evening${name} 🌙`;
  };

  const getSmartInsight = () => {
    if (notes.length === 0) return "Tip: Type a location in your note to pin it to the map automatically!";
    
    const pinnedCount = notes.filter(n => n.location).length;
    if (pinnedCount === 0) return "Tip: Add a location to your notes to see them on the map!";
    
    if (location) {
        const nearbyCount = notes.filter(n => {
            if (!n.location) return false;
            const dist = getDistance(location, n.location.coordinates);
            return dist <= (n.reminderRadius || REMINDER_RADIUS_METERS);
        }).length;
        
        if (nearbyCount > 0) return `You have ${nearbyCount} note${nearbyCount > 1 ? 's' : ''} pinned right here in this area!`;
    }
    
    return "Tip: You can use AI to search across all your memories instantly.";
  };

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
          onAddNote={() => { 
            setEditingNote(null); 
            startTransition(() => {
              setShowNoteForm(true); 
            });
          }}
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
              onEdit={(noteToEdit) => {
                setEditingNote(noteToEdit);
                startTransition(() => {
                  setShowNoteForm(true);
                });
              }}
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
  // ========================
  // Auth loading → Native Splash or Skeleton
  if (isAuthLoading) {
    if (Capacitor.isNativePlatform()) {
      return <MobileSplash />;
    }
    return <AppSkeleton />;
  }

  // ========================
  // Not logged in → Mobile Auth or Landing Page
  // ========================
  if (!session) {
    if (Capacitor.isNativePlatform()) {
      return (
        <MobileAuth 
          onSignIn={handleSignIn} 
          isLoading={false}
        />
      );
    }
    return (
      <Suspense fallback={<div className="min-h-screen bg-white dark:bg-[#0b1121]" />}>
        <SEO 
          title="GeoNotes AI - Your World, Noted" 
          description="The smartest way to pin memories and tasks to a map. Try it for free."
        />
        <LandingPage 
            onSignIn={handleSignIn} 
            onViewPrivacy={() => {
              startTransition(() => {
                setShowPrivacy(true);
              });
            }}
            onJoinWaitlist={async (email) => {
              await joinWaitlist(email);
              setSuccessMessage("You've been added to the waitlist!");
              setTimeout(() => setSuccessMessage(null), 3000);
            }}
        />
      </Suspense>
    );
  }

  // ========================
  // Main authenticated app
  // ========================
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0b1121] text-slate-900 dark:text-white transition-colors duration-300 relative overflow-x-hidden">
      <SEO 
        title={`${totalNotesCount} Notes | GeoNotes AI Dashboard`}
        description={`Managing ${notes.filter(n => n.location).length} pinned locations on your personal map.`}
      />

      {/* Sidebar */}
      <Sidebar
        session={session}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onViewPricing={() => {
          trackEvent.pricingPageViewed();
          startTransition(() => {
            setShowPricingPage(true);
          });
        }}
        onSignOut={handleSignOut}
        subscriptionTier={subscription?.subscription.tier || 'free'}
        notesCount={totalNotesCount}
        isMobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main content area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          !session ? 'layout-no-sidebar' : (sidebarCollapsed ? 'layout-collapsed' : 'layout-expanded')
        }`}
        style={{ marginLeft: 'var(--current-sidebar-width)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
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
            startTransition(() => {
              setShowPricingPage(true);
            });
          }}
          subscriptionTier={subscription?.subscription.tier || 'free'}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          lastSynced={lastSynced}
        />

        {notificationPermission !== 'granted' && (
          <div className="w-full flex-shrink-0 px-4 pt-4">
            <NotificationPermissionBanner status={notificationPermission} onRequest={() => Notification.requestPermission().then(setNotificationPermission)} />
          </div>
        )}

        <main className="flex-1 w-full md:h-auto overflow-y-auto md:overflow-y-visible custom-scrollbar">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Welcome Strip - Dashboard hero */}
          <div className="welcome-strip animate-fade-in-up">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black mb-1.5 tracking-tight">
                  {getGreeting()}
                </h1>
                <p className="text-sm font-medium opacity-90">
                  {getSmartInsight()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="stat-mini">
                  <span className="stat-value">{totalNotesCount}</span>
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
          {successMessage && <SuccessToast message={successMessage} onDismiss={() => setSuccessMessage(null)} />}

          {/* Mobile Bottom Drawer vs Desktop Modal */}
          {showNoteForm && window.innerWidth < 768 ? (
            <BottomDrawer 
              isOpen={showNoteForm} 
              onClose={() => {
                startTransition(() => {
                  setShowNoteForm(false); 
                  setEditingNote(null); 
                });
              }}
              title={editingNote ? 'Edit Note' : 'Add New Note'}
            >
              <Suspense fallback={<div className="p-8 flex justify-center"><SpinnerIcon className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
                <NoteForm
                  noteToEdit={editingNote}
                  onSave={handleSaveNote}
                  onCancel={() => { 
                    startTransition(() => {
                      setShowNoteForm(false); 
                      setEditingNote(null); 
                    });
                  }}
                  categories={DEFAULT_CATEGORIES}
                  userLocation={location}
                  onError={setError}
                />
              </Suspense>
            </BottomDrawer>
          ) : showNoteForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1100] flex justify-center items-center md:p-4 animate-fade-in" onClick={() => { startTransition(() => { setShowNoteForm(false); setEditingNote(null); }); }}>
              <div className="glass-card w-full h-full md:h-auto md:max-w-2xl md:max-h-[85vh] overflow-hidden text-slate-900 dark:text-white animate-scale-in rounded-none md:rounded-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-200/60 dark:border-[#1e2d45] flex justify-between items-center bg-white dark:bg-[#131c2e]">
                   <h2 className="text-lg font-bold">{editingNote ? 'Edit Note' : 'Add New Note'}</h2>
                   <button onClick={() => { startTransition(() => { setShowNoteForm(false); setEditingNote(null); }); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <CloseIcon className="w-5 h-5 text-slate-400" />
                   </button>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar">
                  <Suspense fallback={<div className="p-12 flex justify-center"><SpinnerIcon className="w-10 h-10 animate-spin text-indigo-500" /></div>}>
                    <NoteForm
                      noteToEdit={editingNote}
                      onSave={handleSaveNote}
                      onCancel={() => { 
                        startTransition(() => {
                          setShowNoteForm(false); 
                          setEditingNote(null); 
                        });
                      }}
                      categories={DEFAULT_CATEGORIES}
                      userLocation={location}
                      onError={setError}
                    />
                  </Suspense>
                </div>
              </div>
            </div>
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

          {showAppreciation && (
            <Suspense fallback={null}>
              <AppreciationModal 
                noteCount={notes.length} 
                onClose={() => setShowAppreciation(false)} 
                onFeedback={() => {
                  const inviteText = encodeURIComponent("I'm using GeoNotes AI to pin my memories to the map! 📍 Check it out: ");
                  window.open(`https://twitter.com/intent/tweet?text=${inviteText}${window.location.origin}`);
                }}
              />
            </Suspense>
          )}

          {/* Map Section - Mobile Conditional */}
          {(activeMobileTab === 'map' || window.innerWidth >= 768) && (
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
              <Suspense fallback={<LoadingSkeleton variant="map" className="rounded-xl h-[40vh] min-h-[300px]" />}>
                <MapView notes={processedNotes} userLocation={location} activeNoteId={activeNoteId} onMarkerClick={handleMarkerClick} theme={effectiveTheme} />
              </Suspense>
              <div className="p-3 border-t border-slate-100 dark:border-slate-700/40 flex justify-end">
                  <button 
                    onClick={() => {
                      startTransition(() => {
                        setShowSettings(true);
                      });
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    <CogIcon className="w-3.5 h-3.5" />
                    Map Settings
                  </button>
              </div>
            </div>
          )}

          {/* Search Section - Mobile Tab */}
          {activeMobileTab === 'ai' && window.innerWidth < 768 && (
            <div className="space-y-6 animate-fade-in px-2">
              <div className="section-card p-6 space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                      <AiIcon className="w-6 h-6" />
                   </div>
                   <div>
                      <h2 className="text-lg font-bold">Smart Search</h2>
                      <p className="text-xs text-slate-500 font-medium">Search notes or ask AI</p>
                   </div>
                </div>
                
                <div className="relative pt-2">
                   <input 
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search your memories..."
                      className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 pr-12 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/50 text-base"
                   />
                   <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <SearchIcon className="w-5 h-5 text-slate-400" />
                   </div>
                </div>

                <div className="pt-2">
                   <button 
                      onClick={handleAiSearch}
                      disabled={isAiSearching || !searchQuery.trim()}
                      className="w-full btn-gradient py-4 flex items-center justify-center gap-2 text-base shadow-indigo-500/30"
                   >
                      {isAiSearching ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <AiIcon className="w-5 h-5" />}
                      {isAiSearching ? 'Generating...' : 'Ask AI'}
                   </button>
                   <p className="text-[10px] text-center text-slate-400 mt-3 font-medium uppercase tracking-widest">
                      Powered by Gemini Pro
                   </p>
                </div>
              </div>
              
              {/* Optional: Show recent searches or search results immediately */}
              {searchQuery.trim() !== '' && processedNotes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-2">Direct Matches</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {processedNotes.slice(0, 3).map(note => (
                      <NoteCard 
                        key={note.id} 
                        note={note} 
                        userLocation={location}
                        onArchive={() => handleArchiveNote(note)}
                        onUnarchive={() => handleUnarchiveNote(note)}
                        onDeletePermanently={() => handleDeleteNotePermanently(note.id)}
                        onEdit={(n) => { setEditingNote(n); setShowNoteForm(true); }}
                        onShare={() => handleShareNote(note)}
                        isArchivedView={false}
                        isActive={false}
                        onMouseEnter={() => {}}
                        onMouseLeave={() => {}}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings Section - Mobile Conditional */}
          {activeMobileTab === 'settings' && window.innerWidth < 768 && (
            <div className="space-y-6 animate-fade-in px-2">
              <div className="section-card p-6 overflow-hidden">
                <div className="flex items-center gap-4 mb-6">
                    {session?.user.user_metadata?.avatar_url ? (
                      <img className="h-14 w-14 rounded-2xl object-cover ring-4 ring-indigo-50 dark:ring-indigo-900/20" src={session.user.user_metadata.avatar_url} alt="" />
                    ) : (
                      <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <UserCircleIcon className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                    <div>
                       <h2 className="text-lg font-bold truncate max-w-[200px]">{session?.user.email?.split('@')[0]}</h2>
                       <p className="text-xs text-slate-500 font-medium">{session?.user.email}</p>
                    </div>
                </div>

                <div className="space-y-3">
                   <button 
                    onClick={() => { setShowPricingPage(true); }}
                    className="w-full p-4 flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-700 dark:text-indigo-300 transition-all active:scale-[0.98]"
                   >
                     <div className="flex flex-col items-start">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Your Plan</span>
                        <span className="text-base font-bold capitalize">{subscription?.subscription.tier || 'Free'}</span>
                     </div>
                     <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-indigo-600/20">UPGRADE</span>
                   </button>
                   
                   <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setShowSettings(true)}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-left transition-all active:scale-95"
                      >
                         <CogIcon className="w-6 h-6 mb-2 text-slate-400" />
                         <span className="text-sm font-bold block">Settings</span>
                         <span className="text-[10px] text-slate-500 font-medium">Map & Security</span>
                      </button>
                      <button 
                        onClick={() => setShowPrivacy(true)}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-left transition-all active:scale-95"
                      >
                         <div className="w-6 h-6 mb-2 text-slate-400">
                            <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1.944A11.947 11.947 0 012.13 5.02a1.094 1.094 0 00-.515.756c-1.313 7.962 4.38 12.884 8.125 14.172a1.083 1.083 0 00.52 0c3.746-1.288 9.438-6.21 8.125-14.172a1.094 1.094 0 00-.515-.756A11.947 11.947 0 0110 1.944zm1 11a1 1 0 11-2 0 1 1 0 012 0zm-1-7a1 1 0 011 1v3a1 1 0 11-2 0V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                         </div>
                         <span className="text-sm font-bold block">Privacy</span>
                         <span className="text-[10px] text-slate-500 font-medium">Terms & Data</span>
                      </button>
                   </div>

                   <button 
                      onClick={handleSignOut} 
                      className="w-full p-4 text-center bg-red-50 dark:bg-red-900/10 text-red-600 rounded-2xl font-bold border border-red-100 dark:border-red-900/20 mt-4 transition-all active:scale-95"
                   >
                    Sign Out
                   </button>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard Content - Grid or Tabs */}
          {(activeMobileTab === 'notes' || window.innerWidth >= 768) && (
            <div className="space-y-6">
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
            </div>
          )}

        </div>

          <SettingsModal 
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            accuracy={accuracy}
            onAccuracyChange={setAccuracy}
            encryptionEnabled={encryptionEnabled}
            onEncryptionToggle={setEncryptionEnabled}
            masterPassword={masterPassword}
            onMasterPasswordChange={setMasterPassword}
          />

          {showPrivacy && (
            <div className="fixed inset-0 z-[5000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowPrivacy(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto relative animate-scale-in" onClick={e => e.stopPropagation()}>
                 <button onClick={() => setShowPrivacy(false)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <CloseIcon className="w-6 h-6 text-slate-400" />
                 </button>
                 <PrivacyPolicy onClose={() => setShowPrivacy(false)} />
              </div>
            </div>
          )}
        </main>

        {session && (
          <MobileBottomNav 
            activeTab={activeMobileTab} 
            onTabChange={setActiveMobileTab} 
            onAddClick={() => {
              startTransition(() => {
                setShowNoteForm(true);
                setEditingNote(null);
              });
            }}
          />
        )}
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
              if (subscription?.upgradeToPro) {
                subscription.upgradeToPro(priceId.includes('yearly') ? 'year' : 'month');
              }
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

      {/* Floating Action Button (Hidden on Mobile, as it is in the BottomNav) */}
      <button
        onClick={() => {
          setEditingNote(null);
          startTransition(() => {
            setShowNoteForm(true);
          });
        }}
        className="fixed bottom-8 right-8 btn-gradient rounded-xl p-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all z-50 group hidden md:block"
        aria-label="Add new note"
      >
        <PlusIcon className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
      </button>
    </div>
  );
};

export default App;