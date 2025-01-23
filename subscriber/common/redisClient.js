const redis = require("ioredis");
const Logger = require("../logger");

const logger = new Logger({ logName: "RedisClient" });

const redisClient = new redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  ...(process.env.NODE_ENV === "local" && { password: process.env.REDIS_PASSWORD }),
});

redisClient.on("error", (error) => {
  logger.error({ message: "Redis connection error", err: error });
});

redisClient.on("connect", () => {
  logger.info("Successfully connected to Redis");
});

redisClient.on("reconnecting", () => {
  logger.info("Attempting to reconnect to Redis");
});

module.exports = redisClient;
