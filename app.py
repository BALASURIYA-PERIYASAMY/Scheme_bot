"""
AI-Powered India Government Schemes Chatbot — Flask Backend
============================================================
Architecture:
  1. User message arrives at /chat
  2. We check if the message mentions a known state → inject relevant
     scheme data as context into the AI prompt
  3. We send the enriched prompt to the AI (Groq via its API)
  4. AI returns a smart, conversational answer
  5. We stream or return the response to the frontend

The AI acts as an expert on Indian government schemes, using the JSON
data as its authoritative knowledge base for specific facts.
"""

import os
import json
import re
from flask import Flask, request, jsonify, render_template, Response, stream_with_context
import urllib.request
import urllib.error

# ─── App Init ─────────────────────────────────────────────
app = Flask(__name__)

# ─── Load Scheme Data ──────────────────────────────────────
DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "schemes.json")

def load_schemes():
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)["schemes"]

SCHEMES = load_schemes()

# ─── State / Category Detection ───────────────────────────
STATE_ALIASES = {
    # ── States ──
    "tn": "Tamil Nadu", "tamilnadu": "Tamil Nadu", "tamil nadu": "Tamil Nadu",
    "karnataka": "Karnataka", "ka": "Karnataka", "bangalore": "Karnataka", "bengaluru": "Karnataka",
    "wb": "West Bengal", "west bengal": "West Bengal", "bengal": "West Bengal",
    "ap": "Andhra Pradesh", "andhra pradesh": "Andhra Pradesh", "andhra": "Andhra Pradesh",
    "ts": "Telangana", "telangana": "Telangana", "hyderabad": "Telangana",
    "mh": "Maharashtra", "maharashtra": "Maharashtra", "mumbai": "Maharashtra",
    "up": "Uttar Pradesh", "uttar pradesh": "Uttar Pradesh",
    "mp": "Madhya Pradesh", "madhya pradesh": "Madhya Pradesh",
    "rajasthan": "Rajasthan", "rj": "Rajasthan",
    "gujarat": "Gujarat", "gj": "Gujarat",
    "haryana": "Haryana", "hr": "Haryana",
    "chhattisgarh": "Chhattisgarh", "cg": "Chhattisgarh",
    "assam": "Assam", "as": "Assam",
    "kerala": "Kerala", "kl": "Kerala",
    "punjab": "Punjab", "pb": "Punjab",
    "odisha": "Odisha", "orissa": "Odisha",
    "jharkhand": "Jharkhand", "jh": "Jharkhand",
    "bihar": "Bihar", "br": "Bihar",
    "himachal": "Himachal Pradesh", "himachal pradesh": "Himachal Pradesh", "hp": "Himachal Pradesh",
    "uttarakhand": "Uttarakhand", "uk": "Uttarakhand",
    "goa": "Goa",
    "arunachal pradesh": "Arunachal Pradesh", "arunachal": "Arunachal Pradesh", "ar": "Arunachal Pradesh",
    "manipur": "Manipur", "mn": "Manipur",
    "meghalaya": "Meghalaya", "ml": "Meghalaya",
    "mizoram": "Mizoram", "mz": "Mizoram",
    "nagaland": "Nagaland", "nl": "Nagaland",
    "sikkim": "Sikkim", "sk": "Sikkim",
    "tripura": "Tripura", "tr": "Tripura",

    # ── Union Territories ──
    "delhi": "Delhi", "new delhi": "Delhi", "nct": "Delhi",
    "andaman and nicobar islands": "Andaman and Nicobar Islands", "andaman": "Andaman and Nicobar Islands", "nicobar": "Andaman and Nicobar Islands", "an": "Andaman and Nicobar Islands",
    "chandigarh": "Chandigarh", "ch": "Chandigarh",
    "dadra and nagar haveli and daman and diu": "Dadra and Nagar Haveli and Daman and Diu", "dadra": "Dadra and Nagar Haveli and Daman and Diu", "daman": "Dadra and Nagar Haveli and Daman and Diu", "diu": "Dadra and Nagar Haveli and Daman and Diu", "dn": "Dadra and Nagar Haveli and Daman and Diu",
    "lakshadweep": "Lakshadweep", "ld": "Lakshadweep",
    "puducherry": "Puducherry", "pondicherry": "Puducherry", "py": "Puducherry",
    "jammu and kashmir": "Jammu and Kashmir", "jammu": "Jammu and Kashmir", "kashmir": "Jammu and Kashmir", "jk": "Jammu and Kashmir",
    "ladakh": "Ladakh", "la": "Ladakh",

    # ── National ──
    "national": "National", "india": "National", "central": "National",
}

CATEGORIES = {
    "students": ["student", "students", "education", "scholarship", "college", "school", "youth", "graduate", "degree"],
    "farmers":  ["farmer", "farmers", "agriculture", "kisan", "krishi", "farming", "crop", "ryot", "cultivat"],
    "women":    ["women", "woman", "female", "girl", "mahila", "widow", "mother", "ladies", "bride"],
    "elderly":  ["senior", "elderly", "old age", "pension", "vayoshri", "aged"],
    "business": ["entrepreneur", "business", "startup", "msme", "self-employ", "enterprise"],
}

def detect_state(msg):
    ml = msg.lower()
    for alias, state in sorted(STATE_ALIASES.items(), key=lambda x: -len(x[0])):
        if re.search(r'\b' + re.escape(alias) + r'\b', ml):
            return state
    return None

def detect_categories(msg):
    ml = msg.lower()
    found = []
    for cat, keywords in CATEGORIES.items():
        if any(k in ml for k in keywords):
            found.append(cat)
    return found

def get_relevant_schemes(state=None, categories=None, limit=12):
    """Return schemes matching state and/or category filters."""
    results = SCHEMES
    if state:
        results = [s for s in results if s["state"].lower() == state.lower()]
    if categories:
        cat_set = set(c.lower() for c in categories)
        results = [s for s in results if any(c.lower() in cat_set for c in s.get("category", []))]
    return results[:limit]

def format_schemes_for_context(schemes):
    """Format scheme list as compact text for the AI system prompt."""
    if not schemes:
        return "No schemes found in database for this query."
    lines = []
    for s in schemes:
        lines.append(
            f"• [{s['state']}] {s['name']} (for: {', '.join(s.get('category',[]))})\n"
            f"  Benefits: {s['benefits']}\n"
            f"  Eligibility: {s['eligibility']}\n"
            f"  Apply: {s['application_link']}"
        )
    return "\n\n".join(lines)

# ─── All Scheme Names (for AI awareness) ──────────────────
ALL_SCHEME_NAMES = [f"{s['name']} ({s['state']})" for s in SCHEMES]
ALL_STATES = sorted(set(s["state"] for s in SCHEMES))

# ─── System Prompt Builder ─────────────────────────────────
SYSTEM_PROMPT_BASE = """You are SchemeBot — a warm, knowledgeable AI assistant specializing in Indian government welfare schemes and yojanas. You help citizens understand, discover, and apply for government schemes across all Indian states.

YOUR PERSONALITY:
- Friendly, conversational, and patient
- Use simple language (accessible to non-experts)
- Mix English with occasional Hindi terms (yojana, labh, patrata) naturally
- Be encouraging and empathetic — many users are from rural or low-income backgrounds

YOUR KNOWLEDGE:
- Deep expertise in central and state government schemes
- Categories: agriculture/farmers, education/students, women empowerment, elderly, business/MSME, health, housing, employment
- You know about eligibility, benefits, documents needed, and application processes

DATABASE COVERAGE:
States in our database: {states}
Total schemes: {count}

RESPONSE GUIDELINES:
1. For specific state/category queries — use the SCHEME DATA provided below to give accurate, factual answers
2. For general questions (how to apply, what documents, eligibility rules) — use your training knowledge
3. Always include application links from the database when available
4. If asked about your profile suggestions, ask 1-2 qualifying questions first (state, category) then recommend
5. Format responses clearly — use bullet points for multiple schemes, bold scheme names
6. End responses with a helpful follow-up suggestion or question

IMPORTANT: Never make up scheme names, amounts, or links. If you're unsure, say so and direct to official portals.
""".format(states=", ".join(ALL_STATES), count=len(SCHEMES))

def build_system_prompt(state=None, categories=None, matched_schemes=None, language_instruction=None):
    """Build a dynamic system prompt that includes relevant scheme data."""
    prompt = SYSTEM_PROMPT_BASE

    if language_instruction:
        prompt += f"\n\nLANGUAGE INSTRUCTION (VERY IMPORTANT): {language_instruction} Respond ONLY in the requested language. Do not mix languages unless the user explicitly asks."

    if matched_schemes:
        prompt += f"\n\n━━━ RELEVANT SCHEME DATA FROM DATABASE ━━━\n"
        prompt += f"(These are verified schemes for this query — use these facts precisely)\n\n"
        prompt += format_schemes_for_context(matched_schemes)
        prompt += "\n\n━━━ END OF DATABASE CONTEXT ━━━"
    else:
        prompt += "\n\nNOTE: No specific database matches for this query. Answer from your general knowledge about Indian government schemes, but clearly note if you're uncertain about specific details."

    return prompt

# ─── AI Call (Groq) ───────────────────────────────────────
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.3-70b-versatile"

def call_ai(system_prompt, conversation_history, max_tokens=1200):
    """
    Call the Groq API.
    Returns the assistant's text response as a string.
    """
    api_key = os.environ.get("GROQ_API_KEY", "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")

    messages = [{"role": "system", "content": system_prompt}] + conversation_history

    payload = {
        "model": MODEL,
        "max_tokens": max_tokens,
        "messages": messages,
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        GROQ_API_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "Mozilla/5.0"
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            error_data = json.loads(body) if body.strip() else {}
        except json.JSONDecodeError:
            error_data = {}
        error_msg = error_data.get("error", {}).get("message", str(e))

        if e.code == 401:
            return "**API Key Error**: The Groq API key is missing or invalid. Please set the GROQ_API_KEY environment variable and restart the server."
        elif e.code == 429:
            return "**Rate Limit**: Too many requests. Please wait a moment and try again."
        elif e.code == 403:
            return "**Access Denied**: The request was blocked. Please check your API key and network settings."
        else:
            return f"**AI Error** ({e.code}): {error_msg}"
    except Exception as e:
        return f"**Connection Error**: Could not reach the AI service. Please check your internet connection. ({str(e)})"

# ─── Routes ───────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    """
    Main chat endpoint.
    Body: { "message": str, "history": [{"role": "user"|"assistant", "content": str}] }
    Returns: { "reply": str, "state": str|null, "schemes_count": int }
    """
    data = request.get_json()
    if not data or not data.get("message", "").strip():
        return jsonify({"error": "No message provided"}), 400

    user_message = data["message"].strip()
    # Conversation history sent from frontend (last N turns)
    history = data.get("history", [])
    language_instruction = data.get("language_instruction", "")

    # ── Detect context from user message ──
    state = detect_state(user_message)
    # Also check recent history for state mentions (context carry-forward)
    if not state:
        for turn in reversed(history[-6:]):
            detected = detect_state(turn.get("content", ""))
            if detected:
                state = detected
                break

    categories = detect_categories(user_message)

    # ── Fetch relevant schemes ──
    matched_schemes = []
    if state or categories:
        matched_schemes = get_relevant_schemes(state=state, categories=categories)

    # ── Build dynamic system prompt ──
    system_prompt = build_system_prompt(
        state=state,
        categories=categories,
        matched_schemes=matched_schemes,
        language_instruction=language_instruction
    )

    # ── Build message list for API ──
    # Include conversation history + new user message
    messages = list(history[-10:])  # Keep last 10 turns for context
    messages.append({"role": "user", "content": user_message})

    # ── Call AI ──
    reply = call_ai(system_prompt, messages)

    # ── Find schemes mentioned in the conversation ──
    mentioned_schemes = []
    # Check if any scheme from our database was discussed
    for s in SCHEMES:
        s_name_lower = s["name"].lower()
        if s_name_lower in reply.lower() or s_name_lower in user_message.lower():
            if s not in mentioned_schemes:
                mentioned_schemes.append(s)

    return jsonify({
        "reply": reply,
        "state": state,
        "categories": categories,
        "schemes_count": len(matched_schemes),
        "schemes": mentioned_schemes,
    })


@app.route("/suggest", methods=["POST"])
def suggest():
    """
    Profile-based suggestion endpoint.
    Body: { "state": str, "category": str, "age": str, "income": str }
    """
    data = request.get_json() or {}
    state    = data.get("state", "")
    category = data.get("category", "")
    age      = data.get("age", "")
    income   = data.get("income", "")
    language_instruction = data.get("language_instruction", "")

    # Build targeted prompt
    profile_parts = []
    if state:    profile_parts.append(f"State: {state}")
    if category: profile_parts.append(f"Category: {category}")
    if age:      profile_parts.append(f"Age: {age}")
    if income:   profile_parts.append(f"Annual Income: ₹{income}")

    profile_str = " | ".join(profile_parts) if profile_parts else "General citizen"

    # Get relevant schemes
    schemes = get_relevant_schemes(
        state=state if state else None,
        categories=[category] if category else None
    )
    system_prompt = build_system_prompt(
        state=state, categories=[category] if category else None,
        matched_schemes=schemes,
        language_instruction=language_instruction
    )

    messages = [{
        "role": "user",
        "content": (
            f"I need scheme recommendations for this profile: {profile_str}.\n"
            f"Please list the most relevant schemes with brief descriptions, "
            f"eligibility highlights, and application links. "
            f"Also mention any national schemes they might qualify for."
        )
    }]

    reply = call_ai(system_prompt, messages, max_tokens=1500)

    # ── Find schemes mentioned ──
    mentioned_schemes = []
    for s in schemes:
        if s["name"].lower() in reply.lower():
            mentioned_schemes.append(s)
    
    # fallback to all matched if none matched exactly in text
    if not mentioned_schemes:
        mentioned_schemes = schemes[:3]

    return jsonify({"reply": reply, "schemes_count": len(schemes), "schemes": mentioned_schemes})


@app.route("/category_schemes", methods=["POST"])
def category_schemes():
    """
    Returns a comprehensive list of government schemes for a given category.
    Now fetches instantaneously from the local JSON database instead of using the AI API.
    """
    data = request.get_json() or {}
    category_req = data.get("category", "").strip().lower()
    if not category_req:
        return jsonify({"error": "No category provided"}), 400

    matched_schemes = []
    
    # Comprehensive category mapping from the frontend display/api names to JSON tags & keywords
    CATEGORY_MAP = {
        "agriculture": ["farmers", "agriculture", "rural", "environment"],
        "benefits": ["benefits", "social", "welfare", "poverty", "family"],
        "business": ["business", "self-employed", "startup", "entrepreneur", "finance", "loan"],
        "citizenship": ["citizenship", "visa", "passport", "foreinner", "nri"],
        "defence": ["defence", "army", "navy", "airforce", "military", "foreign", "embassy"],
        "driving": ["driving", "transport", "vehicle", "license", "road"],
        "education": ["students", "education", "learning", "scholarship", "school", "college"],
        "governance": ["governance", "planning", "digital", "rti", "transparency", "administrative"],
        "health": ["health", "wellness", "medical", "hospital", "doctor", "medicine", "insurance"],
        "housing": ["housing", "home", "urban", "rural", "accommodation", "rent"],
        "infrastructure": ["infrastructure", "industries", "pioneering", "logistics", "factory"],
        "jobs": ["jobs", "employment", "skill", "training", "wage", "unorganized", "worker"],
        "justice": ["justice", "law", "grievances", "legal", "court", "complaint"],
        "money": ["money", "taxes", "finance", "banking", "pension", "investment", "saving"],
        "science": ["science", "it", "communication", "technology", "digital", "ai", "computer"],
        "travel": ["travel", "tourism", "passport", "visa", "railway", "airline", "hospitality"],
        "families": ["family", "women", "children", "household", "home", "marriage"],
        "youth": ["youth", "sports", "culture", "student", "millennial", "unemployed"]
    }

    keywords = []
    # Find matching keywords from map
    for key, val in CATEGORY_MAP.items():
        if key in category_req:
            keywords.extend(val)
    
    # If no keywords found, use the category request itself as a keyword
    if not keywords:
        keywords = [category_req.replace("schemes", "").strip()]

    for s in SCHEMES:
        s_cats = [c.lower() for c in (s.get("category") or [])]
        s_name = s.get("name", "").lower()
        s_ben = s.get("benefits", "").lower()
        
        # 1. Match by tags
        tag_match = any(any(kw in tag for tag in s_cats) for kw in keywords)
        
        # 2. Match by Name/Benefits context
        text_match = any(kw in s_name or kw in s_ben for kw in keywords)
        
        if tag_match or text_match:
            if s not in matched_schemes:
                matched_schemes.append(s)

    final_schemes = []
    for s in matched_schemes:
        # Determine Central vs State
        state_val = s.get("state", "All India")
        type_val = "Central" if state_val.lower() in ["national", "all india"] else "State"
        
        final_schemes.append({
            "name": s.get("name", ""),
            "type": type_val,
            "state": state_val,
            "ministry": s.get("ministry", "Relevant Department"),
            "benefits": s.get("benefits", ""),
            "eligibility": s.get("eligibility", ""),
            "apply_link": s.get("application_link", "")
        })
        
    return jsonify({"schemes": final_schemes, "total": len(final_schemes)})


@app.route("/get_eligibility_fields", methods=["POST"])
def get_eligibility_fields():
    """
    Analyzes scheme criteria and returns 3-5 relevant fields for the user to fill.
    """
    data = request.get_json() or {}
    criteria = data.get("criteria", "")
    scheme_name = data.get("scheme_name", "this scheme")
    
    if not criteria:
        return jsonify({"fields": [{"name": "details", "label": "Tell us about your profile", "type": "text"}]})

    system_prompt = f"""You are a Form Generation AI for an Indian Welfare Portal.
Analyze the criteria for the scheme "{scheme_name}" and suggest exactly 3 to 5 simple input fields that a user should provide to check their eligibility.

SCHEME CRITERIA:
{criteria}

RULES:
- Return ONLY a JSON object.
- Structure: {{"fields": [{{"name": "id", "label": "User Label", "type": "text" | "number" | "boolean"}}]}}
- Always include "Full Name" as the first field.
- For "boolean", labels should be questions (e.g., "Do you own a driving license?").
- Be concise.
"""

    try:
        reply = call_ai(system_prompt, [])
        clean_reply = reply.strip()
        if "```json" in clean_reply:
            clean_reply = clean_reply.split("```json")[1].split("```")[0]
        elif "```" in clean_reply:
            clean_reply = clean_reply.split("```")[1].split("```")[0]
            
        result = json.loads(clean_reply.strip())
        return jsonify(result)
    except:
        return jsonify({
            "fields": [
                {"name": "name", "label": "Full Name", "type": "text"},
                {"name": "age", "label": "Your Age", "type": "number"},
                {"name": "details", "label": "Other relevant details (State, Occupation, etc.)", "type": "text"}
            ]
        })


@app.route("/validate_eligibility", methods=["POST"])
def validate_eligibility():
    """
    Uses AI to analyze user details against scheme criteria and returns a status + reasoning.
    """
    data = request.get_json() or {}
    scheme_name = data.get("scheme_name", "this scheme")
    criteria = data.get("criteria", "No specific criteria listed.")
    user_details = data.get("user_details", "")
    
    if not user_details:
        return jsonify({"error": "Please provide your details first."}), 400

    system_prompt = f"""You are a strict Eligibility Verification Expert for Indian Government Schemes.
Your task is to analyze if a user is eligible for the following scheme: "{scheme_name}".

SCHEME ELIGIBILITY CRITERIA:
{criteria}

USER PROFILE:
{user_details}

RULES:
- Return ONLY a JSON object. No conversation.
- JSON structure:
  {{
    "status": "eligible" | "maybe" | "ineligible",
    "reasoning": "A brief explanation of why. Mention missing documents or specific rules violated."
  }}
- Be objective. If critical data (income, age) is missing, say "maybe".
"""

    try:
        reply = call_ai(system_prompt, [])
        
        # Clean AI response if it wrapped it in code blocks
        clean_reply = reply.strip()
        if "```json" in clean_reply:
            clean_reply = clean_reply.split("```json")[1].split("```")[0]
        elif "```" in clean_reply:
            clean_reply = clean_reply.split("```")[1].split("```")[0]
            
        result = json.loads(clean_reply.strip())
        return jsonify(result)
    except Exception as e:
        # Fallback parsing
        status = "maybe"
        lower_reply = reply.lower() if 'reply' in locals() else ""
        if "not eligible" in lower_reply or "ineligible" in lower_reply: 
            status = "ineligible"
        elif "eligible" in lower_reply: 
            status = "eligible"
        
        return jsonify({
            "status": status, 
            "reasoning": reply.strip() if 'reply' in locals() else "Could not verify automatically. Please check criteria manually."
        })


# All 28 Indian States + 8 Union Territories
ALL_INDIA_STATES = sorted([
    # States
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
    "Chhattisgarh", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    # Union Territories
    "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
    "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
])

@app.route("/states")
def get_states():
    return jsonify({"states": ALL_INDIA_STATES})


@app.route("/health")
def health():
    api_key_set = bool(os.environ.get("GROQ_API_KEY", "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"))
    return jsonify({
        "status": "ok",
        "schemes_loaded": len(SCHEMES),
        "ai_ready": api_key_set,
        "model": MODEL,
    })


# ─── Run ──────────────────────────────────────────────────
if __name__ == "__main__":
    api_key = os.environ.get("GROQ_API_KEY", "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")
    print("\n" + "="*55)
    print("  AI India Schemes Chatbot")
    print("="*55)
    print(f"  Schemes loaded : {len(SCHEMES)}")
    print(f"  AI Model       : {MODEL}")
    if api_key:
        print(f"  API Key        : Set ({api_key[:8]}...)")
    else:
        print("  API Key        : NOT SET")
        print("  -> Set it with: set GROQ_API_KEY=gsk_...")
    print(f"  Server         : http://localhost:5000")
    print("="*55 + "\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
