const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");

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

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
