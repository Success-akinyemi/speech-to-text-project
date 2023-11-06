import './App.css';
import { Component } from 'react';
import io from 'socket.io-client';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      transcript: '',
      recording: false,
      pause: false,
    };

    this.socket = io('http://localhost:9000'); 
    this.mediaRecorder = null;
  }

  eventListeners = {
    addTranscript: (message) => {
      this.setState((prevState) => ({ transcript: prevState.transcript + message.metadata.transcript + ' ' }));
    },
    endOfTranscript: () => {
      this.setState((prevState) => ({ transcript: prevState.transcript + '\n' }));
    },
  };

  startRecording = () => {
    this.setState({ recording: true, pause: false });
    this.socket.emit('start-recording');
    this.setupMediaRecorder();
  };

  pauseRecording = () => {
    if (this.mediaRecorder) {
      this.mediaRecorder.pause();
    }
    this.setState({ pause: true });
  };

  continueRecording = () => {
    if (this.mediaRecorder) {
      this.mediaRecorder.resume();
    }
    this.setState({ pause: false });
  };

  stopRecording = () => {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    this.socket.emit('stop-recording');
    this.setState({ recording: false, pause: false });
  };

  setupMediaRecorder = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm',
      audioBitsPerSecond: 16000,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.socket.emit('audio-data', event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      if (this.state.recording) {
        this.socket.emit('stop-recording');
      }
    };

    this.mediaRecorder.start(500);
  };

  componentDidMount() {
    this.socket.on('transcription-started', () => {
      console.log('Transcription started');
    });

    this.socket.on('transcription-update', (transcription) => {
      this.setState((prevState) => ({
        transcript: prevState.transcript + transcription + ' ',
      }));
    });
  }

  componentWillUnmount() {
    this.socket.off('transcription-started');
    this.socket.off('transcription-update');
  }

  render() {
    return (
      <div className='App'>
        <div>
          {this.state.recording ? (
            <div>
              {this.state.pause ? (
                <button onClick={this.continueRecording}>Continue Recording</button>
              ) : (
                <button onClick={this.pauseRecording}>Pause Recording</button>
              )}
              <button onClick={this.stopRecording}>Stop Recording</button>
            </div>
          ) : (
            <button onClick={this.startRecording}>Start Recording</button>
          )}
        </div>

        <textarea
          cols='50'
          rows='10'
          value={this.state.transcript}
          readOnly
          placeholder='Transcription Output...'
          style={{ color: 'black' }}
        ></textarea>
      </div>
    );
  }
}

export default App;
