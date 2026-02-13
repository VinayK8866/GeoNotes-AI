
import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
if (apiKeyMatch) {
    process.env.API_KEY = apiKeyMatch[1];
} else {
    console.error("Could not find GEMINI_API_KEY in .env.local");
    process.exit(1);
}

const userLocation = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco

async function test() {
    // Dynamic import to ensure env is loaded first
    const { suggestLocations } = await import('./services/geminiService.ts');

    console.log("Starting latency test for suggestLocations...");
    try {
        console.log("First call (Uncached)...");
        const start1 = Date.now();
        await suggestLocations("coffee", userLocation);
        const end1 = Date.now();
        console.log(`First call took ${end1 - start1}ms`);

        console.log("Second call (Cached)...");
        const start2 = Date.now();
        await suggestLocations("coffee", userLocation);
        const end2 = Date.now();
        console.log(`Second call took ${end2 - start2}ms`);

    } catch (error) {
        console.error("Error:", error);
    }
}

test();
