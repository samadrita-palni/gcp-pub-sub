require("dotenv").config();
const moment = require("moment");
const FirebaseUtils = require("./firebaseUtils");
const Logger = require("./logger");

class ApiService {
  constructor() {
    this.firebaseUtils = new FirebaseUtils();
    this.logger = new Logger({ logName: "ApiService" });
  }

  async getAggregateEvents(eventType, day, hourWindow) {
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
}

module.exports = ApiService;
