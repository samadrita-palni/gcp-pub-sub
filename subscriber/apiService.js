require("dotenv").config();
const moment = require("moment");
const FirebaseUtils = require("./firebaseUtils");
const redisClient = require("./common/redisClient");
const Logger = require("./logger");

class ApiService {
  constructor() {
    this.firebaseUtils = new FirebaseUtils();
    this.redisClient = redisClient;
    this.logger = new Logger({ logName: "ApiService" });
  }

  async getAggregateEvents(eventType, day, hourWindow) {
    await this.sinkOldData();

    let key = day || moment().format("YYYY-MM-DD");
    let eventCollection = process.env.DAILY_EVENTS_COLLECTION;

    if (hourWindow) {
      key = key + "T" + hourWindow;
      eventCollection = process.env.HOURLY_EVENTS_COLLECTION;
    }

    const record = await this.firebaseUtils.getEvents(key, eventCollection);

    if (!record || !record[eventType]) {
      return {};
    } else {
      return record[eventType];
    }
  }

  async getTopPerformingEvents() {
    // Get the current timestamp and the timestamp for 24 hours ago
    await this.sinkOldData();

    const currentTimestamp = new Date();
    const past24HoursTimestamp = new Date(
      currentTimestamp.getTime() - 24 * 60 * 60 * 1000
    ); // 24 hours ago

    const hourlyEventsArr = await this.firebaseUtils.getDataByTimestampFilter(
      past24HoursTimestamp,
      process.env.HOURLY_EVENTS_COLLECTION
    );

    const eventCounts = hourlyEventsArr.reduce((acc, curr) => {
      const hourlyEvent = curr.events;
      for (const [key, value] of Object.entries(hourlyEvent)) {
        if (acc[key]) {
          acc[key] += value.count;
        } else {
          acc[key] = value.count;
        }
      }

      return acc;
    }, {});

    const sortedEventCounts = Object.entries(eventCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([eventType, count]) => ({ eventType, count }));

    return sortedEventCounts;
  }

  async sinkOldData() {
    const existingHourlyBucketName = await this.redisClient.get(
      "current_hourly_bucket"
    );
    const existingDailyBucketName = await this.redisClient.get(
      "current_daily_bucket"
    );

    const currentHourlyBucketName = moment().format("YYYY-MM-DDTHH");
    const currentDailyBucketName = moment().format("YYYY-MM-DD");

    if (
      existingHourlyBucketName &&
      existingHourlyBucketName !== currentHourlyBucketName
    ) {
      const exixtingHourlyBucketData = await this.redisClient.get(
        existingHourlyBucketName
      );

      await this.firebaseUtils.storeToFirebase({
        key: existingHourlyBucketName,
        data: JSON.parse(exixtingHourlyBucketData),
        eventCollection: process.env.HOURLY_EVENTS_COLLECTION,
      });

      await this.redisClient.del(existingHourlyBucketName);
      await this.redisClient.del("current_hourly_bucket");
    }

    if (
      existingDailyBucketName &&
      existingDailyBucketName !== currentDailyBucketName
    ) {
      const exixtingDailyyBucketData = await this.redisClient.get(
        existingDailyBucketName
      );

      await this.firebaseUtils.storeToFirebase({
        key: existingDailyBucketName,
        data: JSON.parse(exixtingDailyyBucketData),
        eventCollection: process.env.DAILY_EVENTS_COLLECTION,
      });

      await this.redisClient.del(existingDailyBucketName);
      await this.redisClient.del("current_daily_bucket");
    }
  }
}

module.exports = ApiService;
