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
    const { calories, protein, workoutType, goal } = req.body;

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: "API Key missing in server configuration."
        });
    }

    const prompt = `You are a strict and professional fitness coach.

User plan:
Calories: ${calories}
Protein: ${protein}g
Workout: ${workoutType}
Goal: ${goal}

Rules:
- Give 3-5 actionable tips
- Be direct and practical
- No generic advice
- Keep it short

Respond in Arabic.`;

    try {
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
                "messages": [
                    { "role": "user", "content": prompt }
                ]
            })
        });

        const data = await response.json();

        // Check if API call was successful
        if (!response.ok || data.error || !data.choices || data.choices.length === 0) {
            console.error('OpenRouter Error (Falling back):', JSON.stringify(data || 'No data', null, 2));

            // Return fallback response instead of error
            return res.json({
                message: "AI coach response",
                advice: "Follow your calorie target, focus on protein intake, and train consistently 3-4 times per week."
            });
        }

        const aiAdvice = data.choices[0].message.content;

        res.json({
            message: "AI coach response",
            advice: aiAdvice
        });

    } catch (error) {
        console.error('Fetch/Network Error (Falling back):', error);

        // Return fallback response on network failure
        res.json({
            message: "AI coach response",
            advice: "Follow your calorie target, focus on protein intake, and train consistently 3-4 times per week."
        });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`- GET  /         : Check if server is up`);
    console.log(`- GET  /test     : Check JSON responses`);
    console.log(`- GET  /ai-coach : Info about the endpoint`);
    console.log(`- POST /ai-coach : Submit fitness data`);
});
