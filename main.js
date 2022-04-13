const deleteFirestoreDocument = () => {
    firestore.collection('calls').doc(meetID).delete().then(() => {
        console.log("Document successfully deleted!");
    }).catch((error) => {
        console.error("Error removing document: ", error);
    });
}

const uuidv = () => {
    return Math.floor(Math.random() * (9999 - 0000) + 0000);
    //return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}

//const firestore = firebase.firestore();
let meetID = uuidv().toString();
console.log(meetID);

var isMeetIDRegistered = false;

const firebaseConfig = {
    apiKey: "AIzaSyAifx8SR1LQEFO_JludEMPxqWpuNwqqc08",
    authDomain: "raju-jarvis-wfqala.firebaseapp.com",
    databaseURL: "https://raju-jarvis-wfqala.firebaseio.com",
    projectId: "raju-jarvis-wfqala",
    storageBucket: "raju-jarvis-wfqala.appspot.com",
    messagingSenderId: "867739477372",
    appId: "1:867739477372:web:977adbcb6fad893657b0f9"
};

var c = location.search.split('virajRTCID=')[1]
//check if the value is new
console.log(c);

const isNewEvent = c === "new" ? true : false
console.log(isNewEvent);

// Initialize Firebase
//const app = initializeApp(firebaseConfig);
firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();
  
const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};
  
// Global State
const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

// HTML elements
// const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
// const callButton = document.getElementById('callButton');
// const callInput = document.getElementById('callInput');
// const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');
const meeting_url = document.getElementById('video_call_link');

/*if (c === "new") {
    hangupButton.style.display = "none";
}*/

const joinCall = async () => {
    console.log("Joining Call with ID - " + c);
    //const callId = callInput.value;
    const callDoc = firestore.collection('calls').doc(c);
    const answerCandidates = callDoc.collection('answerCandidates');
    const offerCandidates = callDoc.collection('offerCandidates');
  
    pc.onicecandidate = (event) => {
        event.candidate && answerCandidates.add(event.candidate.toJSON());
    };
  
    const callData = (await callDoc.get()).data();
  
    const offerDescription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));
  
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);
  
    const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
    };
  
    await callDoc.update({ answer });
  
    offerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            console.log(change);
            if (change.type === 'added') {
                let data = change.doc.data();
                pc.addIceCandidate(new RTCIceCandidate(data));
            }
        });
    });

    hangupButton.disabled = false
};

const createEvent = async () => {
    console.log("Creating Event");
    // Reference Firestore collections for signaling
    if (isMeetIDRegistered) {
        deleteFirestoreDocument();
    }
    const callDoc = firestore.collection('calls').doc(meetID);
    isMeetIDRegistered = true;
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');
  
    // callInput.value = callDoc.id;
  
    // Get candidates for caller, save to db
    pc.onicecandidate = (event) => {
        event.candidate && offerCandidates.add(event.candidate.toJSON());
    };
  
    // Create offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);
  
    const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
    };
  
    await callDoc.set({ offer });
  
    // Listen for remote answer
    callDoc.onSnapshot((snapshot) => {
        const data = snapshot.data();
        if (!pc.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(answerDescription);
        }
    });
  
    // When answered, add candidate to peer connection
    answerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate);
            }
        });
    });
  
    hangupButton.disabled = false;

    meeting_url.textContent = "https://cople.app/VirajRTC/index.html?virajRTCID=" + meetID
    copyTextToClipboard("https://cople.app/VirajRTC/index.html?virajRTCID=" + meetID)
};
  
// 1. Setup media sources
//webcamButton.onclick = async () => 
const startup = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    remoteStream = new MediaStream();
  
    // Push tracks from local stream to peer connection
    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
    });
  
    // Pull tracks from remote stream, add to video stream
    pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        });
    };
  
    webcamVideo.srcObject = localStream;
    remoteVideo.srcObject = remoteStream;
  
    // callButton.disabled = false;
    // answerButton.disabled = false;
    // webcamButton.disabled = true;

    if (webcamVideo.srcObject != null) {
        isNewEvent ? createEvent() : joinCall();
    }
};

const goToStartUp = () => {
    window.open("https://cople.app/VirajRTC/index.html?virajRTCID=new","_self")
}

startup();

hangupButton.onclick = async () => {
    deleteFirestoreDocument();
    pc.close();
    console.log("Cancelled");
}

window.addEventListener("beforeunload", function(e) {
    deleteFirestoreDocument();
 }, false);

// copy to the clipboard
function copyTextToClipboard(text) {
    if (!navigator.clipboard) {
        console.log("Failed to copy to the clipboard")
        //show it as a popup
        return;
    }

    navigator.clipboard.writeText(text).then(function() {
        console.log('Async: Copying to clipboard was successful!');
    }, function(err) {
        console.error('Async: Could not copy text: ', err);
    });
}