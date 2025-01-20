require("dotenv").config();
const { PubSub } = require("@google-cloud/pubsub");
const admin = require('firebase-admin');
const express = require('express');

const topicName = process.env.TOPIC_NAME;
const subscriptionName = process.env.SUBSCRIPTION_NAME;

const pubSubClient = new PubSub({
  projectId: process.env.GCLOUD_PROJECT,
  ...(process.env.NODE_ENV === "local" && {
    apiEndpoint: "pubsub-emulator:8085",
  }),
});

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

admin.firestore().settings({
  ...(process.env.NODE_ENV === "local"  && {host: 'firebase-emulator:8080'}),
  ssl: process.env.NODE_ENV === "local"?false:true, // Emulator does not require SSL
});

const firestoreDb = admin.firestore();

async function handleEventMessage(message) {
  const event = JSON.parse(message.data.toString());
  console.log(`Received event: ${JSON.stringify(event)}`);

    // Save event to Firestore
    try {
      const eventRef = firestoreDb.collection("events").doc(event.eventId);
      await eventRef.set(event);
      console.log(`Event ${event.eventId} saved to Firestore.`);
    } catch (error) {
      console.error("Error saving event to Firestore:", error);
    }

  message.ack();
}

async function listenForEvents() {
  const subscription = pubSubClient.subscription(subscriptionName);

  subscription.on("message", handleEventMessage);
  subscription.on("error", (err) => {
    console.error("Error receiving message:", err);
  });

  console.log(`Listening for events on subscription: ${subscriptionName}`);
}

async function createTopicAndSubscription() {
  try {
    // Create the topic
    // Check if the topic already exists. If not, create it.
    const [existingTopic] = await pubSubClient.topic(topicName).exists();
    if (!existingTopic) {
      // Create the topic
      const [topic] = await pubSubClient.createTopic(topicName);
      console.log(`Topic ${topic.name} created.`);
    } else {
      console.log(`Topic ${topicName} already exists.`);
    }

    // Create the subscription
    const [existingSubscription] = await pubSubClient
      .topic(topicName)
      .subscription(subscriptionName)
      .exists();
    if (!existingSubscription) {
      const [subscription] = await pubSubClient
        .topic(topicName)
        .subscription(subscriptionName)
        .create();
      console.log(`Subscription ${subscription.name} created.`);
    } else {
      console.log(`Subscription ${subscriptionName} already exists.`);
    }
  } catch (error) {
    console.error(`Error creating topic or subscription:`, error);
  }
}

(async () => {
  await createTopicAndSubscription();
  await listenForEvents();
})();

const app = express();

app.post('/check', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Subscriber service running on port ${PORT}`);
});
