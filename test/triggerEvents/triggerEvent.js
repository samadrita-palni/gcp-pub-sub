const axios = require('axios');
const { v4: uuidv4 } = require('uuid')

// The URL of the API you want to trigger
const apiUrl = ' https://pub-sub-publisher-921480193289.us-central1.run.app/publish-event'; // Replace with your actual API endpoint - https://pub-sub-publisher-921480193289.us-central1.run.app

// Number of times to call the API in a minute
const numCalls = 1000;
const intervalTime = 60000 / numCalls; // Time between each API call (in milliseconds)

// Possible event types to randomize
const eventTypes = ['LEAD_CREATED', 'LEAD_UPDATED', 'FORM_SUBMITTED', 'APPOINTMENT_BOOKED', 'EMAIL_SENT'];

// Function to get a random event type
function getRandomEventType() {
    const randomIndex = Math.floor(Math.random() * eventTypes.length);
    return eventTypes[randomIndex];
}

// Function to create the payload with a random event type
function createPayload() {
    return {
        eventId: uuidv4(),
        eventType: getRandomEventType(),
        timestamp: "2025-01-15T10:00:00Z",
        payload: {
            userId: "user2",
            emailId: "uds",
            timestamp: "2025-01-21T11:00:00Z",
            revenue:100
        }
    };
}

// Function to make the POST request
async function callApi() {
    const payload = createPayload(); // Generate the payload with a random event type

    try {
        const response = await axios.post(apiUrl, payload); // Make a POST request with the payload
        console.log('API response:', response.data);
    } catch (error) {
        console.error('Error making API call:', error);
    }
}

// Schedule the API calls
let callsMade = 0;
const interval = setInterval(() => {
    if (callsMade < numCalls) {
        callApi();
        callsMade++;
    } else {
        clearInterval(interval); // Stop after 1000 calls
        console.log('Finished 1000 API calls');
    }
}, intervalTime);
