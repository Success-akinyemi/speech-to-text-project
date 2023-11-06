const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: 'http://localhost:5173', // Replace with the actual URL of your frontend
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
const Speechmatics = require('speechmatics');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.API_KEY;
const realtimeSession = new Speechmatics.RealtimeSession({ apiKey });

app.use(express.json());
app.use(cors());

io.on('connection', (socket) => {
  socket.on('start-recording', () => {
    realtimeSession
      .start({
        message: 'StartRecognition',
        transcription_config: {
          language: 'en',
          operating_point: 'enhanced',
          enable_partials: true,
          output_locale: 'en-US',
          diarization: 'speaker',
          max_delay: 2,
        },
      })
      .then(() => {
        socket.emit('transcription-started');
      })
      .catch((error) => {
        console.log('ERROR STARTING THE SESSION:', error);
      });
  });

  socket.on('audio-data', (data) => {
    try {
      realtimeSession.sendAudio(data);
    } catch (error) {
      console.log('Error sending audio:', error);
    }
  });

  socket.on('stop-recording', () => {
    realtimeSession.stop();
  });
});

http.listen(9000, () => {
  console.log('Backend listening on port 9000');
});
