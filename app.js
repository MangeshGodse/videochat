const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let remoteStream = new MediaStream(); // Initialize an empty MediaStream for remote video
let peerConnection;

const servers = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302' // Public STUN server
        }
    ]
};

// Get user media (webcam)
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = stream;

        // Create peer connection after local stream is obtained
        peerConnection = new RTCPeerConnection(servers);

        // Add local stream tracks to the peer connection
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        // Handle remote stream
        peerConnection.ontrack = event => {
            console.log('Remote track received:', event.track);
            remoteStream.addTrack(event.track); // Add remote tracks to the remote stream
        };

        // Assign remote stream to the remote video element
        remoteVideo.srcObject = remoteStream;

        // ICE candidates
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                signalingServer.send(JSON.stringify({ 'candidate': event.candidate }));
            }
        };

        // Now enable the start call button
        document.getElementById('startCall').disabled = false;
    })
    .catch(error => {
        console.error('Error accessing media devices.', error);
    });

// Signaling server events (WebSocket or other signaling mechanism)
const signalingServer = new WebSocket('ws://mangesh32godse.replit.app/');

signalingServer.onmessage = async (message) => {
    let data;

    // Check if the message is a Blob and handle it accordingly
    if (message.data instanceof Blob) {
        // Option 1: Read it as text if it should be JSON
        data = await message.data.text();
        
        try {
            data = JSON.parse(data); // Parse the text as JSON
        } catch (error) {
            console.error('Failed to parse message as JSON:', error);
            return; // Exit if the message is not valid JSON
        }
    } else {
        // Assume it's a text message and parse it directly
        try {
            data = JSON.parse(message.data);
        } catch (error) {
            console.error('Failed to parse message as JSON:', error);
            return; // Exit if the message is not valid JSON
        }
    }

    // Proceed with your logic after successfully parsing the JSON
    if (data.offer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        signalingServer.send(JSON.stringify({ 'answer': answer }));
    } else if (data.answer) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
};

// Create an offer to initiate the connection
async function createOffer() {
    if (!peerConnection) {
        console.error('Peer connection is not initialized.');
        return;
    }
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    signalingServer.send(JSON.stringify({ 'offer': offer }));
}

// Disable the button until peerConnection is ready
document.getElementById('startCall').disabled = true;

// Trigger the createOffer() function when the button is clicked
document.getElementById('startCall').addEventListener('click', () => {
    createOffer();
});
