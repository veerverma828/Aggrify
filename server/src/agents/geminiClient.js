require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

// Use the API key from environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function getGeminiResponse(systemInstruction, prompt, tools = []) {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                tools: tools.length > 0 ? tools : undefined,
                temperature: 0.2
            }
        });
        return response.text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}

module.exports = {
    ai,
    getGeminiResponse
};
