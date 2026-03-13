import { GoogleGenerativeAI } from "@google/generative-ai";
import { Coordinates, Category, LocationSuggestion, Note } from '../types';

// Client-side API Key (Must be set in .env)
// Client-side API Key (Must be set in .env)
const API_KEY = import.meta.env?.VITE_GEMINI_API_KEY;

// Initialize Gemini Client
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// Helper to get model
// Helper to get model
const getModel = () => {
    if (!genAI) throw new Error("VITE_GEMINI_API_KEY is missing in your .env file.");
    // fast and cost effective model
    return genAI.getGenerativeModel({ model: "gemini-flash-latest" });
};

// Retry helper for Gemini API
async function retryGeminiCall<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            if (i === retries - 1) throw error;
            if (error.message.includes('429') || error.message.includes('503')) {
                await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
                continue;
            }
            throw error;
        }
    }
    throw new Error("Failed after retries");
}

// Helper to clean JSON
function cleanJson(text: string): string {
    let jsonString = text.trim();
    if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```(json)?\n/, '').replace(/```$/, '');
    }
    return jsonString;
}

// Photon Geocoding Helper (Faster than Nominatim)
async function geocodeWithPhoton(query: string, userLocation: Coordinates | null): Promise<LocationSuggestion[]> {
    try {
        let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;
        if (userLocation) {
            url += `&lat=${userLocation.latitude}&lon=${userLocation.longitude}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) return [];

        const data = await response.json();
        return data.features.map((feature: any) => {
            const props = feature.properties;
            const name = props.name || props.street || props.city || "Unknown Place";
            const addressParts = [props.street, props.housenumber, props.postcode, props.city, props.country].filter(Boolean);
            
            return {
                name: name,
                address: addressParts.join(', ') || props.state || props.country,
                coordinates: {
                    latitude: feature.geometry.coordinates[1],
                    longitude: feature.geometry.coordinates[0]
                },
                placeType: props.osm_value || props.type
            };
        });
    } catch (error) {
        console.error("Photon error:", error);
        return [];
    }
}

// Simple in-memory cache for location suggestions
const locationCache = new Map<string, LocationSuggestion[]>();

export const suggestLocations = async (query: string, userLocation: Coordinates | null): Promise<LocationSuggestion[]> => {
    const locKey = userLocation ? `${userLocation.latitude.toFixed(4)}-${userLocation.longitude.toFixed(4)}` : 'unknown';
    const cacheKey = `${query.toLowerCase()}-${locKey}`;

    if (locationCache.has(cacheKey)) return locationCache.get(cacheKey)!;

    // 1. Try Photon first (Ultra-fast, optimized for search)
    const photonResults = await geocodeWithPhoton(query, userLocation);
    if (photonResults.length > 0) {
        locationCache.set(cacheKey, photonResults);
        return photonResults;
    }

    // 2. Fallback to Gemini if Nominatim fails
    try {
        const model = getModel();
        const locContext = userLocation
            ? `near ${userLocation.latitude}, ${userLocation.longitude}`
            : "globally";

        const prompt = `List 5 real places matching "${query}" ${locContext}. Return strictly a JSON array with objects containing: name, address, coordinates (latitude, longitude), placeType. No markdown.`;

        const result = await retryGeminiCall(() => model.generateContent(prompt));
        const response = await result.response;
        const text = response.text();

        let suggestions: LocationSuggestion[] = [];
        try {
            suggestions = JSON.parse(cleanJson(text));
        } catch (e) {
            console.error("JSON Parse Error:", text);
            throw new Error("Invalid format from AI");
        }

        locationCache.set(cacheKey, suggestions);
        return suggestions;

    } catch (error: any) {
        console.error('Error suggesting locations:', error);
        // Don't throw if just suggestion fails, return empty
        return [];
    }
};

export const categorizeNote = async (title: string, content: string, categories: Category[]): Promise<Category | null> => {
    if (categories.length === 0) return null;

    try {
        const model = getModel();
        const categoryList = categories.map(c => `"${c.name}" (id: ${c.id})`).join(', ');
        const prompt = `Analyze this note and choose the single most relevant category ID from the list.
        Note Title: "${title}"
        Note Content: "${content}"
        Available Categories: ${categoryList}
        Respond with only the ID.`;

        const result = await retryGeminiCall(() => model.generateContent(prompt));
        const response = await result.response;
        const categoryId = cleanJson(response.text());

        return categories.find(c => c.id === categoryId) || null;

    } catch (error) {
        console.error('Error categorizing note:', error);
        return null; // Fail silently for categorization
    }
};

export const generateNoteContent = async (title: string, currentContent: string): Promise<string> => {
    if (!title.trim()) throw new Error("A title is required.");

    try {
        const model = getModel();
        const prompt = `Based on the title "${title}" and content "${currentContent}", provide helpful expansion, checklist, or ideas. Keep it concise.`;

        const result = await retryGeminiCall(() => model.generateContent(prompt));
        const response = await result.response;
        return response.text();

    } catch (error: any) {
        console.error('Error generating content:', error);
        throw new Error(error.message || 'Failed to generate content.');
    }
};


type GeneratedNote = {
    content: string;
    categoryName: string;
    locationName?: string; // Changed from full location object to just name/address prompt
    locationAddress?: string; // Optional precise address to help search
};

export const generateFullNote = async (title: string, userLocation: Coordinates | null, categories: Category[]): Promise<GeneratedNote> => {
    if (!title.trim()) throw new Error("A title is required.");

    try {
        const model = getModel();
        const cats = categories.map(c => `"${c.name}"`).join(', ');
        const locationPrompt = userLocation
            ? `near lat:${userLocation.latitude}, long:${userLocation.longitude}`
            : "without specific location context";

        // Simplified prompt: Ask for location NAME, not coordinates.
        const prompt = `Generate a complete note (JSON) based on title "${title}" ${locationPrompt}.
        Fields: 
        - content (string): The note content.
        - categoryName (string): Choose from: ${cats}.
        - locationName (string, optional): The name of the place described in the title.
        - locationAddress (string, optional): The address/city of the place if known.
        Return strict JSON.`;

        const result = await retryGeminiCall(() => model.generateContent(prompt));
        const response = await result.response;
        const text = response.text();

        try {
            return JSON.parse(cleanJson(text));
        } catch (e) {
            console.error("JSON Parse Error:", text);
            throw new Error("Invalid JSON format from AI");
        }

    } catch (error: any) {
        console.error('Error generating full note:', error);
        throw new Error(`AI Error: ${error.message}`);
    }
};

export const searchNotesWithAi = async (query: string, notes: Note[]): Promise<string> => {
    if (!query.trim()) throw new Error("Query required.");

    try {
        const model = getModel();
        const notesContext = notes.map(n => `Title: ${n.title}\nContent: ${n.content}\n---`).join('\n');
        const prompt = `Answer query "${query}" based on these notes:\n${notesContext}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        console.error('Error searching notes:', error);
        throw new Error(error.message || 'Failed to search notes.');
    }
};
