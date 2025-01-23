const Logger = require("./logger");
const pubSubClient = require("./common/pubSubClient");

class TopicManager {
  constructor() {
    this.pubSubClient = pubSubClient;
    this.topicName = process.env.TOPIC_NAME;
    this.subscriptionName = process.env.SUBSCRIPTION_NAME;
    this.logger = new Logger({ logName: "TopicManager" });
  }

  async createTopicIfNeeded() {
    try {
      // Check if the topic exists
      const [existingTopic] = await this.pubSubClient
        .topic(this.topicName)
        .exists();
      if (!existingTopic) {
        // Create the topic if it doesn't exist
        const [topic] = await this.pubSubClient.createTopic(this.topicName);
        this.logger.info(`Topic ${topic.name} created.`);
      } else {
        this.logger.info(`Topic ${this.topicName} already exists.`);
      }
    } catch (error) {
      this.logger.error({ message: `Error checking or creating topic`, error });
    }
  }

  async createSubscriptionIfNeeded() {
    try {
      // Check if the subscription exists
      const [existingSubscription] = await this.pubSubClient
        .topic(this.topicName)
        .subscription(this.subscriptionName)
        .exists();
      if (!existingSubscription) {
        // Create the subscription if it doesn't exist
        const [subscription] = await this.pubSubClient
          .topic(this.topicName)
          .subscription(this.subscriptionName)
          .create();
        this.logger.info(`Subscription ${subscription.name} created.`);
      } else {
        this.logger.info(
          `Subscription ${this.subscriptionName} already exists.`
        );
      }
    } catch (error) {
      this.logger.error({
        message: `Error checking or creating subscription`,
        error,
      });
    }
  }

  async createTopicAndSubscription() {
    await this.createTopicIfNeeded();
    await this.createSubscriptionIfNeeded();
  }
}

module.exports = TopicManager;
