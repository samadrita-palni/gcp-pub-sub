require("dotenv").config();
const { PubSub } = require("@google-cloud/pubsub");

const pubSubClient = new PubSub({
  projectId: process.env.GCLOUD_PROJECT,
  ...(process.env.NODE_ENV === "local" && {
    apiEndpoint: "pubsub-emulator:8085",
  }),
});

const topicName = process.env.TOPIC_NAME;
const subscriptionName = process.env.SUBSCRIPTION_NAME;

async function handleEventMessage(message) {
  const event = JSON.parse(message.data.toString());
  console.log(`Received event: ${JSON.stringify(event)}`);
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
