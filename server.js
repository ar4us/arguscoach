require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Initialize Supabase client with validation
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseKey === 'REPLACE_WITH_YOUR_SERVICE_ROLE_KEY') {
    console.error('❌ CRITICAL ERROR: Supabase configuration (URL or SERVICE_KEY) missing in environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Add a test query to verify connection on startup
(async () => {
    try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        if (error) {
            console.warn('⚠️ Supabase connection test warning:', error.message);
        } else {
            console.log('✅ Supabase connection test successful (Table "profiles" is reachable).');
        }
    } catch (err) {
        console.error('❌ Supabase test query failed:', err.message);
    }
})();

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
    res.json({ status: "ok", supabase_config: supabaseUrl ? "present" : "missing" });
});

// 3. AI Coach Info route (GET /ai-coach)
app.get('/ai-coach', (req, res) => {
    res.send('Use POST request for this endpoint');
});

// 4. AI Coach logic route (POST /ai-coach)
app.post('/ai-coach', async (req, res) => {
    const { messages, user_id } = req.body;

    // Requirement: Validation
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
            error: "Messages array is required."
        });
    }

    // Step 2: Fetch user profile from Supabase if user_id is provided
    let userContext = "";
    if (user_id) {
        try {
            console.log(`DEBUG: Fetching profile for user_id: ${user_id}`);
            const { data, error } = await supabase
                .from('profiles')
                .select('age, weight, height, goal')
                .eq('id', user_id)
                .single();

            if (error) {
                console.warn(`DEBUG: User profile fetch error: ${error.message}`);
                // Optional: return res.status(404).json({ error: "User not found" });
            } else if (data) {
                userContext = `\n\nUser Profile:\n- Age: ${data.age || 'N/A'}\n- Weight: ${data.weight || 'N/A'} kg\n- Height: ${data.height || 'N/A'} cm\n- Goal: ${data.goal || 'N/A'}`;
                console.log(`DEBUG: Profile data injected into prompt for user ${user_id}`);
            }
        } catch (err) {
            console.error('DEBUG: Supabase unexpected error:', err.message);
        }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return res.status(500).json({
            error: "API Key missing in server configuration."
        });
    }

    // Step 3: Build personalized system prompt
    const systemPrompt = { 
        role: "system", 
        content: `You are a professional fitness coach. Answer in Arabic clearly and briefly.${userContext}` 
    };

    // Step 4: Logic - Include system prompt at start
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
});
