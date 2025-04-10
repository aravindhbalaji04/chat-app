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
let localStream = null;
let peerConnection = null;
let isOfferer = false;

const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" } // Free STUN server
    ]
};

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

socket.on("paired", async ({ partnerId }) => {
    status.style.display = "none";
    chat.style.display = "block";
    messages.innerHTML = "";
    hideTypingIndicator();

    console.log("Paired with partner ID:", partnerId);

    // Only one of the pair initiates the offer to prevent conflict
    if (socket.id < partnerId) {
        await startAudio();  // only the lower ID user sends the offer
    }
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

socket.on("audio-offer", async (offer) => {
    isOfferer = false;

    if (!peerConnection) {
        await preparePeerConnection();
    }

    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("audio-answer", answer);
    } catch (err) {
        console.error("Error handling offer:", err);
    }
});

socket.on("audio-answer", async (answer) => {
    if (!peerConnection || peerConnection.signalingState !== "have-local-offer") {
        console.warn("Received answer but not in correct state:", peerConnection?.signalingState);
        return;
    }

    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
        console.error("Error setting remote description:", err);
    }
});

socket.on("ice-candidate", async (candidate) => {
    if (peerConnection) {
        try {
            await peerConnection.addIceCandidate(candidate);
        } catch (e) {
            console.error("Error adding received ice candidate", e);
        }
    }
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
    if (msg.startsWith("You:")) {
        div.className = "user-msg";
        div.textContent = msg.replace("You:", "").trim();
    } else if (msg.startsWith("Stranger:")) {
        div.className = "stranger-msg";
        div.textContent = msg.replace("Stranger:", "").trim();
    } else {
        div.style.textAlign = "center";
        div.style.color = "#aaa";
        div.textContent = msg;
    }
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

async function preparePeerConnection() {
    peerConnection = new RTCPeerConnection(config);

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("ice-candidate", event.candidate);
        }
    };

    peerConnection.ontrack = (event) => {
        let audioEl = document.getElementById("remoteAudio");
        if (!audioEl) {
            audioEl = document.createElement("audio");
            audioEl.id = "remoteAudio";
            audioEl.autoplay = true;
            document.body.appendChild(audioEl);
        }
        audioEl.srcObject = event.streams[0];
    };
}

async function startAudio() {
    try {
        if (!localStream) {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        if (!peerConnection) {
            await preparePeerConnection();
        }

        if (isOfferer) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit("audio-offer", offer);
        }
    } catch (err) {
        console.error("Audio error:", err);
        alert("Could not access microphone.");
    }
}
