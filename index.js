require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PAGE_ACCESS_TOKEN = "EAAUG0iogqEYBOyZCbO8SQ1d9f8KDfku3pan9Ok5lA1u56ZBycol5n4me74zsRNJO8wh8fiTgw1ejZCDxZBknhHwiz7MaxSZCcV8nNbYYCi4Ijutlg6IcLXnAvLdwpbnIA1AO6giyGtQZBweho42RNB13IzLUOHyualEjU31CkpXjJiVurFsWEZCL7ntNveeBHjkUgZDZD";
const VERIFY_TOKEN = "hackbot";
const hostURL = "https://trackdown-efzv.onrender.com/webhook"; // Replace with your URL

// Track users awaiting URL input
const userStates = {};

// Webhook verification
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// Webhook event handling
app.post("/webhook", (req, res) => {
    const body = req.body;

    if (body.object === "page") {
        body.entry.forEach(entry => {
            const webhookEvent = entry.messaging[0];
            const senderId = webhookEvent.sender.id;

            if (webhookEvent.message && webhookEvent.message.text) {
                handleMessage(senderId, webhookEvent.message);
            } else if (webhookEvent.postback) {
                handlePostback(senderId, webhookEvent.postback);
            }
        });

        res.status(200).send("EVENT_RECEIVED");
    } else {
        res.sendStatus(404);
    }
});

// Function to handle received messages
function handleMessage(senderId, receivedMessage) {
    let response;

    // Check if the user is expected to enter a URL
    if (userStates[senderId] === "awaiting_url") {
        const url = receivedMessage.text;
        
        // Validate URL (simple check, can be improved)
        if (url.startsWith("http://") || url.startsWith("https://")) {
            response = { text: `URL received: ${url}` };
            delete userStates[senderId]; // Clear the state
        } else {
            response = { text: `Please enter a valid URL starting with http:// or https://` };
        }
    } else {
        // Handle commands
        if (receivedMessage.text.toLowerCase() === "/start") {
            response = { text: `Welcome! Use this bot to create tracking links. Type /create to start.` };
        } else if (receivedMessage.text.toLowerCase() === "/create") {
            response = { text: `🌐 Please enter your URL:` };
            userStates[senderId] = "awaiting_url"; // Set state to expect URL input
        } else if (receivedMessage.text.toLowerCase() === "/help") {
            response = {
                text: `Instructions:\n1. Use /create to start.\n2. Enter a URL to generate tracking links.\n\nNote: This bot gathers info like location and device data.`
            };
        } else {
            response = { text: `Unknown command.` };
        }
    }

    callSendAPI(senderId, response);
}

// Function to handle postback responses
function handlePostback(senderId, receivedPostback) {
    let response;

    if (receivedPostback.payload === "CREATE_NEW") {
        response = { text: `🌐 Enter Your URL` };
        userStates[senderId] = "awaiting_url"; // Set state to expect URL input
    }

    callSendAPI(senderId, response);
}

// Function to send messages to the Facebook API
function callSendAPI(senderId, response) {
    fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            recipient: { id: senderId },
            message: response,
        }),
    })
        .then((res) => res.json())
        .then((json) => console.log(json))
        .catch((err) => console.error("Error sending message:", err));
}

// Start the server
app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
            
