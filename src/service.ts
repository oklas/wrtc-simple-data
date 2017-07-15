import http from 'http'
import socketio from 'socket.io'

export default function createService() {
  const port = process.env.PORT || 3000
  const server = http.createServer().listen(port)
  const io = socketio.listen(server)
  console.log('listening on ' + port)

  io.sockets.on('connection', function (socket) {
    socket.on('join', function (roomName) {
      console.log('received: join ' + roomName)
      if (!io.sockets.adapter.rooms[roomName]) {
        socket.emit('created', socket.id)
        console.log('created ' + socket.id)
      }
      io.sockets.in(roomName).emit('new peer', socket.id)
      socket.join(roomName)
      socket.emit('joined', {id: socket.id, peers: getSocketIdsInRoom(roomName)})

      socket.on('data', function (data) {
        const sockets = io.sockets.adapter.rooms[roomName].sockets
        Object.keys(sockets).forEach(clientId => {
          const s = io.sockets.connected[clientId]
          if (
            (data.type === 'offer' && data.to !== s.id) ||
            (data.type === 'answer' && data.to !== s.id) ||
            (data.type === 'candidate' && socket.id === s.id)
          ) return
          s.emit('data', data)
        })
      })
    })
  })

  function getSocketIdsInRoom(roomName) {
    const sockets = io.sockets.adapter.rooms[roomName].sockets
    const ids = []
    Object.keys(sockets).forEach((id) => {
      ids.push(io.sockets.connected[id].id)
    })
    return ids
  }

  return io
}
