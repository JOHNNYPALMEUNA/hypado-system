import dotenv from 'dotenv';
import fs from 'fs';

// Manually parse .env since we are running with clean node
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const apiKey = envConfig.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("API Key not found in .env");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log("Fetching models from:", url);

fetch(url)
    .then(res => res.json())
    .then(data => {
        let output = "";
        if (data.models) {
            output += "AVAILABLE MODELS:\n";
            data.models.forEach(m => output += `- ${m.name}\n`);
        } else {
            output += "NO MODELS FOUND OR ERROR:\n";
            output += JSON.stringify(data, null, 2);
        }
        fs.writeFileSync('models_list.txt', output);
        console.log("Output written to models_list.txt");
    })
    .catch(err => {
        console.error("FETCH ERROR:", err);
        fs.writeFileSync('models_list.txt', "FETCH ERROR: " + err);
    });
