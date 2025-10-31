//////////////////////////////////////////////////////////////////////////////////
// [ main ]
//////////////////////////////////////////////////////////////////////////////////
//
// relay ver:0.1
//
// [::Last modi: 31.10.25 L.ey (µ~)::]
//
//
const port = process.env.PORT || 3000;

const express   = require('express');
const fs        = require('fs');
const http      = require('http');
const jwt       = require('jsonwebtoken');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const {Server}  = require('socket.io');

const app = express();

app.use(cors());
app.use(helmet());

////////////////////////////////////////////////////

const limiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   max: 100, // max 100 Requests in 15 min. Test
});

app.use(limiter);

////////////////////////////////////////////////////

app.get('/health', (req, res) => {
   res.status(200).send('OK');
});

////////////////////////////////////////////////////

const server = http.createServer(app);

const io = new Server(server, {
      cors: {
      origin: "https://kaosamt.de",
      methods: ["GET", "POST"]
   }
});

////////////////////////////////////////////////////
// check token
io.use((socket, next) => {

   const token = socket.handshake.auth?.token;

   if(!token){
      return(next(new Error('No Token')));
   }

   try {

      const publicKey = fs.readFileSync('./jwt_node.public.key', 'utf8'); // TEST

      jwt.verify(token, publicKey, {algorithms: ['RS256']});

      next(); // valid

   }catch(err){
      next(new Error('invalid Token'));
   }
});

////////////////////////////////////////////////////

io.on('connection', (socket) => {

   const username = socket.handshake.auth.user;
   socket.data.username = username;

   socket.data.token = socket.handshake.auth?.token;

   /////////////////////////////////////////////////
   socket.on('disconnect', () => {

   });

   /////////////////////////////////////////////////
   socket.on('joinRoom', async (data, callback) => {

      if(typeof callback !== 'function')
         return;

      try{
         joinRoom(socket, data);
         callback({status:"200", message:"joinRoom"});
      }catch(err){
         callback({status:"500", message: data + " join Room: " + err});
      }
   });

   /////////////////////////////////////////////////
   socket.on('sendMessageToRoom', async (data, callback) => {

      if(typeof callback !== 'function')
         return;

      try{
         sendMessageToRoom(socket, data);
         callback({status:"200", message:"sendMessageToRoom"});
      }catch(err){
         callback({status:"500", message: data + " sendMessageToRoom: " + err});
      }
   });

   /////////////////////////////////////////////////
   socket.on('leaveRoom', async (data, callback) => {

      if(typeof callback !== 'function')
         return;

      try{
         leaveRoom(socket, data);
         callback({status:"200", message:"leaveRoom"});
      }catch(err){
         callback({status:"500", message: data + " leaveRoom: " + err});
      }
   });

   /////////////////////////////////////////////////
   socket.on('sendCryptogram', async (data, callback) => {

      if(typeof callback !== 'function')
         return;

      try{
         sendCryptogram(socket, data);
         callback({status:"200", message:"sendCryptogram"});
      }catch(err){
         callback({status:"500", message: data + " sendCryptogram: " + err});
      }
   });

   /////////////////////////////////////////////////
   socket.on('sendCryptoKey', async (data, callback) => {

      if(typeof callback !== 'function')
         return;
      try{
         sendCryptoKey(socket, data);
         callback({status:"200", message:"sendCryptoKey"});
      }catch(err){
         callback({status:"500", message: data + " sendCryptoKey: " + err});
      }
   });

   /////////////////////////////////////////////////
   socket.on('pingRoom', async (data, callback) => {

      if(typeof callback !== 'function')
         return;

      try{
         pingRoom(socket, data);
         callback({status:"200", message:"pingRoom"});
      }catch(err){
         callback({status:"500", message: data + " pingRoom: " + err});
      }
   });

   /////////////////////////////////////////////////
   socket.on('exportFile', async (data, callback) => {

      if(typeof callback !== 'function')
         return;
      try{
         exportFile(socket, data);
         callback({status:"200", message:"exportFile"});
      }catch(err){
         callback({status:"500", message: data + " exportFile: " + err});
      }
   });

   /////////////////////////////////////////////////
   socket.on('importFile', async (data, callback) => {

      if(typeof callback !== 'function')
         return;

      try{
         importFile(socket, data);
         callback({status:"200", message:"importFile"});
      }catch(err){
         callback({status:"500", message: data + " importFile: " + err});
      }
   });

   /////////////////////////////////////////////////
   socket.on('file-chunk', async (data, callback) => {

      if(typeof callback !== 'function')
         return;

      try{
         io.to(data.socket).emit('file-chunk', data);
         callback({status:"200", message:"importFile"});
      }catch(err){
         callback({status:"500", message: data + " importFile: " + err});
      }
   });

   /////////////////////////////////////////////////
   socket.on('file-end', async (data, callback) => {

      if(typeof callback !== 'function')
         return;

      try{
         io.to(data.socket).emit('file-end', data);
         callback({status:"200", message:"importFile"});
      }catch(err){
         callback({status:"500", message: data + " importFile: " + err});
      }
   });
});

/////////////////////////////////////////////////
server.listen(port, () => {
   console.log(`🚀 Server running on Port ${port}`);
});

////////////////////////////////////////////////
// [ joinRoom ]
////////////////////////////////////////////////
function joinRoom(socket, data){

   socket.join(data.room);

   io.to(data.room).emit('joinRoom', {
      room : data.room,
      user : {
         name   : data.name,
         socket : socket.id,
      }
   });
}

////////////////////////////////////////////////
// [ leaveRoom ]
////////////////////////////////////////////////
function leaveRoom(socket, data){

   socket.leave(data.room);

   io.to(data.room).emit('leaveRoom', {
      room : data.room,
      user : {
         name   : data.name,
         socket : socket.id,
      }
   });
}

////////////////////////////////////////////////
// [ sendMessageToRoom ]
////////////////////////////////////////////////
function sendMessageToRoom(socket, data){
   io.to(data.room).emit('roomMessage', data);
}

////////////////////////////////////////////////
// [ sendCryptogram ]
////////////////////////////////////////////////
function sendCryptogram(socket, data){
   io.to(data.socket).emit('Cryptogram', data);
}

////////////////////////////////////////////////
// [ sendCryptoKey ]
////////////////////////////////////////////////
function sendCryptoKey(socket, data){
   io.to(data.socket).emit('CryptoKey', data);
}

////////////////////////////////////////////////
// [ pingRoom ]
////////////////////////////////////////////////
function pingRoom(socket, data){

   io.in(data).fetchSockets().then((sockets) => {

      const socketInfos = [];

      sockets.forEach((socket) => {

         socketInfos.push({
            name   : socket.data.username,
            socket : socket.id
         });
      });

      io.to(socket.id).emit('roomPing', {room : data, user: socketInfos});

   });
}

////////////////////////////////////////////////
// [ exportFile ]
////////////////////////////////////////////////
function exportFile(socket, data){
   io.to(data.socket).emit('exportFile', data);
}
////////////////////////////////////////////////
// [ importFile ]
////////////////////////////////////////////////
function importFile(socket, data){
   io.to(data.cGram.socket).emit('importFile', data);
}