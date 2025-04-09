const socket = io("https://chat-app-eeiv.onrender.com");

socket.on('connect', () => {
  console.log('Connected to server with id:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err);
});

const status = document.getElementById("status");
const chat = document.getElementById("chat");
const messages = document.getElementById("messages");
const input = document.getElementById("input");
const send = document.getElementById("send");
const next = document.getElementById("next");
const themeToggle = document.getElementById("theme-toggle");
const typingIndicator = document.getElementById("typing-indicator");

send.onclick = sendMessage;
next.onclick = () => {
    addMessage("🔄 Searching for a new partner...");
    socket.emit("next");
};

socket.on("waiting", () => {
    status.textContent = "Waiting for a partner...";
    status.style.display = "block";
    chat.style.display = "none";
    messages.innerHTML = "";
    hideTypingIndicator();
});

socket.on("paired", () => {
    status.style.display = "none";
    chat.style.display = "block";
    messages.innerHTML = "";
    hideTypingIndicator();
});

socket.on("message", (msg) => {
    addMessage(`Stranger: ${msg}`);
});

socket.on("partner-left", () => {
    addMessage("❌ Stranger left the chat.");
    status.textContent = "Partner disconnected.";
    status.style.display = "block";
    chat.style.display = "none";
    hideTypingIndicator();
});

// Listen for typing events from the partner
socket.on("typing", () => {
    showTypingIndicator();
});

socket.on("stopTyping", () => {
    hideTypingIndicator();
});

function sendMessage() {
    const msg = input.value;
    if (msg.trim()) {
        addMessage(`You: ${msg}`);
        socket.emit("message", msg);
        input.value = "";
        // Stop typing indicator when message is sent
        socket.emit("stopTyping");
    }
}

function addMessage(msg) {
    const div = document.createElement("div");
    div.textContent = msg;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

// Enter and Shift+Enter support
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// ESC key to skip chat
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        next.click();
    }
});

// Handle theme toggle
themeToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark", themeToggle.checked);
    localStorage.setItem("theme", themeToggle.checked ? "dark" : "light");
});

// Remember theme on load
window.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        themeToggle.checked = true;
    }
});

// ===== Typing Indicator Logic =====
let typingTimeout;

// Emit "typing" event while the user is typing
input.addEventListener("input", () => {
    socket.emit("typing");

    // Clear the previous timeout if any
    clearTimeout(typingTimeout);

    // Emit "stopTyping" after 1 second of inactivity
    typingTimeout = setTimeout(() => {
        socket.emit("stopTyping");
    }, 1000);
});

function showTypingIndicator() {
    typingIndicator.style.display = "block";
}

function hideTypingIndicator() {
    typingIndicator.style.display = "none";
}
