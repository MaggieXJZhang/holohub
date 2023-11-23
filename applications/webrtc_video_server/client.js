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
const PEER_CONNECTION_OPTIONS = { optional: [{ DtlsSrtpKeyAgreement: true }] };
const OFFER_OPTIONS = { offerToReceiveAudio: true, offerToReceiveVideo: true };

var pc = null;

var iceServers = [{ urls: ['stun:stun.l.google.com:19302'] }]

async function getIceServers() {
    return fetch('/iceServers',
    ).then(function (response) {
        return response.json();
    }).catch(function (e) {
        alert(e);
    });
}



function onIceCandidateEvent(event) {
    if (!event.candidate) {
        //received null candidate indicating its the last candidate
        return;
    }
    if (event.candidate) {
        // If a srflx candidate was found, notify that the STUN server works!
        if (event.candidate.type === "srflx") {
            console.log("The STUN server is reachable at " + event.candidate.address);
        }
        // If a relay candidate was found, notify that the TURN server works!
        if (event.candidate.type === "relay") {
            console.log("The TURN server is reachable at " + event.candidate.address);
        }

        var msgJSON = JSON.stringify({
            type: "new-ice-candidate",
            peerid: pc.peerId,
            candidate: event.candidate.toJSON(),
        });

        console.log("Sending new-ice-candidate: " + msgJSON);

        fetch('/iceSignaling', {
            body: msgJSON,
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST'
        }).then(response => {
            console.log("ice signaling reponse status code is: " + response.status)
        }).catch(error => {
            // Handle errors
            console.error("ice signaling error: ", error);
        });
    }

}

function createPeerConnection() {

    // var iceServers = [
    //     {
    //         urls: 'turn:10.0.0.131:3478',
    //         username: 'admin',
    //         credential: 'admin',
    //     },
    //     {
    //         urls: 'stun:stun.l.google.com:19302',
    //     },
    // ]

    var config = {
        sdpSemantics: 'unified-plan',
        iceServers: iceServers,
    };

    pc = new RTCPeerConnection(config, PEER_CONNECTION_OPTIONS);
    // create a peerId to be used in webrtc server side
    pc.peerId = Math.random().toString();

    // connect audio / video
    pc.addEventListener('track', function (evt) {
        if (evt.track.kind == 'video')
            document.getElementById('video').srcObject = evt.streams[0];
    });

    pc.onicecandidate = onIceCandidateEvent

    return pc;
}

function negotiate() {
    return pc.createOffer(OFFER_OPTIONS).then(function (offer) {
        console.log("OFFER!")
        console.log(offer)
        return pc.setLocalDescription(offer);
    }).then(function () {
        var offer = pc.localDescription;

        return fetch('/offer', {
            body: JSON.stringify({
                peerid: pc.peerId,
                sdp: offer.sdp,
                type: offer.type
            }),
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST'
        });
    }).then(function (response) {
        return response.json();
    }).then(function (answer) {
        console.log("ANSWER")
        console.log(answer)
        return pc.setRemoteDescription(answer);
    }).then(function () {
        // wait for ICE gathering to complete
        return new Promise(function (resolve) {
            if (pc.iceGatheringState === 'complete') {
                console.log("Ice gathering complete")
                resolve();
            } else {
                function checkState() {
                    if (pc.iceGatheringState === 'complete') {
                        console.log("Ice gathering complete")
                        pc.removeEventListener('icegatheringstatechange', checkState);
                        resolve();
                    }
                }
                pc.addEventListener('icegatheringstatechange', checkState);
            }
        });
    }).catch(function (e) {
        alert(e);
    });

}

async function start() {
    document.getElementById('start').style.display = 'none';

    var newIceServers = await getIceServers();
    console.log("Received following ice servers from webserver: " + JSON.stringify(newIceServers));
    iceServers = iceServers.concat(newIceServers)

    pc = createPeerConnection();

    pc.addTransceiver('video', { direction: 'recvonly' });

    negotiate();

    document.getElementById('stop').style.display = 'inline-block';
}

function stop() {
    document.getElementById('stop').style.display = 'none';

    // close transceivers
    if (pc.getTransceivers) {
        pc.getTransceivers().forEach(function (transceiver) {
            if (transceiver.stop) {
                transceiver.stop();
            }
        });
    }

    // close peer connection
    setTimeout(function () {
        pc.close();
    }, 500);

    document.getElementById('start').style.display = 'inline-block';
}
