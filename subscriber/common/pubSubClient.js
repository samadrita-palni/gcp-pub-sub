const { PubSub } = require("@google-cloud/pubsub");
const Logger = require("../logger");

const logger = new Logger({ logName: "PubSubClient" });

const pubSubClient = new PubSub({
  projectId: process.env.GCLOUD_PROJECT,
  ...(process.env.NODE_ENV === "local" && {
    apiEndpoint: "pubsub-emulator:8085",
  }),
});

module.exports = pubSubClient;
