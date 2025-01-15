const { PubSub } = require('@google-cloud/pubsub');
const express = require('express');
const bodyParser = require('body-parser');

const pubSubClient = new PubSub({
  projectId: process.env.GCLOUD_PROJECT,
  ...(process.env.NODE_ENV === "local" && {
    apiEndpoint: "pubsub-emulator:8085",
  }),
});

const topicName = process.env.TOPIC_NAME;

const app = express();
app.use(bodyParser.json());

async function publishEvent(event) {
  const messageBuffer = Buffer.from(JSON.stringify(event));

  try {
    await pubSubClient.topic(topicName).publish(messageBuffer);
    console.log(`Event published: ${event.eventId}`);
  } catch (err) {
    console.error('Error publishing event:', err);
  }
}

app.post('/publish-event', async (req, res) => {
  const event = req.body;

  if (!event.eventId || !event.eventType || !event.timestamp || !event.payload) {
    return res.status(400).send('Invalid event data');
  }

  try {
    await publishEvent(event);
    res.status(200).send('Event published successfully');
  } catch (err) {
    console.error('Error publishing event:', err);
    res.status(500).send('Error publishing event');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Publisher service running on port ${PORT}`);
});
