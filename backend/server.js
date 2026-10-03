const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMMA_MODEL || "gemma-4-31b-it";
const LANGUAGES = ["Python", "JavaScript", "Java", "C", "C++", "HTML", "CSS", "SQL"];

const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));
app.use(express.static(path.join(__dirname, "..", "frontend")));

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const INSTRUCTIONS = `You are BugBite, a friendly, curious, slightly playful debugging buddy for developers. Keep the tone warm, but keep the technical content precise.
Examine the code and:
- Identify the most important bug or problem.
- Explain what is happening, and why it occurs, in beginner-friendly words. Never assume the developer understands the raw error message; translate it (e.g. "unexpected EOF" means the code ended while something was still open, like a parenthesis, bracket, quote or block).
- Give a concrete fix with the corrected snippet only. Do not rewrite the whole program unless unavoidable.
- Say what to check next.
- Look for syntax errors, logic errors, API mistakes, wrong variables, type problems, missing imports and runtime problems.
- NEVER invent bugs. If the code looks valid, say so plainly in "What is wrong", and use the other sections for optional, clearly-labelled observations.
Reply in Markdown using EXACTLY these five headings, in this order, and nothing before the first heading:
## What is wrong
## What is happening
## Why it happens
## How to fix it
## What to check next
Put code in fenced blocks.`;

app.get("/health", (_req, res) => res.json({ message: "BugBite is alive." }));
app.get("/api", (_req, res) => res.json({ message: "BugBite is alive." }));

app.post("/analyze", async (req, res) => {
  const { code, language } = req.body || {};
  if (typeof code !== "string" || !code.trim())
    return res.status(400).json({ error: "Paste some code first so I have something to bite." });
  if (!LANGUAGES.includes(language))
    return res.status(400).json({ error: `Choose one of: ${LANGUAGES.join(", ")}.` });
  if (!ai)
    return res.status(500).json({ error: "Server has no GEMINI_API_KEY. Add it to the .env file and restart." });

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `${INSTRUCTIONS}\n\nLanguage: ${language}\nCode:\n\`\`\`\n${code}\n\`\`\``,
    });
    const analysis = response.text;
    if (!analysis) throw new Error("Empty response from the model.");
    res.json({ analysis });
  } catch (err) {
    console.error("Gemma error:", err);
    res.status(502).json({ error: "Gemma couldn't be reached. Check your API key, model name and connection, then try again." });
  }
});

app.listen(PORT, () => console.log(`BugBite is alive at http://localhost:${PORT}`));
