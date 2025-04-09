const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const app = express();
const server = http.createServer(app);

// 🔥 IMPORTANT: Add your actual Netlify URL
const io = new Server(server, {
  cors: {
    origin: "https://anonymous-chat-cit.netlify.app",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static(path.join(__dirname, "../public")));

let waitingUser = null;

io.on("connection", (socket) => {
    match(socket);

    socket.on("message", (msg) => {
        if (socket.partner) {
            socket.partner.emit("message", msg);
        }
    });

    socket.on("next", () => {
        disconnectPartner(socket);
        match(socket);
    });

    socket.on("disconnect", () => {
        disconnectPartner(socket);
        if (waitingUser === socket) waitingUser = null;
    });
});

function match(socket) {
    if (waitingUser && waitingUser !== socket) {
        socket.partner = waitingUser;
        waitingUser.partner = socket;

        socket.emit("paired");
        waitingUser.emit("paired");

        waitingUser = null;
    } else {
        waitingUser = socket;
        socket.emit("waiting");
    }
}

function disconnectPartner(socket) {
    if (socket.partner) {
        socket.partner.emit("partner-left");
        socket.partner.partner = null;
        socket.partner = null;
    }
}

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
    const msg = input.value.trim();
    if (msg) {
        appendMessage("You", msg);
        socket.emit("message", msg);
        input.value = "";
    }
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
