/*
 * SPDX-FileCopyrightText: Copyright (c) 2023 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// peer connection
var pc = null;

// Check if all three environment variables for the TURN server are set
const turnServerUrl = process.env.TURN_SERVER_URL;
const turnServerUsername = process.env.TURN_SERVER_USERNAME;
const turnServerPassword = process.env.TURN_SERVER_PASSWORD;

if (turnServerUrl && turnServerUsername && turnServerPassword) {
  // If all three environment variables are set, add the TURN server to the ICE server configuration
  iceServers.push({
    urls: `turn:${turnServerUrl}`,
    username: turnServerUsername,
    credential: turnServerPassword,
  });
}

function sendToServer(msg) {
    var msgJSON = JSON.stringify(msg);
  
    log("Sending '" + msg.type + "' message: " + msgJSON);
    fetch('/iceSignaling', msgJSON)
}

function handleICECandidates(event) {
    if (event.candidate !== null) {
        sendToServer({
            type: "new-ice-candidate",
            target: targetUsername,
            candidate: event.candidate,
          });
    } 
}

function createPeerConnection() {
    var iceServers = [
        {
          urls: 'turn:10.0.0.127:3478',
          username: 'admin',
          credential: 'admin',
        },
        {
            urls: 'stun:stun.l.google.com:19302',
        },
      ]
    
    var config = {
        sdpSemantics: 'unified-plan',
        iceServers: iceServers,
    };

    // config.iceServers = [{urls: ['stun:stun.l.google.com:19302']}];
    // config.iceServers = [{urls: ['stun:stun.l.google.com:19302']}, {urls:['turn:10.0.0.127:3478'], username: 'admin', credential: 'admin'}];

    pc = new RTCPeerConnection(config);

    // connect audio / video
    pc.addEventListener('track', function(evt) {
        if (evt.track.kind == 'video')
            document.getElementById('video').srcObject = evt.streams[0];
    });

    pc.addEventListener('icecandidate', this.handleICECandidates);

    return pc;
}

function negotiate() {
    return pc.createOffer().then(function(offer) {
        console.log("MZ: set local description")
        return pc.setLocalDescription(offer);
    }).then(function() {
        // wait for ICE gathering to complete
        return new Promise(function(resolve) {
            if (pc.iceGatheringState === 'complete') {
                console.log("MZ: ICE Complete");
                resolve();
            } else {
                console.log("MZ: ICE Checkstate");
                function checkState() {
                    if (pc.iceGatheringState === 'complete') {
                        pc.removeEventListener('icegatheringstatechange', checkState);
                        console.log("MZ: ICE Checkstate complete");
                        resolve();
                    } else {
                        console.log("MZ: ICE Checkstate not complete, state is");
                        console.log(pc.iceGatheringState);
                    }
                }
                pc.addEventListener('icegatheringstatechange', checkState);
                pc.addEventListener("icecandidateerror", (event) => {
                    console.log("MZ icecandidateerror");
                    console.log(event.errorCode);
                    console.log(event.url);
                    console.log(event.errorText);
                  });
            }
        });
    }).then(function() {
        var offer = pc.localDescription;
        console.log("MZ: POST method");

        return fetch('/offer', {
            body: JSON.stringify({
                sdp: offer.sdp,
                type: offer.type
            }),
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST'
        });
    }).then(function(response) {
        return response.json();
    }).then(function(answer) {
        return pc.setRemoteDescription(answer);
    }).catch(function(e) {
        alert(e);
    });
}

function start() {
    document.getElementById('start').style.display = 'none';

    pc = createPeerConnection();

    pc.addTransceiver('video', {direction: 'recvonly'});

    negotiate();

    document.getElementById('stop').style.display = 'inline-block';
}

function stop() {
    document.getElementById('stop').style.display = 'none';

    // close transceivers
    if (pc.getTransceivers) {
        pc.getTransceivers().forEach(function(transceiver) {
            if (transceiver.stop) {
                transceiver.stop();
            }
        });
    }

    // close peer connection
    setTimeout(function() {
        pc.close();
    }, 500);

    document.getElementById('start').style.display = 'inline-block';
}
