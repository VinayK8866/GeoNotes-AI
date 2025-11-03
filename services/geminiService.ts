import { GoogleGenAI, Type } from "@google/genai";
import { Coordinates, LocationSuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const noteSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "A short, descriptive title for the note. Should be 2-5 words."
        },
        content: {
            type: Type.STRING,
            description: "The full content of the note or reminder. This should capture the user's core request."
        },
        locationQuery: {
            type: Type.STRING,
            description: "A search query string to find the relevant location for the note, e.g., 'nearest grocery store' or 'home'. If no specific location is mentioned, this can be null."
        },
    },
    required: ["title", "content"]
};

const locationSuggestionSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "The primary name of the location or business." },
            address: { type: Type.STRING, description: "A simplified address or descriptive location (e.g., 'SoMa, San Francisco, CA')." },
            coordinates: {
                type: Type.OBJECT,
                properties: {
                    latitude: { type: Type.NUMBER },
                    longitude: { type: Type.NUMBER }
                },
                required: ["latitude", "longitude"]
            },
            placeType: { type: Type.STRING, description: "The category or type of the place (e.g., 'Restaurant', 'Park', 'Coffee Shop')." }
        },
        required: ["name", "address", "coordinates"]
    }
};

export const parseNoteFromText = async (text: string, userLocation: Coordinates | null): Promise<any> => {
    
    let prompt = `Parse the following user request to create a location-based note. Extract a title, content, and a location search query.`;

    if (userLocation) {
        prompt += ` The user's current location is latitude ${userLocation.latitude}, longitude ${userLocation.longitude}. Use this for context if they mention relative locations like "here" or "nearby".`
    }
    
    prompt += `\n\nUser request: "${text}"`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: noteSchema,
            },
        });

        const responseText = response.text;
        
        if (!responseText) {
            throw new Error('AI response was empty.');
        }

        return JSON.parse(responseText);

    } catch (error) {
        console.error("Error parsing text with AI:", error);
        throw new Error("Failed to process your request with AI. Please try again.");
    }
};

export const searchLocations = async (query: string, userLocation: Coordinates | null): Promise<LocationSuggestion[]> => {
    if (!query.trim()) {
        return [];
    }

    let prompt = `Act as a geocoding API. Given the search query, provide a list of up to 5 potential matching locations. For each location, provide its name, a simple address, its precise latitude and longitude, and the type of place (e.g., 'Cafe', 'Park').`;

    if (userLocation) {
        prompt += ` The user's current location is latitude ${userLocation.latitude}, longitude ${userLocation.longitude}. Prioritize results that are relevant and potentially close to this location.`
    }

    prompt += ` Query: "${query}"`;


    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: locationSuggestionSchema,
            },
        });

        const responseText = response.text;

        if (!responseText) {
            return [];
        }

        const suggestions = JSON.parse(responseText);
        // Ensure the response is an array before returning
        return Array.isArray(suggestions) ? suggestions : [];

    } catch (error) {
        console.error("Error searching locations with AI:", error);
        // In case of error, return an empty array to avoid crashing the UI
        return [];
    }
};