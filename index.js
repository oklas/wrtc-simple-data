var wrtc = require('wrtc')
    , socketio_client = require('socket.io-client')
    , freeice = require('freeice');

module.exports = function (opts) {
    if (!opts) opts = {};
    var options = {
        signallingServer: opts.signallingServer || 'http://localhost:3000/',
        roomName: opts.roomName || 'defaultRoom',
        rtcOpts: opts.rtcOpts || {iceServers: freeice()},
        channelName: opts.channelName || 'messages',
        channelOpts: opts.channelOpts || {reliable: false},
        debugMode: opts.debugMode || false
    };

    var debug = options.debugMode ? function (msg) {
        return console.log('[DEBUG] ' + msg);
    } : function () {
    };

    var socket = socketio_client(options.signallingServer);

    var myId
        , pcMap = {}
        , dataChannels = []
        , room = options.roomName
        , _callbacks = {};

    socket.on('connect', function () {
        socket.emit('join', room);
        debug('Sent request to join room ' + room);

        socket.on('created', function (id) {
            debug('Created new room ' + room);
        });

        socket.on('joined', function (data) {
            myId = data.id;
            for (var i = 0; i < data.peers.length; i++) {
                if (data.peers[i] != myId) createConnection(data.peers[i], false);
            }
            debug('Successfully joined room ' + room);
            if (_callbacks['ready']) _callbacks['ready']();
        });

        socket.on('new peer', function (id) {
            debug('New peer has joined the room');
            var pc = createConnection(id, true);
            callPeer(pc);
        });

        socket.on('data', function (data) {
            switch (data.type) {
                case 'offer':
                    debug('Got an offer from ' + data.from);
                    onOffer(data, pcMap[data.from]);
                    break;
                case 'answer':
                    debug('Got an answer from ' + data.from);
                    onAnswer(data, pcMap[data.from]);
                    break;
                case 'candidate':
                    debug('Got a candidate: ' + data.id);
                    onCandidate(data.candidate, pcMap[data.id]);
                    break;
            }
        });
    });

    function createConnection(id, create) {
        var pc = new wrtc.RTCPeerConnection(options.rtcOps);
        pc.id = id;
        debug('Created peer connection ' + id);

        if (create) createDataChannel(pc);
        else pc.ondatachannel = function (event) {
            onDataChannel(event, pc);
        };

        pc.onicecandidate = function (event) {
            handleIceCandidate(event, pc);
        };

        pcMap[id] = pc;
        return pc;
    }

    function createDataChannel(peerconnection) {
        var dataChannel = peerconnection.createDataChannel(options.channelName, options.channelOpts);
        dataChannel.remotePeer = peerconnection;
        dataChannels.push(dataChannel);
        setDataChannelCallbacks(dataChannel);
        debug('Created data channel with peer ' + peerconnection.id);
    }

    function callPeer(pc) {
        pc.createOffer(function (description) {
            description.from = myId;
            description.to = pc.id;
            setLocalDescription(description, pc);
        }, console.log);
        debug('Created offer for peer ' + pc.id);
    }

    function onOffer(description, pc) {
        pc.setRemoteDescription(new wrtc.RTCSessionDescription(description));
        debug('Set remote description for peer ' + pc.id);
        pc.createAnswer(function (description) {
            description.from = myId;
            description.to = pc.id;
            setLocalDescription(description, pc);
        }, console.log);
    }

    function onAnswer(description, pc) {
        pc.setRemoteDescription(new wrtc.RTCSessionDescription(description));
        debug('Set remote description for peer ' + description.from);
    }

    function setLocalDescription(description, pc) {
        pc.setLocalDescription(description);
        socket.emit('data', description);
        debug('Set local description for ' + pc.id + ' and sent offer / answer.');
    }

    function handleIceCandidate(event, pc) {
        if (pc.candidateSent || !event.candidate) return;
        var candidate = event.candidate;
        socket.emit('data', {type: 'candidate', candidate: candidate, id: myId});
        debug('Broadcasted candidate: ' + pc.id);
        pc.candidateSent = true;
    }

    function onCandidate(candidate, pc) {
        if (!candidate) return;
        pc.addIceCandidate(new wrtc.RTCIceCandidate({
            sdpMLineIndex: candidate.sdpMLineIndex,
            sdpMid: candidate.sdpMid,
            candidate: candidate.candidate
        }));
        debug('Added received candidate ' + pc.id);
    }

    function setDataChannelCallbacks(dataChannel) {
        dataChannel.onopen = function () {
            handleDataChannelState(dataChannel);
        };
        dataChannel.onclose = function () {
            handleDataChannelState(dataChannel);
        };
        dataChannel.onmessage = function (event) {
            onMessage(event, dataChannel);
        };
        debug('Set the data channel callback.');
    }

    function handleDataChannelState(dataChannel) {
        var state = dataChannel.readyState;
        debug('Channel is ' + state);
        if (_callbacks['channel:ready'] && state == 'open') _callbacks['channel:ready']();
        else if (_callbacks['channel:notready'] && state != 'open') _callbacks['channel:notready']();
    }

    function onDataChannel(event, pc) {
        dataChannel = event.channel;
        dataChannel.remotePeer = pc;
        dataChannels.push(dataChannel);
        setDataChannelCallbacks(dataChannel)
    }

    function onMessage(event, dc) {
        debug('[Message] ' + event.data);
        if (_callbacks['message']) _callbacks['message']({text: event.data, sender: dc.remotePeer.id});
    }

    return {
        on: function (event, callback) {
            _callbacks[event] = callback;
        },
        sendMessage: function (message) {
            dataChannels.forEach(function (channel) {
                channel.send(message);
            });
            debug('Sent message');
        }
    }
};

