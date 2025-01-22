require("dotenv").config();
const admin = require("firebase-admin");
const Logger = require("./logger");

class FirebaseUtils {
  constructor() {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        //databaseUrl:if not using the default db
      });

      admin.firestore().settings({
        ...(process.env.NODE_ENV === "local" && { host: "firebase-emulator:8080" }),
        ssl: process.env.NODE_ENV === "local" ? false : true, // Emulator does not require SSL
      });
    }

    this.firestoreDb = admin.firestore();

    this.logger = new Logger({ logName: "FirebaseUtils" });
  }

  async storeToFirebase({ key, data, eventCollection }) {
    try {
      const eventRef = this.firestoreDb.collection(eventCollection).doc(key);
      await eventRef.set({ events: data, timestamp: new Date() });
      this.logger.info({
        message: `Event with key - ${key} saved to Firestore.`,
        data,
      });
    } catch (error) {
      this.logger.error({ message: "Error saving event to Firestore", error });
    }
  }

  async getEvents(key, eventCollection) {
    console.log(key);
    const row = await this.firestoreDb
      .collection(eventCollection)
      .doc(key)
      .get();
    return row.data();
  }

  async getDataByTimestampFilter(timestamp, eventCollection) {
    const eventsRef = this.firestoreDb.collection(eventCollection);

    const snapshot = await eventsRef.where("timestamp", ">=", timestamp).get();

    const hourlyEvents = [];

    snapshot.forEach((doc) => {
      hourlyEvents.push(doc.data());
    });

    return hourlyEvents;
  }
}

module.exports = FirebaseUtils;
