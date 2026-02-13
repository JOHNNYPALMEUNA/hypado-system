import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import fs from 'fs';

// Manually load env for standalone script
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const apiKey = envConfig.VITE_GEMINI_API_KEY;

console.log("Testing API Key:", apiKey ? "FOUND" : "MISSING");

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
    console.log(`\nTesting model: ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Say 'Hello from Gemini'");
        const response = await result.response;
        console.log(`[SUCCESS] ${modelName}:`, response.text());
    } catch (error) {
        console.error(`[ERROR] ${modelName}:`, error.message);
    }
}

async function run() {
    console.log("--- STARTING TESTS ---");
    await testModel("gemini-1.5-flash"); // Test the one we just prioritized
    await testModel("gemini-2.0-flash");
    console.log("--- END TESTS ---");
}

run();
