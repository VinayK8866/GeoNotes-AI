
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

const DEFAULT_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'];

async function callGeminiWithFallback(models: string[], payload: any) {
    let lastError: Error | null = null;

    for (const model of models) {
        try {
            return await callGemini(model, payload);
        } catch (error: any) {
            lastError = error;
            // Continue to next model on any error
        }
    }

    throw lastError || new Error('All models failed');
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
                result = await callGeminiWithFallback(DEFAULT_MODELS, {
                    contents: [{
                        parts: [{
                            text: `List 5 real places matching "${params.query}" near ${params.userLocation.latitude}, ${params.userLocation.longitude}. Return strictly a JSON array with objects containing: name, address, coordinates (latitude, longitude), placeType. No markdown.`
                        }]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                });
                break;

            case 'categorizeNote':
                // input: { title, content, categories }
                const categoryList = params.categories.map((c: any) => `"${c.name}" (id: ${c.id})`).join(', ');
                result = await callGeminiWithFallback(DEFAULT_MODELS, {
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
                result = await callGeminiWithFallback(DEFAULT_MODELS, {
                    contents: [{
                        parts: [{
                            text: `Based on the title "${params.title}" and content "${params.content}", provide helpful expansion, checklist, or ideas. Keep it concise.`
                        }]
                    }]
                });
                break;

            case 'generateFullNote':
                // input: { title, userLocation, categories }
                const cats = params.categories.map((c: any) => `"${c.name}"`).join(', ');
                result = await callGeminiWithFallback(DEFAULT_MODELS, {
                    contents: [{
                        parts: [{
                            text: `Generate a complete note (JSON) based on title "${params.title}" near lat:${params.userLocation.latitude}, long:${params.userLocation.longitude}.
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
                const notesContext = params.notes.map((n: any) => `Title: ${n.title}\nContent: ${n.content}\n---`).join('\n');
                result = await callGeminiWithFallback(['gemini-2.5-pro', ...DEFAULT_MODELS], {
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

        // Standardize output format
        // The Gemini REST API returns { candidates: [ { content: { parts: [ { text: "..." } ] } } ] }
        // We can just return the raw result and let the frontend parse it, OR parse it here.
        // Let's return raw for now to keep it simple, or maybe extract text to make frontend easier?
        // Actually, geminiService.ts expects `response.text()` from the SDK which parses this structure.
        // If we return the raw JSON, the SDK-less frontend will need to parse `candidates[0].content.parts[0].text`.

        // Let's parse it here to simplify frontend.
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
