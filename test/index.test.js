var service = require('../src/service')
var client = require('../src')

var io, caller, responder, channelsCount, log, evlog, msg

var params = {
    roomName: 'chatRoom',
    signallingServer: 'http://localhost:3000',
    rtcOpts: {iceServers: [{urls: 'stun:stun.l.google.com:19301'}]},
    debugMode: false
};

var responder_message = 'Hello caller! I am responder.'
var caller_message = 'Hello responder! I am caller.'

// sequence of channel ready is not guaranted (so use variables)
var responder_see_channel = false
var caller_see_channel = false

function launching() {
  io = service()
  caller = client(params)
  responder = client(params)
  evlog = []
  channelsCount = 0
}

function shutdown() {
  responder.close()
  caller.close()
  io.close()
}

function log(event) {
  evlog.push(event)
}

function communication(done) {

  log('begin communication')

  responder.on('ready', function () {
    responder.on('channel:ready', function () {
      responder_see_channel = true
    });
    responder.on('message', function (data) {
      log('responder received: ' + data.text)
      log('responder send: ' + responder_message)
      responder.sendMessage(responder_message);
    });
  });

  caller.on('ready', function () {
    caller.on('channel:ready', function () {
      caller_see_channel = true
      log('caller send: ' + caller_message)
      caller.sendMessage(caller_message);
    });
    caller.on('message', function (data) {
      log('caller received: ' + data.text)
      log('end communication')
      done()
    });
  });

}


beforeAll(() =>{
  launching()
})

afterAll(() => {
  shutdown()
})


test('client may be created without options', () => {
  var caller = client()
  caller.close()
})

test('client is debuggable', () => {
  var caller = client({debugMode:true})
  caller.close()
})

test('perform bidirectional communications', done => {
  communication(done)
})

test('begin communication', () => {
  expect(evlog[0]).toBe(
    'begin communication'
  )
})

test('responder receive event channel:ready', () => {
  expect(responder_see_channel).toBe(true)
})

test('caller receive event channel:ready', () => {
  expect(caller_see_channel).toBe(true)
})

test('caller send: ' + caller_message, () => {
  expect(evlog[1]).toBe(
    'caller send: ' + caller_message
  )
})

test('responder received: ' + caller_message, () => {
  expect(evlog[2]).toBe(
    'responder received: ' + caller_message
  )
})

test('responder send: ' + responder_message, () => {
  expect(evlog[3]).toBe(
    'responder send: ' + responder_message
  )
})

test('caller received: ' + responder_message, () => {
  expect(evlog[4]).toBe(
    'caller received: ' + responder_message
  )
})

test('end communication', () => {
  expect(evlog[5]).toBe(
    'end communication'
  )
})
