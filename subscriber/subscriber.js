require("dotenv").config();
const { PubSub } = require("@google-cloud/pubsub");
const express = require("express");
const TopicManager = require("./topicManager");
const EventListener = require("./eventListener");
const ApiService = require("./apiService");
const Logger = require("./logger");
const Metrics = require("./metrics");

class EventSubscriber {
  constructor() {
    this.pubSubClient = new PubSub({
      projectId: process.env.GCLOUD_PROJECT,
      ...(process.env.NODE_ENV === "local" && {
        apiEndpoint: "pubsub-emulator:8085",
      }),
    });

    this.topicManager = new TopicManager(this.pubSubClient);

    this.eventListener = new EventListener(this.pubSubClient);

    this.apiService = new ApiService();

    this.logger = new Logger({ logName: "EventSubscriber" });

    this.metrics = new Metrics();
  }

  async initialize() {
    await this.topicManager.createTopicAndSubscription();
    await this.eventListener.listenForEvents();
    await this.metrics.createCustomMetric();

    // Express server setup
    const app = express();

    app.post("/check", (req, res) => {
      res.status(200).send("OK");
    });

    app.get("/aggregations", async (req, res) => {
      const { eventType, day, hourWindow } = req.query;
      const data = await this.apiService.getAggregateEvents(
        eventType,
        day,
        hourWindow
      );
      res.send(data);
    });

    app.get("/top-performing-events", async (req, res) => {
      const data = await eventSubscriber.apiService.getTopPerformingEvents();
      res.send(data);
    });

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      this.logger.info(`Subscriber service running on port ${PORT}`);
    });
  }
}

// Initialize the EventSubscriber class
const eventSubscriber = new EventSubscriber();
eventSubscriber.initialize();
