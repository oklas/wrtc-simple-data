var http = require('http')
    , socketio = require('socket.io');


module.exports = function () {
  let port = process.env.PORT || 3000;
  var server = http.createServer().listen(port);
  var io = socketio.listen(server);
  console.log("listening on "+port);

  io.sockets.on('connection', function (socket) {
    socket.on('join', function (roomName) {
      console.log("received: join "+roomName);
      if (!io.sockets.adapter.rooms[roomName]) {
        socket.emit('created', socket.id);
        console.log("created "+socket.id);
      }
      io.sockets.in(roomName).emit('new peer', socket.id);
      socket.join(roomName);
      socket.emit('joined', {id: socket.id, peers: getSocketIdsInRoom(roomName)});

      socket.on('data', function (data) {
        for (var clientId in io.sockets.adapter.rooms[roomName].sockets) {
          var s = io.sockets.connected[clientId];
          if ((data.type == 'offer' && data.to != s.id) || (data.type == 'answer' && data.to != s.id) || (data.type == 'candidate' && socket.id == s.id)) continue;
          s.emit('data', data);
        }
      })
    });
  });

  function getSocketIdsInRoom(roomName) {
    var sockets = io.sockets.adapter.rooms[roomName].sockets;
    var ids = [];
    for (var id in sockets) {
      ids.push(io.sockets.connected[id].id);
    }
    return ids;
  }
  
  return io
}
