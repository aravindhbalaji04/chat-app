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
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

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
});

socket.on("paired", () => {
    status.style.display = "none";
    chat.style.display = "block";
    messages.innerHTML = "";
});

socket.on("message", (msg) => {
    addMessage(`Stranger: ${msg}`);
});

socket.on("partner-left", () => {
    addMessage("❌ Stranger left the chat.");
    status.textContent = "Partner disconnected.";
    status.style.display = "block";
    chat.style.display = "none";
});

// Send message on Enter, newline on Shift+Enter
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        if (e.shiftKey) {
            // Insert newline
            const cursorPos = input.selectionStart;
            input.value = input.value.slice(0, cursorPos) + "\n" + input.value.slice(cursorPos);
            input.selectionStart = input.selectionEnd = cursorPos + 1;
            e.preventDefault(); // Prevent sending
        } else {
            // Send message
            e.preventDefault(); // Prevent newline
            sendMessage();
        }
    }
});

// Send message function (already works on button)
sendBtn.addEventListener("click", sendMessage);

function sendMessage() {
    const msg = input.value;
    if (msg.trim()) {
        addMessage(`You: ${msg}`);
        socket.emit("message", msg);
        input.value = "";
    }
}

function addMessage(msg) {
    const div = document.createElement("div");
    div.textContent = msg;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}
