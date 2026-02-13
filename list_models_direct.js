import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import fs from 'fs';

// Manually load env for standalone script
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const apiKey = envConfig.VITE_GEMINI_API_KEY;

console.log("Using API Key:", apiKey);

const genAI = new GoogleGenerativeAI(apiKey);

async function list() {
    try {
        // direct REST call to list models because SDK might filter
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            console.log("AVAILABLE MODELS:");
            console.log(data.models.map(m => m.name).join('\n'));
        } else {
            console.log("API RESPONSE:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("ERROR:", e);
    }
}

list();
