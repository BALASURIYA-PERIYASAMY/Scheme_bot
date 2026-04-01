/**
 * SchemeBot AI — Frontend JavaScript
 * ════════════════════════════════════
 * Features:
 *  - Sends conversation history to backend for context-aware AI replies
 *  - Renders AI markdown responses (bold, headers, lists, links)
 *  - Voice input via Web Speech API
 *  - Profile-based scheme matching
 *  - Streaming-style character reveal animation for bot replies
 *  - Context pill shows detected state/category
 */

"use strict";

// ─── DOM ──────────────────────────────────────────────────
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");
const voiceStatus = document.getElementById("voiceStatus");
const typingBar = document.getElementById("typingBar");
const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const sidebarClose = document.getElementById("sidebarClose");
const overlay = document.getElementById("overlay");
const newChatBtn = document.getElementById("newChatBtn");
const pState = document.getElementById("pState");
const pCategory = document.getElementById("pCategory");
const pIncome = document.getElementById("pIncome");
const matchBtn = document.getElementById("matchBtn");
const splash = document.getElementById("splash");
const contextPill = document.getElementById("contextPill");
const contextLabel = document.getElementById("contextLabel");
const aiStatusDot = document.querySelector(".ai-dot");
const aiStatusTxt = document.getElementById("aiStatus");

// ─── State ────────────────────────────────────────────────
let conversationHistory = [];  // [{role, content}] sent to API
let isWaiting = false;
let recognition = null;
let selectedLanguage = {
    code: "en",
    name: "English",
    native: "English",
    flag: "🌐",
    voiceLang: "en-IN",
    instruction: ""
};

// Languages supported
const LANGUAGES = [
    { code: "en", name: "English", native: "English", flag: "🌐", voiceLang: "en-IN", instruction: "" },
    { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳", voiceLang: "hi-IN", instruction: "Please reply in Hindi (हिन्दी). Use Devanagari script throughout your response." },
    { code: "ta", name: "Tamil", native: "தமிழ்", flag: "🇮🇳", voiceLang: "ta-IN", instruction: "Please reply in Tamil (தமிழ்). Use Tamil script throughout your response." },
    { code: "te", name: "Telugu", native: "తెలుగు", flag: "🇮🇳", voiceLang: "te-IN", instruction: "Please reply in Telugu (తెలుగు). Use Telugu script throughout your response." },
    { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳", voiceLang: "kn-IN", instruction: "Please reply in Kannada (ಕನ್ನಡ). Use Kannada script throughout your response." },
    { code: "ml", name: "Malayalam", native: "മലയാളം", flag: "🇮🇳", voiceLang: "ml-IN", instruction: "Please reply in Malayalam (മലയാളം). Use Malayalam script throughout your response." },
    { code: "mr", name: "Marathi", native: "मराठी", flag: "🇮🇳", voiceLang: "mr-IN", instruction: "Please reply in Marathi (मराठी). Use Devanagari script throughout your response." },
    { code: "gu", name: "Gujarati", native: "ગુજરાતી", flag: "🇮🇳", voiceLang: "gu-IN", instruction: "Please reply in Gujarati (ગુજરાતી). Use Gujarati script throughout your response." },
    { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", flag: "🇮🇳", voiceLang: "pa-IN", instruction: "Please reply in Punjabi (ਪੰਜਾਬੀ). Use Gurmukhi script throughout your response." },
    { code: "bn", name: "Bengali", native: "বাংলা", flag: "🇮🇳", voiceLang: "bn-IN", instruction: "Please reply in Bengali (বাংলা). Use Bengali script throughout your response." },
    { code: "or", name: "Odia", native: "ଓଡ଼ିଆ", flag: "🇮🇳", voiceLang: "or-IN", instruction: "Please reply in Odia (ଓଡ଼ିଆ). Use Odia script throughout your response." },
    { code: "as", name: "Assamese", native: "অসমীয়া", flag: "🇮🇳", voiceLang: "as-IN", instruction: "Please reply in Assamese (অসমীয়া). Use Assamese script throughout your response." },
    { code: "ur", name: "Urdu", native: "اردو", flag: "🇮🇳", voiceLang: "ur-IN", instruction: "Please reply in Urdu (اردو). Use Nastaliq/Urdu script throughout your response." },
    { code: "sa", name: "Sanskrit", native: "संस्कृतम्", flag: "🇮🇳", voiceLang: "sa-IN", instruction: "Please reply in Sanskrit (संस्कृतम्‌). Use Devanagari script throughout your response." },
    { code: "ne", name: "Nepali", native: "नेपाली", flag: "🇳🇵", voiceLang: "ne-NP", instruction: "Please reply in Nepali (नेपाली). Use Devanagari script throughout your response." },
    { code: "si", name: "Sinhala", native: "සිංහල", flag: "🇱🇰", voiceLang: "si-LK", instruction: "Please reply in Sinhala (සිංහල). Use Sinhala script throughout your response." },
    { code: "ar", name: "Arabic", native: "عربي", flag: "🇸🇦", voiceLang: "ar-SA", instruction: "Please reply in Arabic (عربي). Use Arabic script throughout your response." },
    { code: "fr", name: "French", native: "Français", flag: "🇫🇷", voiceLang: "fr-FR", instruction: "Please reply in French (Français) throughout your response." },
    { code: "de", name: "German", native: "Deutsch", flag: "🇩🇪", voiceLang: "de-DE", instruction: "Please reply in German (Deutsch) throughout your response." },
    { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸", voiceLang: "es-ES", instruction: "Please reply in Spanish (Español) throughout your response." },
    { code: "zh", name: "Chinese", native: "中文", flag: "🇨🇳", voiceLang: "zh-CN", instruction: "Please reply in Simplified Chinese (中文) throughout your response." },
    { code: "ja", name: "Japanese", native: "日本語", flag: "🇯🇵", voiceLang: "ja-JP", instruction: "Please reply in Japanese (日本語) throughout your response." },
];

// Category chips shown after every bot reply
const CAT_CHIPS = [
    { icon: "🌾", short: "Agriculture", display: "Agriculture, Rural &amp; Environment", api: "Agriculture, Rural and Environment schemes" },
    { icon: "🤝", short: "Benefits", display: "Benefits &amp; Social Development", api: "Benefits and Social Development schemes" },
    { icon: "💼", short: "Business", display: "Business &amp; Self-Employed", api: "Business and Self-Employed schemes" },
    { icon: "🛒", short: "Citizenship", display: "Citizenship, Visa &amp; Passports", api: "Citizenship Visa and Passport schemes" },
    { icon: "🫡", short: "Defence", display: "Defence &amp; Foreign Affairs", api: "Defence and Foreign Affairs schemes" },
    { icon: "🚘", short: "Transport", display: "Driving &amp; Transport", api: "Driving and Transport schemes" },
    { icon: "🎓", short: "Education", display: "Education &amp; Learning", api: "Education and Learning schemes scholarships" },
    { icon: "🏛️", short: "Governance", display: "Governance &amp; Planning", api: "Governance and Planning schemes" },
    { icon: "🏥", short: "Health", display: "Health &amp; Wellness", api: "Health and Wellness schemes" },
    { icon: "🏠", short: "Housing", display: "Housing &amp; Local Services", api: "Housing and Local Services schemes" },
    { icon: "🏭", short: "Infrastructure", display: "Infrastructure &amp; Industries", api: "Infrastructure and Industries schemes" },
    { icon: "📊", short: "Jobs", display: "Jobs", api: "Jobs and Employment schemes" },
    { icon: "⚖️", short: "Justice", display: "Justice, Law &amp; Grievances", api: "Justice Law and Grievances schemes" },
    { icon: "💰", short: "Money", display: "Money &amp; Taxes", api: "Money and Taxes schemes" },
    { icon: "💻", short: "Science/IT", display: "Science, IT &amp; Communication", api: "Science IT and Communication schemes" },
    { icon: "✈️", short: "Tourism", display: "Travel &amp; Tourism", api: "Travel and Tourism schemes" },
    { icon: "👨‍👩‍👧‍👦", short: "Families", display: "Welfare of Families", api: "Welfare of Families schemes" },
    { icon: "🏅", short: "Youth", display: "Youth, Sports &amp; Culture", api: "Youth Sports and Culture schemes" },
];

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
    loadStates();
    checkAIHealth();
    setupListeners();
    setupVoice();
    setupLanguagePicker();
    loadRecentChats();
    userInput.focus();
});

async function loadStates() {
    try {
        const res = await fetch("/states");
        const data = await res.json();
        data.states.forEach(s => {
            const o = document.createElement("option");
            o.value = s; o.textContent = s;
            pState.appendChild(o);
        });
    } catch (_) { }
}

async function checkAIHealth() {
    try {
        const res = await fetch("/health");
        const data = await res.json();
        if (data.ai_ready) {
            aiStatusDot.classList.add("ready");
            aiStatusTxt.textContent = `AI ready · ${data.schemes_loaded} schemes`;
        } else {
            aiStatusDot.classList.add("error");
            aiStatusTxt.textContent = "API key not set — see README";
        }
    } catch (_) {
        aiStatusDot.classList.add("error");
        aiStatusTxt.textContent = "Server offline";
    }
}

// ═══════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════════════════════
function setupListeners() {
    sendBtn.addEventListener("click", handleSend);

    userInput.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    // Auto-resize textarea
    userInput.addEventListener("input", () => {
        userInput.style.height = "auto";
        userInput.style.height = Math.min(userInput.scrollHeight, 150) + "px";
    });

    // Sidebar
    menuBtn.addEventListener("click", () => { sidebar.classList.add("open"); overlay.classList.add("show"); });
    sidebarClose.addEventListener("click", closeSidebar);
    overlay.addEventListener("click", closeSidebar);

    // New chat
    newChatBtn.addEventListener("click", resetConversation);

    // Clear recent chats
    const clearChatsBtn = document.getElementById("clearChatsBtn");
    if (clearChatsBtn) {
        clearChatsBtn.addEventListener("click", () => {
            localStorage.removeItem("Schemebot_recents");
            renderRecentChats();
        });
    }

    // Profile match
    matchBtn.addEventListener("click", handleProfileMatch);
}

function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
}

function resetConversation() {
    conversationHistory = [];
    chatWindow.innerHTML = "";
    chatWindow.appendChild(splash);
    splash.style.display = "";
    updateContextPill(null, []);
    closeSidebar();
    userInput.focus();
}

// ═══════════════════════════════════════════════════════════
//  SEND
// ═══════════════════════════════════════════════════════════
function sendQuick(msg) { sendMessage(msg); }

function handleSend() {
    const text = userInput.value.trim();
    if (!text || isWaiting) return;
    sendMessage(text);
    userInput.value = "";
    userInput.style.height = "auto";
}

async function sendMessage(text) {
    if (!text || isWaiting) return;

    // Hide splash on first message
    if (splash && splash.style.display !== "none") {
        splash.style.display = "none";
    }

    // Append user message
    appendUserBubble(text);
    scrollBottom();

    isWaiting = true;
    sendBtn.disabled = true;
    typingBar.style.display = "flex";
    scrollBottom();

    // Add to history
    conversationHistory.push({ role: "user", content: text });

    try {
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text,
                history: conversationHistory.slice(-12), // last 12 turns
                language_instruction: selectedLanguage.instruction,
            }),
        });

        typingBar.style.display = "none";

        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();

        // Update context pill
        updateContextPill(data.state, data.categories || []);

        // Render bot reply with context tags
        const botRow = appendBotBubble(data.reply, {
            state: data.state,
            categories: data.categories,
            schemes_count: data.schemes_count,
            schemes: data.schemes
        });

        // Add to history
        conversationHistory.push({ role: "assistant", content: data.reply });

        // Save to recent chats
        saveRecentChat(text);

    } catch (err) {
        typingBar.style.display = "none";
        const errMsg = err.message.includes("Failed to fetch")
            ? "Could not reach the server. Is Flask running?"
            : `Error: ${err.message}`;
        appendBotBubble(errMsg, null, true);
    }

    isWaiting = false;
    sendBtn.disabled = false;
    scrollBottom();
    userInput.focus();
}

// ═══════════════════════════════════════════════════════════
//  PROFILE MATCHING
// ═══════════════════════════════════════════════════════════
function handleProfileMatch() {
    const state = pState.value;
    const type = document.getElementById("pType").value;
    const category = pCategory.value;

    if (!category) {
        alert("Please select a Category from the dropdown to browse its schemes.");
        return;
    }

    // Set the global type filter so the panel knows which tab to show
    currentTypeFilter = type;

    closeSidebar();

    // Find the api string for the category
    const catSelect = document.getElementById("pCategory");
    const categoryDisplay = catSelect.options[catSelect.selectedIndex].text.replace(/^[\u0000-\u2FFF]+\s?/, '').trim(); // Remove emoji
    const catObj = CAT_CHIPS.find(c => c.display === category) || { api: category };

    // Use the existing Category Panel feature
    openCategoryPanel(categoryDisplay || category, catObj.api);

    // Sync the tabs in the panel
    setTimeout(() => {
        const tabToActivate = document.querySelector(`.type-tab[data-filter="${type}"]`);
        if (tabToActivate) {
            document.querySelectorAll(".type-tab").forEach(t => t.classList.toggle("active", t === tabToActivate));
        }

        // If state is selected, apply it as a text filter
        if (state) {
            const filterInp = document.getElementById("catFilter");
            if (filterInp) {
                filterInp.value = state;
                renderSchemeCards(state.toLowerCase());
            }
        }
    }, 600);
}

// ═══════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════
function appendUserBubble(text) {
    const row = document.createElement("div");
    row.className = "msg-row user-row";
    row.innerHTML = `
    <div class="msg-avatar user-av">🧑</div>
    <div class="msg-bubble">${escapeHtml(text)}</div>
  `;
    chatWindow.appendChild(row);
}

function appendBotBubble(text, meta = null, isError = false) {
    const row = document.createElement("div");
    row.className = "msg-row bot-row";

    // Context tags
    let ctxHtml = "";
    if (meta && (meta.state || (meta.categories && meta.categories.length))) {
        const tags = [];
        if (meta.state)
            tags.push(`<span class="ctx-tag ctx-state">📍 ${meta.state}</span>`);
        if (meta.categories && meta.categories.length)
            meta.categories.forEach(c => tags.push(`<span class="ctx-tag ctx-cat">🏷 ${cap(c)}</span>`));
        if (meta.schemes_count)
            tags.push(`<span class="ctx-tag ctx-db">📂 ${meta.schemes_count} scheme${meta.schemes_count !== 1 ? "s" : ""} referenced</span>`);
        if (tags.length)
            ctxHtml = `<div class="msg-context">${tags.join("")}</div>`;
    }

    const bubbleClass = "msg-bubble" + (isError ? " error-bubble" : "");
    row.innerHTML = `
    <div class="msg-avatar bot-av">🇮🇳</div>
    <div>
      ${ctxHtml}
      <div class="${bubbleClass}">
        ${renderMarkdown(text)}
        <div id="applyContainer-${Date.now()}"></div>
      </div>
    </div>
  `;
    chatWindow.appendChild(row);

    // Append 'Apply' buttons if there are schemes to apply to
    if (!isError && meta && meta.schemes && meta.schemes.length > 0) {
        const applyContainer = row.querySelector(".msg-bubble > div[id^='applyContainer-']");
        if (applyContainer) {
            applyContainer.className = "bot-apply-row";
            meta.schemes.forEach((s) => {
                // Apply Button
                const abtn = document.createElement("button");
                abtn.className = "bot-apply-btn";
                abtn.innerHTML = `Apply: ${escapeHtml(s.name)} ↗`;
                abtn.onclick = () => showApplyModal(s);
                applyContainer.appendChild(abtn);

                // Check Button
                const cbtn = document.createElement("button");
                cbtn.className = "bot-check-btn";
                cbtn.innerHTML = `🛡 Check Eligibility`;
                cbtn.onclick = () => showEligibilityModal(s);
                applyContainer.appendChild(cbtn);
            });
        }
    }

    // Append category chips after every successful bot reply
    if (!isError) {
        const chipsRow = document.createElement("div");
        chipsRow.className = "cat-chips-row";
        chipsRow.innerHTML = `
          <span class="cat-chips-label">Browse by category:</span>
          <div class="cat-chips">
            ${CAT_CHIPS.map(c => `<button class="cat-chip" onclick="openCategoryPanel('${c.display}','${c.api}')">${c.icon} ${c.short}</button>`).join("")}
          </div>
        `;
        chatWindow.appendChild(chipsRow);
    }

    return row;
}

// ─── Simple Markdown Renderer ─────────────────────────────
function renderMarkdown(text) {
    let html = escapeHtmlForMd(text);

    // Headers
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");

    // Bold/italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Links
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1 ↗</a>');

    // Bare URLs
    html = html.replace(/(^|[\s\n])(https?:\/\/[^\s\n<]+)/g,
        '$1<a href="$2" target="_blank" rel="noopener">$2 ↗</a>');

    // Horizontal rule
    html = html.replace(/^---$/gm, "<hr/>");

    // Unordered lists (•, -, *)
    html = html.replace(/^[•\-\*] (.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/s, match => "<ul>" + match + "</ul>");

    // Numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

    // Paragraphs (double newline)
    html = html
        .split(/\n{2,}/)
        .map(block => {
            block = block.trim();
            if (!block) return "";
            if (/^<(h[1-6]|ul|ol|li|hr)/.test(block)) return block;
            return `<p>${block.replace(/\n/g, "<br/>")}</p>`;
        })
        .join("\n");

    return html;
}

// ─── Context Pill ─────────────────────────────────────────
function updateContextPill(state, categories) {
    if (!state && (!categories || !categories.length)) {
        contextPill.style.display = "none";
        return;
    }
    const parts = [];
    if (state) parts.push(state);
    if (categories && categories.length) parts.push(...categories.map(cap));
    contextLabel.textContent = parts.join(" · ");
    contextPill.style.display = "";
}

// ═══════════════════════════════════════════════════════════
//  LANGUAGE PICKER
// ═══════════════════════════════════════════════════════════
function setupLanguagePicker() {
    const wrap = document.getElementById("langPickerWrap");
    const trigger = document.getElementById("langTrigger");
    const dropdown = document.getElementById("langDropdown");
    const langList = document.getElementById("langList");
    const langSearch = document.getElementById("langSearch");
    const langFlag = document.getElementById("langFlag");
    const langLabel = document.getElementById("langLabel");
    const activeLangHint = document.getElementById("activeLangHint");

    function renderList(filter) {
        langList.innerHTML = "";
        const items = filter
            ? LANGUAGES.filter(l =>
                l.name.toLowerCase().includes(filter) ||
                l.native.toLowerCase().includes(filter))
            : LANGUAGES;

        items.forEach(lang => {
            const div = document.createElement("div");
            div.className = "lang-item" + (lang.code === selectedLanguage.code ? " active" : "");
            div.innerHTML = `
              <span class="lang-item-flag">${lang.flag}</span>
              <span class="lang-item-info">
                <span class="lang-item-native">${lang.native}</span>
                <span class="lang-item-eng">${lang.name}</span>
              </span>
            `;
            div.addEventListener("click", (e) => {
                e.stopPropagation();
                selectedLanguage = lang;
                langFlag.textContent = lang.flag;
                langLabel.textContent = lang.code.toUpperCase();
                if (activeLangHint) activeLangHint.textContent = "Currently: " + lang.name + (lang.native !== lang.name ? " (" + lang.native + ")" : "");
                // Update voice recognition language
                if (recognition) recognition.lang = lang.voiceLang;
                wrap.classList.remove("open");
                renderList("");
            });
            langList.appendChild(div);
        });

        if (!items.length) {
            langList.innerHTML = '<div style="padding:12px 14px;font-size:12.5px;color:var(--text-3)">No match found</div>';
        }
    }

    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = wrap.classList.toggle("open");
        if (isOpen) {
            renderList("");
            setTimeout(() => langSearch.focus(), 50);
        }
    });

    langSearch.addEventListener("input", () => {
        renderList(langSearch.value.trim().toLowerCase());
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
        if (!wrap.contains(e.target)) wrap.classList.remove("open");
    });

    // Stop propagation inside dropdown so the card's onclick doesn't fire
    dropdown.addEventListener("click", (e) => e.stopPropagation());

    renderList("");
}

// ═══════════════════════════════════════════════════════════
//  VOICE INPUT
// ═══════════════════════════════════════════════════════════
function setupVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        voiceBtn.title = "Voice not supported in this browser";
        voiceBtn.style.opacity = "0.35";
        voiceBtn.style.cursor = "not-allowed";
        return;
    }

    recognition = new SR();
    recognition.lang = selectedLanguage.voiceLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.addEventListener("result", e => {
        const text = e.results[0][0].transcript;
        userInput.value = text;
        stopVoice();
        handleSend();
    });
    recognition.addEventListener("end", stopVoice);
    recognition.addEventListener("error", stopVoice);

    voiceBtn.addEventListener("click", () => {
        if (voiceBtn.classList.contains("listening")) stopVoice();
        else startVoice();
    });
}

function startVoice() {
    voiceBtn.classList.add("listening");
    voiceStatus.textContent = "🎙 Listening… speak now";
    recognition.start();
}
function stopVoice() {
    voiceBtn.classList.remove("listening");
    voiceStatus.textContent = "";
    try { recognition.stop(); } catch (_) { }
}

// ═══════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════
function scrollBottom() {
    requestAnimationFrame(() => { chatWindow.scrollTop = chatWindow.scrollHeight; });
}

// Escape for user bubbles (no HTML allowed)
function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Escape only dangerous chars before markdown rendering
function escapeHtmlForMd(s) {
    return s.replace(/&(?!amp;|lt;|gt;|quot;)/g, "&amp;");
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ═══════════════════════════════════════════════════════════
//  RECENT CHATS
// ═══════════════════════════════════════════════════════════
const RECENT_KEY = "Schemebot_recents";
const MAX_RECENTS = 15;

function saveRecentChat(text) {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 4) return;

    let recents = getRecents();
    // Remove duplicate if exists
    recents = recents.filter(r => r !== trimmed);
    // Prepend newest
    recents.unshift(trimmed);
    // Limit
    recents = recents.slice(0, MAX_RECENTS);

    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recents)); } catch (_) { }
    renderRecentChats();
}

function getRecents() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    } catch (_) { return []; }
}

function loadRecentChats() {
    renderRecentChats();
}

function renderRecentChats() {
    const list = document.getElementById("recentList");
    const noRecents = document.getElementById("noRecents");
    if (!list) return;

    const recents = getRecents();

    // Remove old items (keep noRecents placeholder)
    list.querySelectorAll(".recent-item").forEach(el => el.remove());

    if (recents.length === 0) {
        if (noRecents) noRecents.style.display = "";
        return;
    }

    if (noRecents) noRecents.style.display = "none";

    recents.forEach(text => {
        const btn = document.createElement("button");
        btn.className = "recent-item";
        btn.innerHTML = `
          <span class="recent-item-icon">&#128172;</span>
          <span class="recent-item-text">${escapeHtml(text)}</span>
        `;
        btn.addEventListener("click", () => {
            sendQuick(text);
            closeSidebar();
        });
        list.appendChild(btn);
    });
}

// ═══════════════════════════════════════════════════════════
//  CATEGORY PANEL
// ═══════════════════════════════════════════════════════════
const CATEGORY_ICONS = {
    "Agriculture, Rural & Environment": "🌾",
    "Benefits & Social Development": "🤝",
    "Business & Self-Employed": "💼",
    "Citizenship, Visa & Passports": "🛒",
    "Defence & Foreign Affairs": "🫡",
    "Driving & Transport": "🚘",
    "Education & Learning": "🎓",
    "Governance & Planning": "🏛️",
    "Health & Wellness": "🏥",
    "Housing & Local Services": "🏠",
    "Infrastructure & Industries": "🏭",
    "Jobs": "📊",
    "Justice, Law & Grievances": "⚖️",
    "Money & Taxes": "💰",
    "Science, IT & Communication": "💻",
    "Travel & Tourism": "✈️",
    "Welfare of Families": "👨‍👩‍👧‍👦",
    "Youth, Sports & Culture": "🏅",
};

let currentSchemes = [];
let currentTypeFilter = "all";

function openCategoryPanel(displayName, apiCategory, type) {
    const panel = document.getElementById("catPanel");
    const overlay = document.getElementById("catPanelOverlay");
    const loading = document.getElementById("catPanelLoading");
    const cards = document.getElementById("schemeCards");
    const empty = document.getElementById("catPanelEmpty");
    const errorEl = document.getElementById("catPanelError");
    const nameEl = document.getElementById("catPanelName");
    const countEl = document.getElementById("catPanelCount");
    const iconEl = document.getElementById("catPanelIcon");
    const filterInp = document.getElementById("catFilter");
    const footerText = document.getElementById("catFooterText");
    const closeBtn = document.getElementById("catPanelClose");

    // Strip HTML entities for display
    const cleanName = displayName.replace(/&amp;/g, "&");

    // Set icon
    if (iconEl) iconEl.textContent = CATEGORY_ICONS[cleanName] || "📋";
    if (nameEl) nameEl.textContent = cleanName;
    if (countEl) countEl.textContent = "Fetching schemes…";
    if (filterInp) filterInp.value = "";

    currentTypeFilter = type || "all";
    document.querySelectorAll(".type-tab").forEach(t => t.classList.toggle("active", t.dataset.filter === currentTypeFilter));

    if (cards) cards.innerHTML = "";
    if (loading) loading.style.display = "flex";
    if (empty) empty.style.display = "none";
    if (errorEl) errorEl.style.display = "none";

    // Open panel
    overlay.classList.add("show");
    panel.classList.add("open");
    document.body.style.overflow = "hidden";

    // Wire close
    if (closeBtn) closeBtn.onclick = closeCategoryPanel;
    if (overlay) overlay.onclick = closeCategoryPanel;

    // Wire filter input
    if (filterInp) filterInp.oninput = () => renderSchemeCards(filterInp.value.trim().toLowerCase());

    // Fetch from backend
    fetch("/category_schemes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: apiCategory }),
    })
        .then(res => res.json())
        .then(data => {
            loading.style.display = "none";
            if (data.error) {
                errorEl.textContent = "⚠️ " + data.error;
                errorEl.style.display = "";
                countEl.textContent = "Unable to load";
                return;
            }
            currentSchemes = data.schemes || [];
            countEl.textContent = `${currentSchemes.length} schemes found`;
            footerText.textContent = `${currentSchemes.length} schemes · Click any to ask SchemeBot`;
            renderSchemeCards("");
        })
        .catch(err => {
            loading.style.display = "none";
            errorEl.textContent = "⚠️ Network error. Is the server running?";
            errorEl.style.display = "";
            countEl.textContent = "Error";
        });
}

function closeCategoryPanel() {
    const panel = document.getElementById("catPanel");
    const overlay = document.getElementById("catPanelOverlay");
    panel.classList.remove("open");
    overlay.classList.remove("show");
    document.body.style.overflow = "";
}

function filterSchemes(type, btn) {
    currentTypeFilter = type;
    document.querySelectorAll(".type-tab").forEach(t => t.classList.toggle("active", t === btn));
    const filterInp = document.getElementById("catFilter");
    renderSchemeCards(filterInp ? filterInp.value.trim().toLowerCase() : "");
}

function renderSchemeCards(textFilter) {
    const cards = document.getElementById("schemeCards");
    const empty = document.getElementById("catPanelEmpty");
    if (!cards) return;

    let list = currentSchemes;

    // Type filter
    if (currentTypeFilter !== "all") {
        list = list.filter(s => (s.type || "").toLowerCase() === currentTypeFilter.toLowerCase());
    }

    // Text filter
    if (textFilter) {
        list = list.filter(s =>
            (s.name || "").toLowerCase().includes(textFilter) ||
            (s.state || "").toLowerCase().includes(textFilter) ||
            (s.ministry || "").toLowerCase().includes(textFilter) ||
            (s.benefits || "").toLowerCase().includes(textFilter) ||
            (s.eligibility || "").toLowerCase().includes(textFilter)
        );
    }

    cards.innerHTML = "";

    if (list.length === 0) {
        empty.style.display = "";
        return;
    }
    empty.style.display = "none";

    list.forEach((scheme, i) => {
        const div = document.createElement("div");
        div.className = "scheme-card";
        div.style.animationDelay = Math.min(i * 0.03, 0.5) + "s";

        const isCentral = (scheme.type || "").toLowerCase() === "central";
        const badgeClass = isCentral ? "central" : "state";
        const badgeLabel = isCentral ? "Central" : (scheme.state || "State");

        const applyHtml = scheme.apply_link
            ? `<div class="scheme-apply">
                <a href="${escapeHtml(scheme.apply_link)}" target="_blank" rel="noopener">Apply ↗</a>
                <button class="in-card-check-btn" onclick="event.stopPropagation(); showEligibilityModal(${JSON.stringify(scheme).replace(/"/g, '&quot;')})">Check Eligibility</button>
               </div>`
            : `<div class="scheme-apply">
                <button class="in-card-check-btn" onclick="event.stopPropagation(); showEligibilityModal(${JSON.stringify(scheme).replace(/"/g, '&quot;')})">Check Eligibility</button>
               </div>`;

        div.innerHTML = `
          <div class="scheme-card-top">
            <div class="scheme-name">${escapeHtml(scheme.name || "Unknown Scheme")}</div>
            <span class="scheme-badge ${badgeClass}">${escapeHtml(badgeLabel)}</span>
          </div>
          ${scheme.ministry ? `<div class="scheme-ministry">🏛 ${escapeHtml(scheme.ministry)}</div>` : ""}
          ${scheme.benefits ? `<div class="scheme-benefits">${escapeHtml(scheme.benefits)}</div>` : ""}
          ${scheme.eligibility ? `<div class="scheme-ministry">👤 ${escapeHtml(scheme.eligibility)}</div>` : ""}
          ${applyHtml}
        `;

        // Click → ask AI
        div.addEventListener("click", (e) => {
            if (e.target.tagName === "A") return; // let link open
            closeCategoryPanel();
            sendMessage(`Tell me everything about the "${scheme.name}" scheme — eligibility, benefits, how to apply, and documents required.`);
        });

        cards.appendChild(div);
    });
}

// ═══════════════════════════════════════════════════════════
//  APPLY POPUP MODAL
// ═══════════════════════════════════════════════════════════
function showApplyModal(scheme) {
    if (!scheme) return;

    const overlay = document.getElementById("applyOverlay");
    const modal = document.getElementById("applyModal");

    // Populate data
    document.getElementById("applyName").textContent = scheme.name || "Unknown Scheme";
    document.getElementById("applyState").textContent = scheme.state || "All India";
    document.getElementById("applyCat").textContent = (scheme.category || []).join(", ") || "General";
    document.getElementById("applyMin").textContent = scheme.ministry || "Not specified";
    document.getElementById("applyBen").textContent = scheme.benefits || "No benefits listed.";
    document.getElementById("applyElig").textContent = scheme.eligibility || "No eligibility criteria listed.";

    const badge = document.getElementById("applyBadge");
    const isCentral = (scheme.type || scheme.state || "").toLowerCase().includes("central") || (scheme.state || "").toLowerCase() === "all india";
    badge.textContent = isCentral ? "Central" : "State";
    badge.className = `apply-modal-badge ${isCentral ? "central" : "state"}`;

    const linkBtn = document.getElementById("applyLink");
    if (scheme.application_link || scheme.apply_link) {
        linkBtn.href = scheme.application_link || scheme.apply_link;
        linkBtn.style.display = "inline-flex";
    } else {
        linkBtn.style.display = "none";
    }

    // Show modal
    overlay.classList.add("show");
    modal.classList.add("show");
    document.body.style.overflow = "hidden";

    // Bind close
    const closeIt = () => {
        overlay.classList.remove("show");
        modal.classList.remove("show");
        document.body.style.overflow = "";
    };
    document.getElementById("applyModalClose").onclick = closeIt;
    document.getElementById("applyCancelBtn").onclick = closeIt;
    overlay.onclick = closeIt;
}

// ═══════════════════════════════════════════════════════════
//  ELIGIBILITY CHECKER LOGIC (DYNAMIC)
// ═══════════════════════════════════════════════════════════
async function showEligibilityModal(scheme) {
    if (!scheme) return;

    // UI Elements
    const overlay = document.getElementById("eligOverlay");
    const modal = document.getElementById("eligModal");
    const schemeNameEl = document.getElementById("eligSchemeName");
    const criteriaEl = document.getElementById("eligCriteriaText");
    const formContainer = document.getElementById("eligDynamicForm");
    const verifyBtn = document.getElementById("eligVerifyBtn");
    const resultBox = document.getElementById("eligResult");
    const statusEl = document.getElementById("eligStatus");
    const reasoningEl = document.getElementById("eligReasoning");
    const closeBtn = document.getElementById("eligClose");
    const manualArea = document.getElementById("eligManualArea");
    const manualText = document.getElementById("eligUserText");

    // Reset and Loading State
    if (schemeNameEl) schemeNameEl.textContent = scheme.name;
    if (criteriaEl) criteriaEl.textContent = scheme.eligibility || "No specific eligibility criteria provided.";
    if (resultBox) resultBox.style.display = "none";

    verifyBtn.disabled = true;
    verifyBtn.textContent = "Loading Form...";
    formContainer.innerHTML = `
        <div class="elig-field-loading">
            <div class="spinner-small"></div>
            <p>Analyzing requirements...</p>
        </div>
    `;
    manualArea.style.display = "none";
    manualText.value = "";

    // Show modal
    overlay.classList.add("show");
    modal.classList.add("show");
    document.body.style.overflow = "hidden";

    // Close logic
    const close = () => {
        overlay.classList.remove("show");
        modal.classList.remove("show");
        document.body.style.overflow = "";
    };
    overlay.onclick = close;
    closeBtn.onclick = close;

    // Fetch Dynamic Fields from AI
    try {
        const fieldRes = await fetch("/get_eligibility_fields", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scheme_name: scheme.name,
                criteria: scheme.eligibility
            })
        });
        const fieldData = await fieldRes.json();

        renderDynamicForm(fieldData.fields || []);
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verify My Eligibility";
        manualArea.style.display = "block";
    } catch (err) {
        formContainer.innerHTML = `<p style="color:red">Could not generate form. Please describe your profile below.</p>`;
        manualArea.style.display = "block";
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verify My Eligibility";
    }

    // Helper: Render the form fields
    function renderDynamicForm(fields) {
        formContainer.innerHTML = "";
        const formDiv = document.createElement("div");
        formDiv.className = "elig-form";

        fields.forEach(f => {
            const fieldDiv = document.createElement("div");
            fieldDiv.className = "elig-field";

            if (f.type === "boolean") {
                fieldDiv.innerHTML = `
                    <label class="elig-checkbox-row">
                        <input type="checkbox" id="field-${f.name}" data-label="${f.label}">
                        <span class="elig-checkbox-label">${escapeHtml(f.label)}</span>
                    </label>
                `;
            } else {
                fieldDiv.innerHTML = `
                    <label>${escapeHtml(f.label)}</label>
                    <input type="${f.type === "number" ? "number" : "text"}" 
                           class="elig-input" 
                           id="field-${f.name}" 
                           data-label="${f.label}"
                           placeholder="Enter ${f.label.toLowerCase()}...">
                `;
            }
            formDiv.appendChild(fieldDiv);
        });
        formContainer.appendChild(formDiv);
    }

    // Dynamic Verify Logic
    verifyBtn.onclick = async () => {
        // Collect data from dynamic fields
        let userProfile = "";
        const dynamicInputs = formContainer.querySelectorAll("input");
        let hasAnyInput = false;

        dynamicInputs.forEach(input => {
            const label = input.dataset.label;
            let val = "";
            if (input.type === "checkbox") {
                val = input.checked ? "Yes" : "No";
            } else {
                val = input.value.trim();
                if (val) hasAnyInput = true;
            }
            userProfile += `- ${label}: ${val || "Not specified"}\n`;
        });

        const manualVal = manualText.value.trim();
        if (manualVal) {
            userProfile += `- Additional Details: ${manualVal}\n`;
            hasAnyInput = true;
        }

        if (!hasAnyInput && dynamicInputs.length > 0) {
            alert("Please fill in at least one field to check eligibility.");
            return;
        }

        verifyBtn.disabled = true;
        verifyBtn.textContent = "⌛ Analyzing...";
        resultBox.style.display = "none";

        try {
            const res = await fetch("/validate_eligibility", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scheme_name: scheme.name,
                    criteria: scheme.eligibility,
                    user_details: userProfile
                })
            });
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            // Update UI with Result
            statusEl.className = "result-status status-" + (data.status || "maybe") + "-card";
            resultBox.className = "elig-result status-" + (data.status || "maybe") + "-card";

            const icon = data.status === "eligible" ? "✓" : (data.status === "maybe" ? "❓" : "✕");
            statusEl.innerHTML = `<span>${icon} ${data.status.toUpperCase()}</span>`;
            reasoningEl.textContent = data.reasoning;

            resultBox.style.display = "flex";
            // Scroll result into view
            resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (err) {
            alert("Error verifying eligibility: " + err.message);
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = "Verify My Eligibility";
        }
    };
}

