
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use generic fetch for Gemini API to avoid dependency issues in Edge Function
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

async function callGemini(model: string, payload: any) {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set in Edge Function secrets.');
    }

    const url = `${API_BASE_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
    }

    return await response.json();
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action, ...params } = await req.json();

        let result;
        let model = 'gemini-1.5-flash'; // Default model (fallback)

        switch (action) {
            case 'suggestLocations':
                // input: { query, userLocation }
                model = 'gemini-1.5-flash';
                const locContext = params.userLocation
                    ? `near ${params.userLocation.latitude}, ${params.userLocation.longitude}`
                    : "globally";

                result = await callGemini(model, {
                    contents: [{
                        parts: [{
                            text: `List 5 real places matching "${params.query}" ${locContext}. Return strictly a JSON array with objects containing: name, address, coordinates (latitude, longitude), placeType. No markdown.`
                        }]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                });
                break;

            case 'categorizeNote':
                // input: { title, content, categories }
                model = 'gemini-1.5-flash';
                const categoryList = params.categories.map((c: any) => `"${c.name}" (id: ${c.id})`).join(', ');
                result = await callGemini(model, {
                    contents: [{
                        parts: [{
                            text: `Analyze this note and choose the single most relevant category ID from the list.
                        Note Title: "${params.title}"
                        Note Content: "${params.content}"
                        Available Categories: ${categoryList}
                        Respond with only the ID.`
                        }]
                    }]
                });
                break;

            case 'generateContent':
                // input: { title, content }
                model = 'gemini-1.5-flash';
                result = await callGemini(model, {
                    contents: [{
                        parts: [{
                            text: `Based on the title "${params.title}" and content "${params.content}", provide helpful expansion, checklist, or ideas. Keep it concise.`
                        }]
                    }]
                });
                break;

            case 'generateFullNote':
                // input: { title, userLocation, categories }
                model = 'gemini-1.5-flash';
                const cats = params.categories.map((c: any) => `"${c.name}"`).join(', ');
                const locationPrompt = params.userLocation
                    ? `near lat:${params.userLocation.latitude}, long:${params.userLocation.longitude}`
                    : "without specific location context";

                result = await callGemini(model, {
                    contents: [{
                        parts: [{
                            text: `Generate a complete note (JSON) based on title "${params.title}" ${locationPrompt}.
                        Fields: content (string), categoryName (choose from: ${cats}), location (optional object with name, address, coordinates).`
                        }]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                });
                break;

            case 'searchNotes':
                // input: { query, notes }
                model = 'gemini-1.5-pro'; // Use stronger model for search
                const notesContext = params.notes.map((n: any) => `Title: ${n.title}\nContent: ${n.content}\n---`).join('\n');
                result = await callGemini(model, {
                    contents: [{
                        parts: [{
                            text: `Answer query "${params.query}" based on these notes:\n${notesContext}`
                        }]
                    }]
                });
                break;

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        // Extract text from Gemini REST API response structure
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return new Response(JSON.stringify({ text }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
