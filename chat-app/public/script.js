const socket = io("https://chat-app-eeiv.onrender.com");

window.addEventListener("click", () => {
    soundMessage.play().catch(() => {});
    soundConnect.play().catch(() => {});
    soundDisconnect.play().catch(() => {});
}, { once: true });

// 🔊 Sound elements
const soundMessage = document.getElementById("sound-message");
const soundConnect = document.getElementById("sound-connect");
const soundDisconnect = document.getElementById("sound-disconnect");

function playSound(sound) {
    sound.currentTime = 0;
    sound.play().catch((e) => {
        // Some browsers block auto-play unless user interacted
        console.warn("Sound blocked until user interaction:", e);
    });
}

socket.on("message", (msg) => {
    addMessage(`Stranger: ${msg}`);
    playSound(soundMessage);
});

socket.on("paired", () => {
    status.style.display = "none";
    chat.style.display = "block";
    messages.innerHTML = "";
    hideTypingIndicator();
    playSound(soundConnect);
});

socket.on("partner-left", () => {
    addMessage("❌ Stranger left the chat.");
    status.textContent = "Partner disconnected.";
    status.style.display = "block";
    chat.style.display = "none";
    hideTypingIndicator();
    playSound(soundDisconnect);
});

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
    playSound(soundMessage); // <-- test if this plays when you send
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

// 🌗 Auto-detect and remember theme
window.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        themeToggle.checked = true;
    } else if (savedTheme === "light") {
        document.body.classList.remove("dark");
        themeToggle.checked = false;
    } else {
        // Auto-detect system preference on first visit
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefersDark) {
            document.body.classList.add("dark");
            themeToggle.checked = true;
        }
    }
});

// Send emoji when clicked
document.querySelectorAll('.emoji').forEach(btn => {
    btn.addEventListener('click', () => {
        const emoji = btn.textContent;
        socket.emit("reaction", emoji);
        addMessage(`You reacted: ${emoji}`);
    });
});

// Receive emoji reaction
socket.on("reaction", (emoji) => {
    addMessage(`Stranger reacted: ${emoji}`);
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
