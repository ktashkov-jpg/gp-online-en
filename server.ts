import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import * as dotenv from "dotenv";
import { initializeApp, cert, getApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

// Initialize Firebase Admin
// If we have a service account file, we use it, otherwise we try default
if (!getApps().length) {
  try {
    initializeApp();
  } catch (error) {
    console.error("Firebase Admin initialization failed. Make sure you have the right environment variables.");
  }
}

const adminDb = getFirestore();

const isProduction = process.env.NODE_ENV === "production";
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Google OAuth Client Setup
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.APP_URL ? `${process.env.APP_URL}/api/auth/google/callback` : "http://localhost:3000/api/auth/google/callback"
  );

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // OAuth Endpoints
  app.get("/api/auth/google/url", (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const scopes = [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      state: userId as string, // Pass userId through state
    });

    res.json({ url });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code, state: userId } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      
      if (userId) {
        // Save tokens to the doctor's record in Firestore
        await adminDb.collection('doctors').doc(userId as string).update({
          googleTokens: tokens,
          syncEnabled: true,
          updatedAt: new Date().toISOString()
        });
        console.log(`Tokens saved for user ${userId}`);
      }
      
      // Redirect back to the app with a success flag
      res.redirect("/dashboard?calendar_sync=success");
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      res.redirect("/dashboard?calendar_sync=error");
    }
  });

  // Proxy for doctors registry
  app.get("/api/doctors/registry", async (req, res) => {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch("https://registries.his.bg/api/V1/outpatientcare/getOutpatientCare");
      const data = await response.json();
      
      const query = (req.query.q as string || "").toLowerCase();
      if (query) {
        const filtered = (data as any[]).filter(d => 
          (d.name || "").toLowerCase().includes(query) || 
          (d.identityNumber || "").toLowerCase().includes(query)
        ).slice(0, 50);
        return res.json(filtered);
      }

      res.json((data as any[]).slice(0, 100));
    } catch (error) {
      console.error("Error fetching doctors registry:", error);
      res.status(500).json({ error: "Failed to fetch registry" });
    }
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
