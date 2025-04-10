// audio.js

const toggleAudioBtn = document.getElementById("toggle-audio");
let localStream;
let peerConnection;
let audioEnabled = false;

const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};

const constraints = { audio: true, video: false };

// Event: User clicks mic button
toggleAudioBtn.addEventListener("click", async () => {
    if (!audioEnabled) {
        await startAudio();
    } else {
        stopAudio();
    }
});

async function startAudio() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        peerConnection = new RTCPeerConnection(config);

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = (event) => {
            const remoteAudio = new Audio();
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.autoplay = true;
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", event.candidate);
            }
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("audio-offer", offer);

        audioEnabled = true;
        toggleAudioBtn.textContent = "🔇 Stop Audio";

    } catch (err) {
        console.error("Error accessing mic:", err);
        alert("Microphone access is required for audio chat.");
    }
}

function stopAudio() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    audioEnabled = false;
    toggleAudioBtn.textContent = "🎙️ Start Audio";
}

// Handle receiving an audio offer
socket.on("audio-offer", async (offer) => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        peerConnection = new RTCPeerConnection(config);

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = (event) => {
            const remoteAudio = new Audio();
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.autoplay = true;
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", event.candidate);
            }
        };

        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("audio-answer", answer);

        audioEnabled = true;
        toggleAudioBtn.textContent = "🔇 Stop Audio";
    } catch (err) {
        console.error("Error receiving audio offer:", err);
    }
});

// Handle receiving audio answer
socket.on("audio-answer", async (answer) => {
    if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
    }
});

// Handle receiving ICE candidates
socket.on("ice-candidate", async (candidate) => {
    if (peerConnection) {
        try {
            await peerConnection.addIceCandidate(candidate);
        } catch (e) {
            console.error("Error adding ICE candidate:", e);
        }
    }
});
