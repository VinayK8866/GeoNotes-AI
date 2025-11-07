
import { GoogleGenAI, Type } from "@google/genai";
import { Coordinates, Category, LocationSuggestion, Note } from '../types';

// FIX: Initialize the GoogleGenAI client with the API key from environment variables as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
                // Per Gemini API guidelines, tools like `googleMaps` cannot be used with `responseMimeType` and `responseSchema`.
                // The prompt provides sufficient location context for the model to generate relevant suggestions.
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

export const generateNoteContent = async (title: string, currentContent: string): Promise<string> => {
    if (!title.trim()) {
        throw new Error("A title is required to generate content.");
    }

    try {
        const prompt = `Based on the following note title and content, provide a helpful expansion, a checklist, or brainstormed ideas. If the content is already a list, add more items. If it's a topic, create a summary or a list of key points. Keep the response concise and directly useful as note content. Do not add introductory phrases like "Here are some ideas:".

Title: "${title}"

Existing Content:
"${currentContent}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        return response.text.trim();

    } catch (error) {
        console.error('Error generating note content with Gemini:', error);
        throw new Error('Failed to generate content with AI.');
    }
};


const fullNoteSchema = {
    type: Type.OBJECT,
    properties: {
        content: { type: Type.STRING, description: 'The main body content for the note, formatted as plain text or markdown (e.g., a checklist with "- " items).' },
        categoryName: { type: Type.STRING, description: 'The name of the most appropriate category from the provided list.' },
        location: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: 'The name of a relevant real-world location or business.' },
                address: { type: Type.STRING, description: 'The full address of the location.' },
                coordinates: {
                    type: Type.OBJECT,
                    properties: {
                        latitude: { type: Type.NUMBER },
                        longitude: { type: Type.NUMBER }
                    },
                    required: ['latitude', 'longitude']
                }
            },
        }
    },
    required: ['content', 'categoryName']
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
    // FIX: A function whose declared type is neither 'undefined', 'void', nor 'any' must return a value.
    if (!title.trim()) {
        throw new Error("A title is required to generate a full note.");
    }
    if (!userLocation) {
        throw new Error("User location is required to suggest a location.");
    }
    if (categories.length === 0) {
        throw new Error("A list of categories is required to suggest a category.");
    }

    try {
        const categoryList = categories.map(c => `"${c.name}"`).join(', ');

        const prompt = `Based on the note title "${title}", my current location (lat: ${userLocation.latitude}, long: ${userLocation.longitude}), and the available categories, generate a complete note for me.
        
1.  **Content**: Create helpful content for the note. This could be a checklist, a summary, or ideas related to the title.
2.  **Category**: Choose the most relevant category from this list: ${categoryList}. Provide only the category name.
3.  **Location**: If the title suggests a specific place (e.g., "Grocery shopping", "Meeting at Starbucks"), find a relevant real-world location near me. If no specific place is implied, you can leave the location field empty.

Return the result as a JSON object.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: fullNoteSchema
            },
        });

        const jsonString = response.text.trim();
        const generatedNote: GeneratedNote = JSON.parse(jsonString);

        return generatedNote;

    } catch (error) {
        console.error('Error generating full note with Gemini:', error);
        throw new Error('Failed to generate a complete note with AI.');
    }
};

export const searchNotesWithAi = async (query: string, notes: Note[]): Promise<string> => {
    if (!query.trim()) {
        throw new Error("A search query is required.");
    }
    if (notes.length === 0) {
        return "You don't have any notes to search through.";
    }

    try {
        const notesContext = notes.map(note => `
--- Note ---
Title: ${note.title}
Content: ${note.content}
Category: ${note.category?.name || 'N/A'}
Location: ${note.location?.name || 'N/A'}
-------------
        `).join('\n');

        const prompt = `You are an intelligent assistant for the GeoNotes app. A user is searching their notes with the following query: "${query}"

Here are the user's notes:
${notesContext}

Based *only* on the provided notes, answer the user's query. If the query cannot be answered from the notes, say so. Keep your answer concise and helpful. Format your response using markdown.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text.trim();

    } catch (error) {
        console.error('Error searching notes with Gemini:', error);
        throw new Error('Failed to search notes with AI.');
    }
};
