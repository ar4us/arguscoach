# Node.js Fitness AI Backend (Upgraded)

A complete Express backend integrated with OpenRouter (Gemini 2.0 Flash) for real-time fitness coaching.

## 🚀 Setup & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Key
Ensure your `.env` file has your OpenRouter key:
```env
PORT=3000
OPENROUTER_API_KEY=sk-or-v1-cce6...
```

### 3. Start the Server
```bash
npm run dev
```

---

## 🛠 API Reference

### GET `/`
- **Response:** `API is running`

### GET `/test`
- **Response:** `{"status": "ok"}`

### POST `/ai-coach`
Generates real AI advice (in Arabic) based on your stats.
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "calories": 2500,
  "protein": 180,
  "workoutType": "Hypertrophy",
  "goal": "Gain Muscle"
}
```
- **Response:**
```json
{
  "message": "AI coach response",
  "advice": "... AI advice in Arabic ..."
}
```

---

## 🧪 Testing with `curl`
```bash
curl -X POST http://localhost:3000/ai-coach \
     -H "Content-Type: application/json" \
     -d '{"calories": 2500, "protein": 180, "workoutType": "Strength", "goal": "Gain Muscle"}'
```
