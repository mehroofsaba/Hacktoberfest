# 🐛 BugBite
Paste code, pick a language, get a clear, beginner-friendly debugging explanation from Gemma.

Flow: Frontend → Express → Google GenAI (Gemma) → Express → Frontend. The API key stays on the backend.

## Run
1. Put your key in `.env` (`GEMINI_API_KEY=...`). Optional: `GEMMA_MODEL`, `PORT`.
2. `cd backend && npm install && npm start`
3. Open http://localhost:3000 (the backend serves the frontend). `/health` returns `{"message":"BugBite is alive."}`.

## API
`POST /analyze` with `{ "code": "...", "language": "Python" }` returns `{ "analysis": "<markdown>" }`.
Languages: Python, JavaScript, Java, C, C++, HTML, CSS, SQL (edit `LANGUAGES` in server.js and the `<select>` to add more).
