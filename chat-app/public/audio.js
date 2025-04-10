(() => {
  let localStream;
  let peerConnection;
  const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  };

const socket = io("https://chat-app-eeiv.onrender.com"); // ✅ Replace with your actual backend URL

  // JOINED call
  socket.on("call-user", async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    peerConnection = new RTCPeerConnection(config);

    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.onicecandidate = e => {
      if (e.candidate) {
        socket.emit("ice-candidate", e.candidate);
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
    console.log("Audio offer sent");
  });

  socket.on("offer", async (offer) => {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    peerConnection = new RTCPeerConnection(config);

    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
      const remoteAudio = new Audio();
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.play();
    };

    peerConnection.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", e.candidate);
      }
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
    console.log("Audio answer sent");
  });

  socket.on("answer", async (answer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log("Answer set. Adding buffered candidates...");
    for (const candidate of remoteCandidatesBuffer) {
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding buffered candidate", err);
      }
    }
    remoteCandidatesBuffer = [];
  });

  let remoteCandidatesBuffer = [];
  socket.on("ice-candidate", async (candidate) => {
    if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding received ice candidate", err);
      }
    } else {
      remoteCandidatesBuffer.push(candidate);
    }
  });
})();
