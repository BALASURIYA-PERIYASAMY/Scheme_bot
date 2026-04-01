# 🇮🇳 SchemeBot — AI-Powered India Government Schemes Chatbot

A full-stack chatbot powered by **Anthropic Claude AI** + **Flask** that gives smart, conversational answers about Indian government schemes using a verified JSON knowledge base.

---

## 🧠 How It Works

```
User Message
     │
     ▼
Flask Backend (app.py)
     │
     ├─ 1. Detect state (TN, MH, UP, "Karnataka", "bengaluru"…)
     ├─ 2. Detect category (farmers, students, women…)
     ├─ 3. Fetch matching schemes from schemes.json
     ├─ 4. Inject schemes as context into AI system prompt
     │
     ▼
Anthropic Claude API
     │
     ▼
Smart, conversational response using both
AI knowledge + verified database facts
```

---

## 🚀 Quick Start

### 1. Get an Anthropic API Key
Sign up at https://console.anthropic.com → API Keys → Create Key

### 2. Set the environment variable
```bash
# Linux / Mac
export ANTHROPIC_API_KEY="sk-ant-api03-..."

# Windows Command Prompt
set ANTHROPIC_API_KEY=sk-ant-api03-...

# Windows PowerShell
$env:ANTHROPIC_API_KEY="sk-ant-api03-..."
```

### 3. Install & Run
```bash
pip install -r requirements.txt
python app.py
```

### 4. Open browser
```
http://localhost:5000
```

---

## 📁 Project Structure

```
ai-schemes-chatbot/
├── app.py                   ← Flask backend + AI integration
├── requirements.txt         ← Only needs: flask
├── data/
│   └── schemes.json         ← 48 verified schemes (16 states)
├── templates/
│   └── index.html           ← Chat UI template
└── static/
    ├── css/style.css        ← UI styling
    └── js/chat.js           ← Frontend logic
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 AI Conversations | Claude AI understands natural language, context, follow-ups |
| 📂 Scheme Database | 48 verified schemes across 16 states injected as AI context |
| 🧠 Smart Detection | Detects state names, abbreviations (TN, MH, UP), city names |
| 🎯 Profile Matching | Enter state + category + income → get personalised scheme list |
| 🗣️ Voice Input | Speak queries using Web Speech API (Chrome/Edge) |
| 💬 Conversation Memory | Last 12 turns sent to AI for contextual follow-up questions |
| 📱 Responsive | Works on mobile, tablet, and desktop |

---

## 💬 Example Conversations

**State + Category:**
> "What farmer schemes are available in Maharashtra?"

**Profile question:**
> "I'm a 24-year-old unemployed graduate from Karnataka. What schemes can help me?"

**Eligibility query:**
> "Who is eligible for Ladli Behna Yojana?"

**Document query:**
> "What documents do I need to apply for PM Kisan?"

**Follow-up (uses conversation context):**
> User: "Tell me about farmer schemes in UP"
> AI: [lists schemes]
> User: "What about for women?"  ← AI remembers UP

---

## 🔧 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Chat UI |
| `/chat` | POST | Main AI chat endpoint |
| `/suggest` | POST | Profile-based scheme matching |
| `/states` | GET | List all states in DB |
| `/health` | GET | Server + API key status |

### `/chat` Request Body
```json
{
  "message": "farmer schemes in Maharashtra",
  "history": [
    {"role": "user",      "content": "previous message"},
    {"role": "assistant", "content": "previous reply"}
  ]
}
```

---

## ➕ Adding Schemes

Edit `data/schemes.json`:
```json
{
  "name": "Scheme Name",
  "state": "State Name",
  "category": ["farmers"],
  "benefits": "What it provides",
  "eligibility": "Who can apply",
  "application_link": "https://official.gov.in/link"
}
```
Restart Flask. Done — AI will automatically use the new data.

---

## 🔑 Using OpenAI Instead of Anthropic

Replace the `call_ai()` function in `app.py`:

```python
import openai
openai.api_key = os.environ.get("OPENAI_API_KEY")

def call_ai(system_prompt, messages, max_tokens=1200):
    response = openai.chat.completions.create(
        model="gpt-4o",
        max_tokens=max_tokens,
        messages=[{"role": "system", "content": system_prompt}] + messages
    )
    return response.choices[0].message.content
```

And add to requirements.txt: `openai>=1.0.0`

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| AI | Anthropic Claude (claude-sonnet-4) |
| Backend | Python 3, Flask (zero extra dependencies) |
| Data | JSON file (48 schemes, 16 states) |
| Frontend | HTML5, CSS3 (no frameworks), Vanilla JS |
| Fonts | Plus Jakarta Sans + JetBrains Mono |
| Voice | Web Speech API |
