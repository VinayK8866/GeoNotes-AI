import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
    console.error("VITE_GEMINI_API_KEY is missing in your environment.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(API_KEY);

function cleanJson(text: string): string {
    let jsonString = text.trim();
    if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```(json)?\n/, '').replace(/```$/, '');
    }
    return jsonString;
}

const suggestLocations = async (query: string) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const locContext = "globally";
        const prompt = `List 5 real places matching "${query}" ${locContext}. Return strictly a JSON array with objects containing: name, address, coordinates (latitude, longitude), placeType. No markdown.`;

        console.log(`Asking Gemini for locations matching: "${query}"...`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("Raw Response:", text);

        const parsed = JSON.parse(cleanJson(text));
        console.log("Parsed JSON:", JSON.stringify(parsed, null, 2));
    } catch (error) {
        console.error("suggestLocations failed:", error);
    }
};

suggestLocations("WeWork Gurugram");
