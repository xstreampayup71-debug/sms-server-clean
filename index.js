const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

// 🔥 PROXY FIX
app.set('trust proxy', true);

// 🔥 FIREBASE INIT
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ip-detector-6a30f-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// 🔥 FCM TOKEN (yaha apna latest token daal)
const USER_FCM_TOKEN = "fT0AduW1Qki1usOEBHYd-K:APA91bG3vbkjrHcRFB0Rh7ejr8VDZxlxDkPqMS2pFvDqLnMWQn2cdTecR1iHoKe5JbZBj2KQyNEGZlPU_6enzUd3v1kDacGyRdbScLAN2I1XeCNJk1HgeXo";

// 🔥 IP TRACK SYSTEM
const ipHits = {};
const alertedIPs = {}; // duplicate control

// 🔥 FCM SEND FUNCTION
async function sendFCM(ip, type) {
    try {
        await admin.messaging().send({
            token: USER_FCM_TOKEN,
            data: {
                type: type,
                ip: ip
            }
        });

        console.log("📲 FCM Sent:", ip);
    } catch (e) {
        console.log("❌ FCM Error:", e.message);
    }
}

// 🔥 MAIN MIDDLEWARE
app.use(async (req, res, next) => {

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    ipHits[ip] = (ipHits[ip] || 0) + 1;

    console.log("IP:", ip);
    console.log("URL:", req.url);
    console.log("Hits:", ipHits[ip]);

    // 🔥 VISIT ALERT (sirf ek baar)
    if (!alertedIPs[ip]) {
        alertedIPs[ip] = true;

        await db.ref("alerts").push({
            type: "visit",
            ip: ip,
            time: Date.now()
        });

        await sendFCM(ip, "visit");
    }

    // 🚨 SUSPICIOUS ALERT
    if (ipHits[ip] > 20 && ipHits[ip] < 25) {

        console.log("🚨 Suspicious IP:", ip);

        await db.ref("alerts").push({
            type: "suspicious",
            ip: ip,
            hits: ipHits[ip],
            url: req.url,
            time: Date.now()
        });

        await sendFCM(ip, "suspicious");
    }

    console.log("----------------------");

    next();
});

// 🔥 MEMORY CLEANUP
setInterval(() => {
    for (let ip in ipHits) {
        if (ipHits[ip] < 5) {
            delete ipHits[ip];
            delete alertedIPs[ip];
        }
    }
}, 60000);

// ================= API =================
app.post("/send", async (req, res) => {

    const { token, data } = req.body;

    if (!token || !data) {
        return res.json({ success: false, msg: "Invalid request" });
    }

    try {
        await admin.messaging().send({
            token: token,
            data: data
        });

        console.log("✅ FCM Sent manually");
        res.json({ success: true });

    } catch (err) {
        console.log("❌ Error:", err.message);
        res.json({ success: false });
    }
});

// 🔥 ROOT
app.get("/", (req, res) => {
    res.send("Server running babu 🚀");
});

// 🔥 PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🔥 Server running on port " + PORT);
});
