require("dotenv").config();
const { PubSub } = require('@google-cloud/pubsub');
const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');
const { LoggingWinston } = require('@google-cloud/logging-winston');
const logging = require('@google-cloud/logging');
const  monitoring  = require('@google-cloud/monitoring');

const pubSubClient = new PubSub({
  projectId: process.env.GCLOUD_PROJECT,
  ...(process.env.NODE_ENV === "local" && {
    apiEndpoint: "pubsub-emulator:8085",
  }),
});

const topicName = process.env.TOPIC_NAME;
const monitoringClient = new monitoring.MetricServiceClient();

const transports = [
  // Log to the console
  new winston.transports.Console({ format: winston.format.simple() }),
];

// If running on GCP, add Google Cloud Logging transport
if (process.env.NODE_ENV !== "local") {
  const logClient = new logging.Logging(); // Google Cloud Logging client
  const googleCloudLoggingTransport = new LoggingWinston({
    logName: 'evnts', // Customize the log name (optional)
  });
  
  transports.push(googleCloudLoggingTransport); // Add the Google Cloud Logging transport
}

// Create the Winston logger
const logger = winston.createLogger({
  level: 'info', // Set your desired logging level
  format: winston.format.json(),
  transports: transports,
});

let eventCounter = 0; // Track the event count

const app = express();
app.use(bodyParser.json());

// Function to create the custom metric for event count
async function createCustomMetric() {
  if (process.env.NODE_ENV === "local") return;

  const projectId = process.env.GCLOUD_PROJECT;
  const metricType = 'custom.googleapis.com/event_ingested_count';

  const metricDescriptor = {
    name: `projects/${projectId}/metricDescriptors/${metricType}`,
    type: metricType,
    labels: [{ key: 'eventType', valueType: 'STRING', description: 'Type of event' }],
    metricKind: 'CUMULATIVE',
    valueType: 'INT64',
    unit: '1',
    description: 'Number of events ingested by the publisher.',
  };

  try {
    const [descriptor] = await monitoringClient.createMetricDescriptor({
      name: `projects/${projectId}`,
      metricDescriptor: metricDescriptor,
    });
    console.log(`Custom metric descriptor created: ${descriptor.name}`);
  } catch (err) {
    console.error('Error creating custom metric:', err);
  }
}


async function publishEvent(event) {
  const publishTimestamp = Date.now();
  event.timestamp=publishTimestamp;

  const messageBuffer = Buffer.from(JSON.stringify(event));

  try {
    await pubSubClient.topic(topicName).publish(messageBuffer);
    eventCounter++;

    logger.info({
      message: 'Event published',
      eventId: event.eventId,
      eventCount: eventCounter,
      publishTimestamp,
    });

    if (process.env.NODE_ENV !== "local") {
     // Emit custom metric for event ingestion
     const metricType = 'custom.googleapis.com/event_ingested_count';
     const timeSeries = {
       metric: {
         type: metricType,
         labels: { eventType: event.eventType },
       },
       resource: {
         type: 'global',
       },
       points: [{
         interval: {
          start: { seconds: Math.floor(Date.now() / 1000) },
          end: { seconds: Math.floor(Date.now() / 1000) + 60 },
         },
         value: {
           int64Value: 1,
         },
       }],
     };
 
     await monitoringClient.createTimeSeries({
       name: `projects/${process.env.GCLOUD_PROJECT}`,
       timeSeries: [timeSeries],
     });
    }

    console.log(`Event published: ${event.eventId}`);
  } catch (err) {
    console.error('Error publishing event:', err);

    // Log the error

    logger.error({
      message: 'Error publishing event',
      error: err.message,
      eventId: event.eventId,
    });
  }
}

app.post('/publish-event', async (req, res) => {
  const event = req.body;

  if (!event.eventId || !event.eventType || !event.payload) {
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
app.listen(PORT, async () => {
  console.log(`Publisher service running on port ${PORT}`);

  // Create custom metric for event ingestion
  await createCustomMetric();
});
