require("dotenv").config();
const { PubSub } = require("@google-cloud/pubsub");
const Metrics = require("./metrics");
const Logger = require("./logger");

class PublishEventService {
  constructor() {
    this.pubSubClient = new PubSub({
      projectId: process.env.GCLOUD_PROJECT,
      ...(process.env.NODE_ENV === "local" && {
        apiEndpoint: "pubsub-emulator:8085",
      }),
    });

    this.topicName = process.env.TOPIC_NAME;

    this.metrics = new Metrics();
    this.logger = new Logger({ logName: "PublishEventService" });
  }

  async publishEvent(event) {
    const publishTimestamp = Date.now();
    event.publishTimestamp = publishTimestamp;

    const messageBuffer = Buffer.from(JSON.stringify(event));

    try {
      await this.pubSubClient.topic(this.topicName).publish(messageBuffer);

      this.logger.info({
        message: "Event published",
        eventId: event.eventId,
        publishTimestamp,
      });

      await this.metrics.emitCustomMetricEvent(event.eventType);
    } catch (err) {
      this.logger.error({
        message: "Error publishing event",
        error: err,
        eventId: event.eventId,
      });
    }
  }
}

module.exports = PublishEventService;
