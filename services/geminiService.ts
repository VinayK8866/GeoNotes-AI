
import { Coordinates, Category, LocationSuggestion, Note } from '../types';
import { supabase } from '../supabaseClient';

// Helper function to invoke Edge Function
async function callEdgeFunction(action: string, params: any) {
    if (!supabase) {
        throw new Error('Supabase client is not initialized.');
    }

    console.log(`Invoking Edge Function: ${action}`);

    // For local dev, we might need a different URL if functions are served locally
    // but typically the client handles this if configured correctly.
    // Assuming standard invocation.

    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: { action, ...params }
    });

    if (error) {
        console.error(`Edge Function Error (${action}):`, error);
        // Provide user-friendly error messages
        const message = error.message || '';
        if (message.includes('503') || message.includes('overloaded')) {
            throw new Error('Our AI service is busy right now. Please try again in a moment.');
        } else if (message.includes('401') || message.includes('unauthorized')) {
            throw new Error('Authentication error. Please sign in again.');
        } else if (message.includes('timeout')) {
            throw new Error('The request took too long. Please check your connection and try again.');
        } else {
            throw new Error('Something went wrong with our AI service. Please try again.');
        }
    }

    // The edge function returns object { text: "..." }
    return data;
}

// Simple in-memory cache for location suggestions
const locationCache = new Map<string, LocationSuggestion[]>();

export const suggestLocations = async (query: string, userLocation: Coordinates): Promise<LocationSuggestion[]> => {
    // Check cache first
    const cacheKey = `${query.toLowerCase()}-${userLocation.latitude.toFixed(4)}-${userLocation.longitude.toFixed(4)}`;
    if (locationCache.has(cacheKey)) {
        return locationCache.get(cacheKey)!;
    }

    try {
        const response = await callEdgeFunction('suggestLocations', { query, userLocation });

        let suggestions: LocationSuggestion[] = [];
        try {
            // The edge function returns a JSON string in 'text' field
            suggestions = JSON.parse(response.text);
        } catch (e) {
            console.error("Failed to parse JSON from Edge Function", response);
            // Fallback for simple text response? No, we expect JSON array.
            throw new Error("Invalid response format from AI");
        }

        // Cache the result
        locationCache.set(cacheKey, suggestions);
        if (locationCache.size > 100) {
            const firstKey = locationCache.keys().next().value;
            if (firstKey !== undefined) locationCache.delete(firstKey);
        }

        return suggestions;

    } catch (error) {
        console.error('Error suggesting locations:', error);
        throw new Error('Failed to get location suggestions from AI.');
    }
};

export const categorizeNote = async (title: string, content: string, categories: Category[]): Promise<Category | null> => {
    if (categories.length === 0) return null;

    try {
        const response = await callEdgeFunction('categorizeNote', { title, content, categories });
        const categoryId = response.text.trim();
        const foundCategory = categories.find(c => c.id === categoryId);

        return foundCategory || null;

    } catch (error) {
        console.error('Error categorizing note:', error);
        return null;
    }
};

export const generateNoteContent = async (title: string, currentContent: string): Promise<string> => {
    if (!title.trim()) {
        throw new Error("A title is required to generate content.");
    }

    try {
        const response = await callEdgeFunction('generateContent', { title, content: currentContent });
        return response.text.trim();

    } catch (error) {
        console.error('Error generating note content:', error);
        throw new Error('Failed to generate content with AI.');
    }
};


type GeneratedNote = {
    content: string;
    categoryName: string;
    location?: {
        name: string;
        address: string;
        coordinates: Coordinates;
    };
};

export const generateFullNote = async (title: string, userLocation: Coordinates, categories: Category[]): Promise<GeneratedNote> => {
    if (!title.trim()) throw new Error("A title is required.");
    if (!userLocation) throw new Error("Location is required.");

    try {
        const response = await callEdgeFunction('generateFullNote', { title, userLocation, categories });
        const generatedNote: GeneratedNote = JSON.parse(response.text);
        return generatedNote;

    } catch (error) {
        console.error('Error generating full note:', error);
        throw new Error('Failed to generate a complete note with AI.');
    }
};

export const searchNotesWithAi = async (query: string, notes: Note[]): Promise<string> => {
    if (!query.trim()) throw new Error("Query required.");

    try {
        const response = await callEdgeFunction('searchNotes', { query, notes });
        return response.text.trim();
    } catch (error) {
        console.error('Error searching notes:', error);
        throw new Error('Failed to search notes with AI.');
    }
};


