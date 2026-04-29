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
    const { question } = req.body;

    // Requirement 6: Handle missing question
    if (!question) {
        return res.status(400).json({
            error: "Question is required."
        });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return res.status(500).json({
            error: "API Key missing in server configuration."
        });
    }

    // Requirement 4: Prompt Logic
    const messages = [
        { 
            role: "system", 
            content: "You are a fitness coach. Answer clearly in Arabic. Keep answers short and helpful." 
        },
        { 
            role: "user", 
            content: question 
        }
    ];

    try {
        // Requirement 3: Use OpenRouter API and specific model
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "fitness-app"
            },
            body: JSON.stringify({
                "model": "nvidia/nemotron-3-super-120b-a12b:free",
                "messages": messages
            })
        });

        const data = await response.json();

        // Requirement 6: Handle API errors
        if (!response.ok || data.error || !data.choices || data.choices.length === 0) {
            console.error('AI API Error:', data.error || 'Invalid response format');
            return res.status(502).json({
                error: "AI service is temporarily unavailable."
            });
        }

        const aiAnswer = data.choices[0].message.content;

        // Requirement 5: Return specific response format
        res.json({
            answer: aiAnswer
        });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({
            error: "Internal server error."
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
