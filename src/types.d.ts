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
  type: string
  from: number
  to: number
  rtcsd: RTCSessionDescription
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
    rtcsd: RTCSessionDescription,
    success: () => void,
    failure: (error) => void,
  ) => void
  addIceCandidate: (candidate: RTCIceCandidate) => void
  createDataChannel: (name: string, opts: Object) => DataChannel
  createOffer: (
    cb: (rtcsd: RTCSessionDescription) => void,
    failcb: (...args: any[]) => void
  ) => void
  createAnswer: (
    cb: (rtcsd: RTCSessionDescription) => void,
    failcb: (...args: any[]) => void
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
