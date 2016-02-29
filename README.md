# wrtc-simple-data
A simple Node.js library to communicate between **multiple peers** via WebRTC data channels.

[![NPM](https://nodei.co/npm/wrtc-simple-data.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/wrtc-simple-data/)

## What is this?
This is a library which helps you with WebRTC communication between Node apps. You might have multiple apps that want to exchange data (e.g. logging, sensor data, ...) using a peer-to-peer connection. To do so you can use this lib to get set up p2p data channels between them with very low effort.
Special is the multi-peer support. Usually a data channel exists between exactly two peers. If you want to have communication over more than just two peers but still without a central server (which probably is the reason why you even chose WebRTC instead of e.g. Websockets) you will need to build up a mesh. This basically means that each node hold a connection to (and a data channel with) every other node.

## Signalling
Although the data communication is peer-to-peer with WebRTC you still need to have a central signalling server, which basically coordinates the connection establishment between the clients. You can (and really should) use https://github.com/n1try/wrtc-simple-data-signalling in combination with this project. All you need is this server to be running on an address and port of your choice. 

## Installation
1. `npm install wrtc-simple-data`
2. `var dc = require('wrtc-simple-data')(opts)`

or

1. `git clone https://github.com/n1try/wrtc-simple-data`
2. `npm install`
3. `var dc = require('wrtc-simple-data')(opts)`

And don't forget to install and start the signalling server...

### Troubleshooting
This project depends on https://www.npmjs.com/package/wrtc. Please make sure to fulfil all of its prequesites (https://github.com/js-platform/node-webrtc#prerequisites) first, otherwise there will be compilation errors.

## Usage example
```javascript
var dc = require('wrtc-simple-data')({
    roomName: 'chatRoom'
});

dc.on('ready', function () {
    dc.on('channel:ready', function () {
        console.log('Data channel is ready.');
    });

    dc.on('message', function (data) {
        console.log(data.sender + ': ' + data.text);
    });

    dc.sendMessage('First message on this channel');
});
```
Also check out https://github.com/n1try/wrtc-simple-data/tree/master/examples.

## API reference
### Functions
* `.on('event', callback)`
* `.sendMessage(messageText)`

### Events
* `ready => callback()` - Fired when connection establishment with the signalling server was successful and client is waiting for peers
* `channel:ready => callback()` - Fired when a data channel with a newly connected peer has successfully been opened
* `channel:notready => callback()` - Fired when a data channel isn't in open state anymore
* `message => callback(data)` - Fired when receiving a message 
  * `data: {sender: 'senderPeerId:string', text: 'messageText:string'}`

### Options
* `signallingServer` (default: 'http://localhost:3000/'): URL of the wrtc-simple-data-signalling server
* `roomName` (default: 'defaultRoom'): Socket.io room name where new peers connect to on the signalling server
* `rtcOpts` (default: `{iceServers: freeice()}`): Options to pass to the `RTCPeerConnection` object
* `channelName` (default: 'messages'): Name of every created data channel - currently doesn't mean anything 
* `channelOpts` (default: `{reliable: false}`): Options to pass to the `RTCPeerConnection.createDataChannel()` method
* `debugMode` (default: false): Turn on/off debug console logs
