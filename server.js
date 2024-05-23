const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ dest: 'public/uploads/' });

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

let users = {}; // Store connected users

app.post('/upload', upload.single('pfp'), (req, res) => {
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

io.on('connection', (socket) => {
  console.log('a user connected');
  
  socket.on('user joined', (username) => {
    users[socket.id] = username;
    io.emit('user joined', username);
  });

  socket.on('chat message', (data) => {
    io.emit('chat message', data);
  });

  socket.on('disconnect', () => {
    const username = users[socket.id];
    if (username) {
      io.emit('user left', username);
      delete users[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
