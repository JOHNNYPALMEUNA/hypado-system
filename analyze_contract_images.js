import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const apiKey = envConfig.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Directory containing the images
const imgDir = "C:\\Users\\Promob\\.gemini\\antigravity\\brain\\151cbb0f-caab-46c3-a8a6-df709d0e0f2d";
// Verified file names from previous steps
const files = [
    "media__1770720907326.jpg",
    "media__1770720907327.jpg",
    "media__1770720907330.jpg",
    "media__1770720907378.jpg"
];

async function run() {
    const parts = [];

    // Add prompt text
    parts.push({ text: "Analise estas imagens sequenciais de um contrato. Extraia TODO o texto e formate como Markdown, mantendo a estrutura de Cláusulas. Identifique os campos variáveis e substitua por placeholders como {{CLIENT_NAME}}, {{VALUE}}, etc." });

    // Add images
    for (const file of files) {
        const filePath = path.join(imgDir, file);
        if (fs.existsSync(filePath)) {
            console.log(`Loading ${file}...`);
            const data = fs.readFileSync(filePath).toString('base64');
            parts.push({
                inlineData: {
                    data: data,
                    mimeType: "image/jpeg"
                }
            });
        }
    }

    if (parts.length <= 1) {
        console.log("No images found to analyze.");
        return;
    }

    console.log("Analyzing images... (This might take a moment)");

    try {
        const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
        const response = await result.response;
        const text = response.text();
        fs.writeFileSync('contract_template.md', text);
        console.log("SUCCESS: Contract text extracted to contract_template.md");
    } catch (e) {
        console.log("Error:", e.message);
        // Basic retry
        if (e.message.includes("429")) {
            console.log("Quota exceeded. Waiting 10s and retrying...");
            await new Promise(r => setTimeout(r, 10000));
            try {
                const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
                const response = await result.response;
                const text = response.text();
                fs.writeFileSync('contract_template.md', text);
                console.log("SUCCESS (Retry): Contract text extracted.");
            } catch (e2) {
                console.error("Retry failed:", e2.message);
            }
        }
    }
}

run();
