/**
 * SocketPeer2Peer
 * @param {Object} options
 * @param {Function} options.onSignal   - called with signal data to send via your signaling server
 * @param {Function} options.onMessage  - called when a data-channel message arrives
 * @param {Function} options.onOpen     - called when data channel is open
 * @param {Function} options.onClose    - called when connection closes
 * @param {Function} options.onError    - called on errors
 * @param {Object}   options.iceServers - override default STUN/TURN servers
 */
class SocketPeer2Peer {
    static RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    static RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
    static RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;

    static ICE_SERVERS = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ];

    static CHANNEL_LABEL = 'jeli-p2p';
    static RECONNECT_DELAY = 3000;
    static MAX_RECONNECT = 5;

    constructor(options) {
        options = options || {};

        this._onSignal = options.onSignal || function () { };
        this._onMessage = options.onMessage || function () { };
        this._onOpen = options.onOpen || function () { };
        this._onClose = options.onClose || function () { };
        this._onError = options.onError || function () { };
        this._iceServers = options.iceServers || SocketPeer2Peer.ICE_SERVERS;

        this._pc = null;
        this._channel = null;
        this._initiator = false;
        this._reconnects = 0;
        this._destroyed = false;
        this._pendingCandidates = [];
    }
    /**
     * Start the connection as the initiating peer (creates offer).
     */
    connect() {
        this._initiator = true;
        this._reconnects = 0;
        this._createConnection();
        this._createDataChannel();
        this._createOffer();
    }
    /**
     * Accept an incoming signal (offer, answer, or ICE candidate) from the remote peer.
     * @param {Object} signal
     */
    signal(signal) {

        if (this._destroyed) return;

        if (signal.type === 'offer') {
            if (!this._pc) {
                this._initiator = false;
                this._createConnection();
            }
            this._pc.setRemoteDescription(new SocketPeer2Peer.RTCSessionDescription(signal))
                .then(() => {
                    this._flushPendingCandidates();
                    return this._pc.createAnswer();
                })
                .then((answer) => {
                    return this._pc.setLocalDescription(answer);
                })
                .then(() => {
                    this._onSignal(this._pc.localDescription);
                })
                .catch((err) => {
                    this._onError(err);
                });

        } else if (signal.type === 'answer') {
            this._pc.setRemoteDescription(new SocketPeer2Peer.RTCSessionDescription(signal))
                .then(() => {
                    this._flushPendingCandidates();
                })
                .catch((err) => {
                    this._onError(err);
                });

        } else if (signal.candidate) {
            const candidate = new SocketPeer2Peer.RTCIceCandidate(signal);
            if (this._pc && this._pc.remoteDescription && this._pc.remoteDescription.type) {
                this._pc.addIceCandidate(candidate).catch((err) => {
                    this._onError(err);
                });
            } else {
                this._pendingCandidates.push(candidate);
            }
        }
    }
    /**
     * Send data to the remote peer.
     * @param {string|Object} data
     */
    send(data) {
        if (!this._channel || this._channel.readyState !== 'open') {
            this._onError(new Error('Data channel is not open'));
            return;
        }
        const payload = typeof data === 'object' ? JSON.stringify(data) : data;
        this._channel.send(payload);
    }
    /**
     * Tear down the connection permanently.
     */
    destroy() {
        this._destroyed = true;
        this._cleanup();
    }

    _createConnection() {
        this._pc = new SocketPeer2Peer.RTCPeerConnection({ iceServers: this._iceServers });

        this._pc.onicecandidate = (event) => {
            if (event.candidate) {
                this._onSignal(event.candidate);
            }
        };

        this._pc.oniceconnectionstatechange = () => {
            const state = this._pc && this._pc.iceConnectionState;
            if (state === 'disconnected' || state === 'failed') {
                this._handleDisconnect();
            } else if (state === 'closed') {
                this._onClose();
            }
        };

        this._pc.ondatachannel = (event) => {
            this._attachChannel(event.channel);
        };
    }
    _createDataChannel() {
        const channel = this._pc.createDataChannel(SocketPeer2Peer.CHANNEL_LABEL, {
            ordered: true
        });
        this._attachChannel(channel);
    }
    _attachChannel(channel) {
        this._channel = channel;

        channel.onopen = () => {
            this._reconnects = 0;
            this._onOpen();
        };

        channel.onmessage = (event) => {
            const data = event.data;
            try { data = JSON.parse(data); } catch (e) { /* raw string */ }
            this._onMessage(data);
        };

        channel.onclose = () => {
            this._handleDisconnect();
        };

        channel.onerror = (err) => {
            this._onError(err);
        };
    }
    _createOffer() {
        this._pc.createOffer()
            .then((offer) => {
                return this._pc.setLocalDescription(offer);
            })
            .then(() => {
                this._onSignal(this._pc.localDescription);
            })
            .catch((err) => {
                this._onError(err);
            });
    }
    _flushPendingCandidates() {
        this._pendingCandidates.forEach((candidate) => {
            this._pc.addIceCandidate(candidate).catch((err) => {
                this._onError(err);
            });
        });
        this._pendingCandidates = [];
    }
    _handleDisconnect() {
        if (this._destroyed) return;

        this._cleanup();

        if (this._initiator && this._reconnects < SocketPeer2Peer.MAX_RECONNECT) {
            this._reconnects++;
            setTimeout(() => {
                if (!this._destroyed) {
                    this._createConnection();
                    this._createDataChannel();
                    this._createOffer();
                }
            }, SocketPeer2Peer.RECONNECT_DELAY);
        } else {
            this._onClose();
        }
    }
    _cleanup() {
        if (this._channel) {
            this._channel.onopen = null;
            this._channel.onmessage = null;
            this._channel.onclose = null;
            this._channel.onerror = null;
            try { this._channel.close(); } catch (e) { /* ignore */ }
            this._channel = null;
        }
        if (this._pc) {
            this._pc.onicecandidate = null;
            this._pc.oniceconnectionstatechange = null;
            this._pc.ondatachannel = null;
            try { this._pc.close(); } catch (e) { /* ignore */ }
            this._pc = null;
        }
        this._pendingCandidates = [];
    }
}
