require("dotenv").config();
const redis = require("ioredis");
const moment = require("moment");
const FirebaseUtils = require("./firebaseUtils");
const Logger = require("./logger");

class EventAggregator {
  constructor() {
    this.logger = new Logger({ logName: "EventAggregator" });

    this.redisClient = new redis({
      host: process.env.REDIS_HOST || "localhost", // 'redis' is the service name from Docker Compose
      port: process.env.REDIS_PORT || 6379,
      ...(process.env.NODE_ENV === "local" && { password: process.env.REDIS_PASSWORD }),
    });

    this.redisClient.on("error", (error) => {
      this.logger.error({ message: "Redis connection error", err: error });
    });

    this.redisClient.on("connect", () => {
      this.logger.info("Successfully connected to Redis");
    });

    this.redisClient.on("reconnecting", () => {
      this.logger.info("Attempting to reconnect to Redis");
    });

    this.redisClient.on("end", () => {
      this.logger.info("Got disconnected from Redis");
    });

    this.firebaseUtils = new FirebaseUtils();
  }

  async aggregateEvents(events) {
    const timestamp = moment();
    let hourlyAggregation;
    let dailyAggregation;

    const currentHourlyBucketName = await this.redisClient.get(
      "current_hourly_bucket"
    );
    const currentDailyBucketName = await this.redisClient.get(
      "current_daily_bucket"
    );

    const calculatedHourlyBucketName = timestamp.format("YYYY-MM-DDTHH");
    const calculatedDailyBucketName = timestamp.format("YYYY-MM-DD");

    if (
      currentHourlyBucketName &&
      currentHourlyBucketName !== calculatedHourlyBucketName
    ) {
      const previousHourlyBucketData = await this.redisClient.get(
        currentHourlyBucketName
      );
      await this.firebaseUtils.storeToFirebase({
        key: currentHourlyBucketName,
        data: JSON.parse(previousHourlyBucketData),
        eventCollection: process.env.HOURLY_EVENTS_COLLECTION,
      });
      await this.redisClient.del(currentHourlyBucketName);
      await this.redisClient.set(
        "current_hourly_bucket",
        calculatedHourlyBucketName
      );
      hourlyAggregation = {};
    } else {
      await this.redisClient.set(
        "current_hourly_bucket",
        calculatedHourlyBucketName
      );
      hourlyAggregation = JSON.parse(
        (await this.redisClient.get(calculatedHourlyBucketName)) ||
          JSON.stringify({})
      );
    }

    if (
      currentDailyBucketName &&
      currentDailyBucketName !== calculatedDailyBucketName
    ) {
      const previousDayBucketData = await this.redisClient.get(
        currentDailyBucketName
      );
      await this.firebaseUtils.storeToFirebase({
        key: currentDailyBucketName,
        data: JSON.parse(previousDayBucketData),
        eventCollection: process.env.DAILY_EVENTS_COLLECTION,
      });
      await this.redisClient.del(currentDailyBucketName);
      await this.redisClient.set(
        "current_daily_bucket",
        calculatedDailyBucketName
      );
      dailyAggregation = {};
    } else {
      await this.redisClient.set(
        "current_daily_bucket",
        calculatedDailyBucketName
      );
      dailyAggregation = JSON.parse(
        (await this.redisClient.get(calculatedDailyBucketName)) ||
          JSON.stringify({})
      );
    }

    for (let anEvent of events) {
      const { eventType, payload } = anEvent;

      const initialObject = {
        count: 0,
        ...(eventType === "APPOINTMENT_BOOKED" && { revenue: 0 }),
        ...(eventType === "EMAIL_OPENED" && {
          totalEmailTime: 0,
          emailReadCount: 0,
        }),
      };

      if (!hourlyAggregation[eventType]) {
        hourlyAggregation[eventType] = { ...initialObject };
      }

      if (!dailyAggregation[eventType]) {
        dailyAggregation[eventType] = { ...initialObject };
      }

      hourlyAggregation[eventType].count++;
      dailyAggregation[eventType].count++;

      // Count events and sum revenue for APPOINTMENT_BOOKED
      if (eventType === "APPOINTMENT_BOOKED") {
        hourlyAggregation[eventType].revenue += payload.revenue || 0;
        dailyAggregation[eventType].revenue += payload.revenue || 0;
      }

      // Track time difference for EMAIL_SENT and EMAIL_OPENED
      if (
        (eventType === "EMAIL_SENT" || eventType === "EMAIL_OPENED") &&
        payload.emailId &&
        payload.userId &&
        payload.timestamp
      ) {
        const { userId, emailId, timestamp } = payload;
        const hourlyKey =
          userId + "_" + emailId + "_" + calculatedHourlyBucketName;
        const dailyKey =
          userId + "_" + emailId + "_" + calculatedDailyBucketName;

        if (eventType === "EMAIL_SENT") {
          await this.redisClient.set(hourlyKey, timestamp, "EX", 3600);
          await this.redisClient.set(dailyKey, timestamp, "EX", 60 * 60 * 24);
        } else if (eventType === "EMAIL_OPENED") {
          const dailyEmailTime = await this.redisClient.get(dailyKey);
          const hourlyEmailTime = await this.redisClient.get(hourlyKey);

          if (hourlyEmailTime) {
            const start = new Date(hourlyEmailTime);
            const end = new Date(timestamp);
            const diffSecs = Math.floor((end - start) / 1000);
            hourlyAggregation[eventType].totalEmailTime += diffSecs;
            hourlyAggregation[eventType].emailReadCount++;
            await this.redisClient.del(hourlyKey);
          }

          if (dailyEmailTime) {
            const start = new Date(dailyEmailTime);
            const end = new Date(timestamp);
            const diffSecs = Math.floor((end - start) / 1000);
            dailyAggregation[eventType].totalEmailTime += diffSecs;
            dailyAggregation[eventType].emailReadCount++;
            await this.redisClient.del(dailyKey);
          }
        }
      }
    }

    await this.redisClient.set(
      calculatedHourlyBucketName,
      JSON.stringify(hourlyAggregation)
    );

    await this.redisClient.set(
      calculatedDailyBucketName,
      JSON.stringify(dailyAggregation)
    );
  }
}

module.exports = EventAggregator;
