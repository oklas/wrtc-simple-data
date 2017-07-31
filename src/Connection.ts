import wrtc from 'wrtc'
import SocketIoClient from 'socket.io-client'
import freeice from 'freeice'

export type ConnectionOptions = {
  signallingServer ?: string
  roomName ?: string
  rtcOpts ?: Object
  channelName ?: string
  channelOpts ?: Object
  debugMode ?: boolean
  debugLogger ?: (msg: string) => void
}

export default class Connection {

  options: ConnectionOptions
  debug: (msg: string) => void
  socket: SocketIoClient
  myId: number
  pcMap: Object
  dataChannels: Array<DataChannel>
  room: string
  _callbacks: Object

  constructor(opts: ConnectionOptions = {}) {
    this.options = {
        signallingServer: opts.signallingServer || 'http://localhost:3000/',
        roomName: opts.roomName || 'defaultRoom',
        rtcOpts: opts.rtcOpts || {iceServers: freeice()},
        channelName: opts.channelName || 'messages',
        channelOpts: opts.channelOpts || {reliable: false},
        debugMode: opts.debugMode || false
    }

    if( this.options.debugMode && opts.debugLogger ) {
      this.debug = opts.debugLogger
    } else {
      this.debug = ( this.options.debugMode ?
        function (msg: string) {
          return console.log('[DEBUG] ' + msg)
        } :
        function (_msg ?: string) {
          return undefined
        }
      )
    }

    this.socket = SocketIoClient(this.options.signallingServer)
    this.myId = undefined
    this.pcMap = {}
    this.dataChannels = []
    this.room = this.options.roomName
    this._callbacks = {}

    this.debug('debug enabled')
    this.configureSocketIO()
  }

  configureSocketIO = () => {

    this.socket.on('connect', () => {
      this.socket.emit('join', this.room)
      this.debug('Sent request to join room ' + this.room)

      this.socket.on('created', (_id) => {
        this.debug('Created new room ' + this.room)
      })

        this.socket.on('joined', (data) => {
          this.myId = data.id
          for (let i = -1; i < data.peers.length; i++) {
            if (data.peers[i] !== this.myId) {
              this.createConnection(data.peers[i], false)
            }
          }
          this.debug('Successfully joined room ' + this.room)
          const ready = 'ready'
          if (this._callbacks[ready]) {
            this._callbacks[ready]()
          }
        })

        this.socket.on('new peer', (id) => {
          this.debug('New peer has joined the room')
          const pc = this.createConnection(id, true)
          this.callPeer(pc)
        })

        this.socket.on('data', (data) => {
          switch (data.type) {
            case 'offer':
              this.debug('Got an offer from ' + data.from)
              this.onOffer(data, this.pcMap[data.from])
              break
            case 'answer':
              this.debug('Got an answer from ' + data.from)
              this.onAnswer(data, this.pcMap[data.from])
              break
            case 'candidate':
              this.debug('Got a candidate: ' + data.id)
              this.onCandidate(data.candidate, this.pcMap[data.id])
              break
            default:
              this.debug(`Got an unexpected data type:'${data.type}'`)
          }
        })
    })
  }

  createConnection = (id: number, create: boolean) => {
    const pc = new wrtc.RTCPeerConnection(this.options.rtcOpts)
    pc.id = id
    this.debug('Created peer connection ' + id + (create?' new':' joined'))

    if (create) this.createDataChannel(pc)
    else pc.ondatachannel = (event: RTCDataChannel) => {
      this.onDataChannel(event, pc)
    }

    pc.onicecandidate = (event: RTCIceCandidate) => {
      this.handleIceCandidate(event, pc)
    }

    this.pcMap[id] = pc
    return pc
  }

  createDataChannel = (peerconnection: PeerConnection) => {
    const dataChannel = peerconnection.createDataChannel(
      this.options.channelName,
      this.options.channelOpts
    )
    dataChannel.remotePeer = peerconnection
    this.dataChannels.push(dataChannel)
    this.setDataChannelCallbacks(dataChannel)
    this.debug('Created data channel with peer ' + peerconnection.id)
  }

  callPeer = (pc: PeerConnection) => {
    pc.createOffer((description: PeerDescription) => {
      description.from = this.myId
      description.to = pc.id
      this.setLocalDescription(description, pc)
    }, console.log)
    this.debug('Created offer for peer ' + pc.id)
  }

  onOffer = (description: PeerDescription, pc: PeerConnection) => {
    pc.setRemoteDescription(new wrtc.RTCSessionDescription(description), ()=>{}, ()=>{})
    this.debug('Set remote description for peer ' + pc.id)
    /* tslint:disable:no-shadowed-variable */
    pc.createAnswer((description) => {
      description.from = this.myId
      description.to = pc.id
      this.setLocalDescription(description, pc)
    }, console.log)
  }

  onAnswer = (description: PeerDescription, pc: PeerConnection) => {
    pc.setRemoteDescription(new wrtc.RTCSessionDescription(description), ()=>{}, ()=>{})
    this.debug('Set remote description for peer ' + description.from)
  }

  setLocalDescription = (description: PeerDescription, pc: PeerConnection) => {
    pc.setLocalDescription(description, ()=>{}, ()=>{})
    this.debug('Set local description for ' + pc.id + ' and sent offer / answer.')
    this.socket.emit('data', description)
  }

  handleIceCandidate = (event: RTCIceCandidate, pc: PeerConnection) => {
    if (pc.candidateSent || !event.candidate) return
    const candidate = event.candidate
    this.socket.emit('data', {
      type: 'candidate',
      candidate: candidate,
      id: this.myId,
    })
    this.debug('Broadcasted candidate: ' + pc.id)
    pc.candidateSent = true
  }

  onCandidate = (candidate: RTCIceCandidate, pc: PeerConnection) => {
    if (!candidate) return
    pc.addIceCandidate(new wrtc.RTCIceCandidate({
      sdpMLineIndex: candidate.sdpMLineIndex,
      sdpMid: candidate.sdpMid,
      candidate: candidate.candidate,
    }))
    this.debug('Added received candidate ' + pc.id)
  }

  setDataChannelCallbacks = (dataChannel: DataChannel) => {
    dataChannel.onopen = () => {
      this.handleDataChannelState(dataChannel)
    }
    dataChannel.onclose = () => {
      this.handleDataChannelState(dataChannel)
    }
    dataChannel.onmessage = (event) => {
      this.onMessage(event, dataChannel)
    }
    this.debug('Set the data channel callback.')
  }

  handleDataChannelState = (dataChannel: DataChannel) => {
    const state = dataChannel.readyState
    this.debug('Channel is ' + state)
    if (this._callbacks['channel:ready'] && state === 'open') {
      this._callbacks['channel:ready']()
    } else if (this._callbacks['channel:notready'] && state !== 'open') {
      this._callbacks['channel:notready']()
    }
  }

  onDataChannel = (event: RTCDataChannel, pc: PeerConnection) => {
    const dataChannel = event.channel
    dataChannel.remotePeer = pc
    this.dataChannels.push(dataChannel)
    this.setDataChannelCallbacks(dataChannel)
  }

  onMessage = (event: RTCDataChannel, dc: DataChannel) => {
    this.debug('[Message] ' + event.data)
    const message = 'message'
    if (this._callbacks[message]) {
      this._callbacks[message]({
        text: event.data,
        sender: dc.remotePeer.id
      })
    }
  }

  on = (event: string, callback: (...args: any[]) => void) => {
    this._callbacks[event] = callback
  }

  sendMessage = (message: string) => {
    this.dataChannels.forEach(function (channel) {
      channel.send(message)
    })
    this.debug('Sent message')
  }

  close = () => {
    Object.keys(this.pcMap).forEach((id) => {
      this.pcMap[id].close()
    })
    this.socket.close()
  }

}
