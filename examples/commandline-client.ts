import Connection from './../src'
import readline from 'readline'

const dc = new Connection({
    roomName: 'chatRoom',
    signallingServer: 'http://45.32.186.169:3000',
    rtcOpts: {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]},
    debugMode: true
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

dc.on('ready', function ()  {
    dc.on('channel:ready', function () {
        console.log('Yeah we got a new data channel with a new peer.');
    });

    dc.on('message', function (data) {
        console.log(data.sender + ': ' + data.text);
    });

    rl.on('line', function (cmd) {
        dc.sendMessage(cmd);
    });
});
