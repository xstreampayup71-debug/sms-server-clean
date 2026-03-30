const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

// 🔥 PROXY FIX (Railway / Render ke liye important)
app.set('trust proxy', true);

// 🔥 IP TRACK + BASIC DETECTION
const ipHits = {};

app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // count hits
    ipHits[ip] = (ipHits[ip] || 0) + 1;

    console.log("IP:", ip);
    console.log("URL:", req.url);
    console.log("Method:", req.method);
    console.log("Time:", new Date().toLocaleString());
    console.log("Hits:", ipHits[ip]);

    // ⚠ suspicious detection
    if (ipHits[ip] > 50) {
        console.log("🚨 Suspicious IP detected:", ip);
    }

    console.log("----------------------");

    next();
});

// 🔥 ENV se Firebase load
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// ================= API =================
app.post("/send", async (req, res) => {

  const { token, data } = req.body;

  if (!token || !data) {
    return res.json({ success: false, msg: "Invalid request" });
  }

  const message = {
    token: token,
    data: data
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("✅ FCM Sent:", response);

    res.json({ success: true });

  } catch (err) {
    console.error("❌ FCM Error:", err);
    res.json({ success: false, error: err.message });
  }
});

// 🔥 TEST ROUTE
app.get("/", (req, res) => {
  res.send("Server running babu 🚀");
});

// 🔥 Railway ke liye dynamic port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔥 Server running on port " + PORT);
});
