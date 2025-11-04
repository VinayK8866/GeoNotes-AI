// FIX: Implemented Gemini Service to handle AI functionality
import { GoogleGenAI, Type } from "@google/genai";
import { Coordinates, Category, LocationSuggestion } from '../types';

// IMPORTANT: process.env is not available in this browser-based environment.
// Replace "YOUR_GEMINI_API_KEY_HERE" with your actual Gemini API key.
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";

if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    console.warn("Gemini API key is not set in services/geminiService.ts. AI features will fail.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const locationSuggestionSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: 'The name of the location or place.' },
        address: { type: Type.STRING, description: 'The full address of the location.' },
        coordinates: {
            type: Type.OBJECT,
            properties: {
                latitude: { type: Type.NUMBER },
                longitude: { type: Type.NUMBER }
            },
            required: ['latitude', 'longitude']
        },
        placeType: { type: Type.STRING, description: 'A category for the place, e.g., "Restaurant", "Park", "Museum".' }
    },
    required: ['name', 'address', 'coordinates', 'placeType']
};

export const suggestLocations = async (query: string, userLocation: Coordinates): Promise<LocationSuggestion[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Find up to 5 real-world locations matching this description: "${query}". My current location is latitude ${userLocation.latitude}, longitude ${userLocation.longitude}. Prioritize relevant places near me.`,
            config: {
                tools: [{ googleMaps: {} }],
                toolConfig: {
                    retrievalConfig: {
                        latLng: userLocation
                    }
                },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: locationSuggestionSchema
                }
            },
        });

        const jsonString = response.text.trim();
        const suggestions = JSON.parse(jsonString);
        return suggestions;

    } catch (error) {
        console.error('Error suggesting locations with Gemini:', error);
        // Fallback or re-throw error
        throw new Error('Failed to get location suggestions from AI.');
    }
};

export const categorizeNote = async (title: string, content: string, categories: Category[]): Promise<Category | null> => {
    if (categories.length === 0) return null;

    try {
        const categoryList = categories.map(c => `"${c.name}" (id: ${c.id})`).join(', ');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following note and choose the single most relevant category for it from the provided list. Respond with only the ID of the chosen category.
            
            Note Title: "${title}"
            Note Content: "${content}"
            
            Available Categories: ${categoryList}`,
        });
        
        const categoryId = response.text.trim();
        const foundCategory = categories.find(c => c.id === categoryId);
        
        return foundCategory || null;

    } catch (error) {
        console.error('Error categorizing note with Gemini:', error);
        return null; // Don't block user flow if AI fails
    }
};