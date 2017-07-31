declare module 'freeice' {
  const v: any
  export default v
}

declare module 'socket.io-client' {
  export type socket = {
    on: (event: string, cb: () => void) => void
  }
  const v: any
  export default v
}

interface SocketIoClient {
  on: (event: string, cb: (...args: any[]) => void) => void
  emit: (event: string, data: any) => void
  close: () => void
}

interface RTCDataChannel {
  channel: any
  data: any
}

interface DataChannel {
  remotePeer: PeerConnection
  readyState: string
  onopen: () => void
  onclose: () => void
  onmessage: (event: RTCDataChannel) => void
  send: (message: string) => void
}

interface PeerDescription {
  from: number
  to: number
}

interface PeerConnection {
  id: number
  candidateSent: boolean
  setRemoteDescription: (
    rtcsd: RTCSessionDescription,
    success: () => void,
    failure: (error) => void,
  ) => void
  setLocalDescription: (
    description: PeerDescription,
    success: () => void,
    failure: (error) => void,
  ) => void
  addIceCandidate: (candidate: RTCIceCandidate) => void
  createDataChannel: (name: string, opts: Object) => DataChannel
  createOffer: (
    cb: (description: PeerDescription) => void,
    log: (...args: any[]) => void
  ) => void
  createAnswer: (
    cb: (description: PeerDescription) => void,
    log: (...args: any[]) => void
  ) => void
}

declare module 'SocketIoClient' {
  export type socket = {
    on: (event: string, cb: () => void) => void
  }
  export default socket
}

declare module 'wrtc' {
  const v: any
  export default v
}
