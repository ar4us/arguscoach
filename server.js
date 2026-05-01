require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Essential for parsing POST request JSON bodies

// --- Routes ---

// 1. Root route (GET /)
app.get('/', (req, res) => {
    res.send('API is running');
});

// 2. Test route (GET /test)
app.get('/test', (req, res) => {
    res.json({ status: "ok" });
});

// 3. AI Coach Info route (GET /ai-coach)
// This helps explain why opening the link in a browser doesn't work for POST
app.get('/ai-coach', (req, res) => {
    res.send('Use POST request for this endpoint');
});

// 4. AI Coach logic route (POST /ai-coach)
app.post('/ai-coach', async (req, res) => {
    const { messages } = req.body;

    // Requirement 3: Validation - If messages is missing → return error
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
            error: "Messages array is required."
        });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return res.status(500).json({
            error: "API Key missing in server configuration."
        });
    }

    // Requirement 5: System Prompt
    const systemPrompt = { 
        role: "system", 
        content: "You are a professional fitness coach. Answer in Arabic clearly and briefly." 
    };

    // Requirement 6: Logic - Include system prompt at start
    const fullMessages = [systemPrompt, ...messages];

    try {
        console.log('DEBUG: Connecting to OpenRouter...');
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Argus Coach"
            },
            body: JSON.stringify({
                "model": "openai/gpt-oss-120b:free",
                "messages": fullMessages
            })
        });

        console.log(`DEBUG: OpenRouter Status: ${response.status}`);
        
        const data = await response.json();

        if (!response.ok) {
            console.error('DEBUG: OpenRouter Error Details:', JSON.stringify(data, null, 2));
            return res.status(response.status).json({
                error: "AI service error",
                details: data.error || data
            });
        }

        if (!data.choices || data.choices.length === 0) {
            console.error('DEBUG: Unexpected Response Body:', JSON.stringify(data, null, 2));
            return res.status(502).json({
                error: "Invalid AI response format"
            });
        }

        const aiAnswer = data.choices[0].message.content;

        res.json({
            answer: aiAnswer
        });

    } catch (error) {
        console.error('DEBUG: Server Error:', error.message);
        res.status(500).json({
            error: "Internal server error.",
            details: error.message
        });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`- GET  /         : Check if server is up`);
    console.log(`- GET  /test     : Check JSON responses`);
    console.log(`- GET  /ai-coach : Info about the endpoint`);
    console.log(`- POST /ai-coach : Ask the AI fitness coach`);
});
