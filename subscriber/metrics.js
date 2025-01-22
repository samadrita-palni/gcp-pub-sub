require("dotenv").config();
const { MetricServiceClient } = require("@google-cloud/monitoring");
const Logger = require("./logger");

class Metrics {
  constructor() {
    this.projectId = process.env.GCLOUD_PROJECT;
    this.monitoringClient = new MetricServiceClient();
    this.consumedCountMetricType = "custom.googleapis.com/event_consumed_count";
    this.logger = new Logger({ logName: "Metrics" });
  }

  async createCustomMetric() {
    if (process.env.NODE_ENV === "local") return;

    const metricDescriptor = {
      type: this.consumedCountMetricType,
      labels: [
        { key: "eventType", valueType: "STRING", description: "Type of event" },
      ],
      metricKind: "CUMULATIVE",
      valueType: "INT64",
      unit: "1",
      description: "Count of events consumed",
    };

    try {
      // List existing metric descriptors
      const [descriptors] = await this.monitoringClient.listMetricDescriptors({
        name: `projects/${this.projectId}`,
        filter: 'metric.type = starts_with("custom.googleapis.com/")'
      });

      const existingMetric = descriptors.find(
        (descriptor) => descriptor.type === this.consumedCountMetricType
      );

      if (existingMetric) {
        this.logger.info(
          `Custom metric descriptor already exists: ${existingMetric.name}`
        );
        return; // Exit if the metric already exists
      }

      const [descriptor] = await this.monitoringClient.createMetricDescriptor({
        name: `projects/${this.projectId}`,
        metricDescriptor: metricDescriptor,
      });
      this.logger.info(`Custom metric descriptor created: ${descriptor.name}`);
    } catch (err) {
      this.logger.error({ message: "Error creating custom metric:", err });
    }
  }

  async emitCustomMetricEvent(eventType) {
    if (process.env.NODE_ENV === "local") return;

    const timeSeriesData = {
      metric: { type: this.consumedCountMetricType, labels: { eventType } },
      resource: { type: "global" },
      points: [
        {
          interval: {
            start: { seconds: new Date().getTime() / 1000 },
          },
          value: {
            int64Value: 1,
          },
        },
      ],
    };

    try {
      await this.monitoringClient.createTimeSeries({
        name: `projects/${this.projectId}`,
        timeSeries: [timeSeriesData],
      });
      this.logger.info(`Custom metric event emitted: ${eventType}`);
    } catch (err) {
      this.logger.error({
        message: `Error emitting custom metric event for ${eventType}`,
        err,
      });
    }
  }
}

module.exports = Metrics;
