import React, { Component } from 'react';
import { RealtimeSession } from 'speechmatics';
import axios from 'axios';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      transcript: '',
      recording: false,
      pause: false,
      editMode: false,
      apiKey: null, // Store the API key
    };

    this.realtimeSession = null;
    this.mediaRecorder = null;
  }

  eventListeners = {
    addTranscript: (message) => {
      this.setState((prevState) => ({
        transcript: prevState.transcript + message.metadata.transcript + ' ',
      }));
    },
    endOfTranscript: () => {
      this.setState((prevState) => ({
        transcript: prevState.transcript + '\n',
      }));
    },
  };

  startRecording = () => {
    this.setState({ recording: true, pause: false, editMode: false, transcript: '' });

    // Start RealtimeSession with the API key from the state
    this.realtimeSession.start({
      message: 'StartRecognition',
      apiKey: this.state.apiKey, // Pass the API key here
      transcription_config: {
        language: 'en',
        operating_point: 'enhanced',
        enable_partials: true,
        output_locale: 'en-US',
        diarization: 'speaker',
        max_delay: 2,
      },
    }).then((data) => {
      console.log('DATA', data);
      this.setupMediaRecorder();
    }).catch((error) => {
      console.error('ERROR STARTING THE SESSION:', error);
    });
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
    this.realtimeSession.stop();
    this.setState({ recording: false, pause: false, editMode: true });
  };

  saveToDatabase = () => {
    const transcribeData = this.state.transcript;
    console.log('YOUR TRANSCRIBED DATA', transcribeData);
  };

  setupMediaRecorder = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm',
      audioBitsPerSecond: 16000,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.realtimeSession.sendAudio(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      if (this.state.recording) {
        this.realtimeSession.start();
      }
    };
    this.mediaRecorder.start(500);
  };

  // Function to get the latest API key from your backend
  getLatestApiKey = async () => {
    try {
      const response = await axios.get('http://localhost:9000/api/get-api-key'); // Replace with your API route
      this.setState({ apiKey: response?.data.apiKey }, () => {
        // Initialize RealtimeSession with the obtained API key
        this.realtimeSession = new RealtimeSession({ apiKey: this.state.apiKey });
        this.realtimeSession.addListener('AddTranscript', this.eventListeners.addTranscript);
        this.realtimeSession.addListener('EndOfTranscript', this.eventListeners.endOfTranscript);
      });
      console.log('TOKEN', response?.data.apiKey);
    } catch (error) {
      console.error('Error getting the latest API key:', error);
    }
  };

  componentDidMount() {
    // Get the latest API key when the component mounts
    this.getLatestApiKey();
  }

  componentWillUnmount() {
    if (this.realtimeSession) {
      this.realtimeSession.removeListener('AddTranscript', this.eventListeners.addTranscript);
      this.realtimeSession.removeListener('EndOfTranscript', this.eventListeners.endOfTranscript);
    }
  }

  render() {
    return (
      <div className="App">
        <div>
          {this.state.recording ? (
            <div>
              {this.state.pause ? (
                <button onClick={this.continueRecording}>
                  Continue Recording
                </button>
              ) : (
                <button onClick={this.pauseRecording}>Pause Recording</button>
              )}
              <button onClick={this.stopRecording}>Stop Recording</button>
            </div>
          ) : (
            <div>
              <button onClick={this.startRecording}>Start Recording</button>
              {this.state.transcript && (
                <button onClick={this.saveToDatabase}>Save to Database</button>
              )}
            </div>
          )}
        </div>

        <textarea
          cols="50"
          rows="10"
          value={this.state.transcript}
          readOnly={!this.state.recording && !this.state.editMode}
          placeholder="Transcription Output..."
          style={{ color: 'black' }}
        ></textarea>
      </div>
    );
  }
}

export default App;
