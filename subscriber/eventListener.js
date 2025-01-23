const EventAggregator = require("./eventAggregator");
const Logger = require("./logger");
const Metrics = require("./metrics");
const pubSubClient = require("./common/pubSubClient");

class EventListener {
  constructor() {
    this.pubSubClient = pubSubClient;
    this.subscriptionName = process.env.SUBSCRIPTION_NAME;
    this.eventAggregator = new EventAggregator();
    this.metrics = new Metrics();
    this.logger = new Logger({ logName: "EventListener" });
  }

  async handleEventMessage(message) {
    const event = JSON.parse(message.data.toString());
    const processTimestamp = Date.now();
    const latency = processTimestamp - event.publishTimestamp;
    this.logger.info({
      message: "event received",
      event,
      eventId: event.eventId,
      latency,
    });
    await this.eventAggregator.aggregateEvents([event]);
    message.ack();
    this.metrics.emitCustomMetricEvent(event.eventType);
  }

  listenForEvents() {
    const subscription = this.pubSubClient.subscription(this.subscriptionName);

    subscription.on("message", (message) => this.handleEventMessage(message));
    subscription.on("error", (err) => {
      this.logger.error({ message: "Error receiving message:", err });
    });

    this.logger.info(
      `Listening for events on subscription: ${this.subscriptionName}`
    );
  }
}

module.exports = EventListener;
