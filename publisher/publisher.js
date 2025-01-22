require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const Logger = require("./logger");
const Metrics = require("./metrics");
const PublishEventService = require("./publishEventService");

const publishEventService = new PublishEventService();
const logger = new Logger();
const metrics = new Metrics();

const app = express();
app.use(bodyParser.json());

app.post("/publish-event", async (req, res) => {
  const event = req.body;

  if (!event.eventId || !event.eventType || !event.payload) {
    return res.status(400).send("Invalid event data");
  }

  try {
    await publishEventService.publishEvent(event);
    res.status(200).send("Event published successfully");
  } catch (err) {
    logger.error({ message: "Error publishing event", err });
    res.status(500).send("Error publishing event");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  logger.info(`Publisher service running on port ${PORT}`);

  // Create custom metric for event ingestion
  await metrics.createCustomMetric();
});
