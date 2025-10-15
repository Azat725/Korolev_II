const chat = document.getElementById("chat");
const form = document.getElementById("chatForm");
const input = document.getElementById("userInput");
const historyList = document.getElementById("historyList");
const clearBtn = document.getElementById("clearHistory");
const themeToggle = document.getElementById("themeToggle");

const API_URL = "http://localhost:3000/api/chat";

let chats = JSON.parse(localStorage.getItem("deepseek_chats") || "[]");
let currentChatId = null;

/* ===== Тема: авто + ручной переключатель с сохранением ===== */
(function initTheme() {
  const saved = localStorage.getItem("deepseek_theme");
  if (saved === "light" || saved === "dark") {
    document.documentElement.setAttribute("data-theme", saved);
  }
  updateThemeIcon();
})();
themeToggle?.addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("deepseek_theme", next);
  updateThemeIcon();
});
function updateThemeIcon() {
  const cur = document.documentElement.getAttribute("data-theme");
  let isDark = false;
  if (cur) {
    isDark = cur === "dark";
  } else {
    isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  if (themeToggle) themeToggle.textContent = isDark ? "☼" : "☾";
}

/* ===== Инициализация списка/чата ===== */
renderHistory();
if (chats.length) loadChat(chats[chats.length - 1].id);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  if (!currentChatId) {
    const newChat = { id: crypto.randomUUID(), title: text.slice(0, 40), messages: [] };
    chats.push(newChat);
    currentChatId = newChat.id;
  }

  const chatData = getCurrentChat();
  chatData.messages.push({ role: "user", text });
  chatData.messages.push({ role: "ai", text: "…" });
  saveChats();
  renderChat(chatData);

  const aiReply = await sendToAI(text);
  chatData.messages[chatData.messages.length - 1].text = aiReply;
  saveChats();
  renderChat(chatData);
});

clearBtn.addEventListener("click", () => {
  if (confirm("Очистить всю историю запросов?")) {
    chats = [];
    currentChatId = null;
    saveChats();
    renderHistory();
    chat.innerHTML = "";
  }
});

function getCurrentChat() {
  return chats.find(c => c.id === currentChatId);
}

function renderChat(chatData) {
  chat.innerHTML = "";
  chatData.messages.forEach(msg => {
    const div = document.createElement("div");
    div.className = `message ${msg.role}`;
    if (msg.role === "ai") {
      // Парсим Markdown
      const html = marked.parse(msg.text, { breaks: true });
      div.innerHTML = html;
    } else {
      div.textContent = msg.text;
    }
    chat.appendChild(div);
  });
  chat.scrollTop = chat.scrollHeight;
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = "";
  chats.forEach(c => {
    const li = document.createElement("li");
    li.textContent = c.title || "Без названия";
    li.classList.toggle("active", c.id === currentChatId);
    li.onclick = () => loadChat(c.id);
    historyList.appendChild(li);
  });
}

function loadChat(id) {
  currentChatId = id;
  const chatData = getCurrentChat();
  renderChat(chatData);
}

function saveChats() {
  localStorage.setItem("deepseek_chats", JSON.stringify(chats));
}

async function sendToAI(prompt) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) return `Ошибка ${res.status}: ${res.statusText}`;
  const data = await res.json();
  return data.answer || "(нет ответа)";
}
