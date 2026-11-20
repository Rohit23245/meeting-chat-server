const child_process = require('child_process');
const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const server = http.createServer();
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws, request, streamKey) => {
  console.log(`New RTMP WebSocket connection. Key: ${streamKey}`);

  // Instagram RTMP URL + Stream Key
  const rtmpUrl = `rtmps://live-upload.instagram.com:443/rtmp/${streamKey}`;

  // Spawn ffmpeg
  const ffmpeg = child_process.spawn('ffmpeg', [
    '-i', '-', // Input from stdin
    '-vcodec', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-acodec', 'aac',
    '-f', 'flv',
    rtmpUrl
  ]);

  ffmpeg.on('close', (code, signal) => {
    console.log(`FFmpeg child process closed, code ${code}, signal ${signal}`);
    ws.close(1011, 'FFmpeg process died');
  });

  ffmpeg.stdin.on('error', (e) => {
    console.log('FFmpeg STDIN Error', e);
  });

  ffmpeg.stderr.on('data', (data) => {
    console.log('FFmpeg STDERR:', data.toString());
  });

  ws.on('message', (msg) => {
    // Write binary video chunks directly to ffmpeg
    if (Buffer.isBuffer(msg)) {
      ffmpeg.stdin.write(msg);
    }
  });

  ws.on('close', (e) => {
    console.log('WebSocket connection closed.');
    // Kill ffmpeg when frontend disconnects
    ffmpeg.kill('SIGINT');
  });
});

server.on('upgrade', (request, socket, head) => {
  const parsedUrl = url.parse(request.url, true);
  
  if (parsedUrl.pathname === '/rtmp') {
    const streamKey = parsedUrl.query.key;
    if (!streamKey) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }
    
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, streamKey);
    });
  } else {
    socket.destroy();
  }
});

const PORT = 5001;
server.listen(PORT, () => {
  console.log(`RTMP WebSocket Server listening on port ${PORT}`);
});
