const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const schedule = require('node-schedule');
const cors = require('cors')
const dotenv = require('dotenv');
dotenv.config();
const app = express();
app.use(cors())
const port = 9000;

// Connect to your MongoDB database
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const apiKeysSchema = new mongoose.Schema({
  key: String,
},
{timestamps: true},
);

const ApiKey = mongoose.model('speechToTextJwtToken', apiKeysSchema);

// Schedule a job to run every 50 minutes
const job = schedule.scheduleJob('*/2 * * * *', async () => {
  try {
    // Send a POST request to speechmatics to get a key
    const response = await axios.post(
      'https://mp.speechmatics.com/v1/api_keys?type=rt',
      { ttl: 3600 },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_KEY}`,
        },
      }
    );

    // Save the key in your database
    const apiKey = new ApiKey({ key: response.data.key_value });
    console.log('TOKEN', apiKey);
    await apiKey.save();
    console.log('New API key saved:', response.data.key_value);
  } catch (error) {
    console.error('Error getting and saving API key:', error);
  }
});

// Create an API endpoint to get the latest API key
app.get('/api/get-api-key', async (req, res) => {
  try {
    console.log('RECIEVED FRONT API CALL')
    // Find the latest API key in the database
    const latestKey = await ApiKey.findOne().sort({ _id: -1 });
    if (!latestKey) {
      res.status(404).send('API key not found');
      return;
    }
    console.log('KEY SENT TO CLIENT', latestKey.key);
    res.json({ apiKey: latestKey.key });
  } catch (error) {
    res.status(500).send('Error getting the API key');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('CONNECTED TO DB');
});
