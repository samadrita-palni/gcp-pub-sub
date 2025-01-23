const admin = require("firebase-admin");
const Logger = require("../logger");

const logger = new Logger({ logName: "FirebaseClient" });

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  //databaseUrl:if not using the default db
});

admin.firestore().settings({
  ...(process.env.NODE_ENV === "local" && { host: "firebase-emulator:8080" }),
  ssl: process.env.NODE_ENV === "local" ? false : true, // Emulator does not require SSL
});

const firestoreDb = admin.firestore();

module.exports = firestoreDb;
