import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser limit 10MB
  app.use(express.json({ limit: "10mb" }));

  const DB_PATH = path.join(process.cwd(), "db.json");

  // Helper to read database safely
  function readDB() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error reading db.json database:", error);
    }
    return null;
  }

  // Helper to write database safely
  function writeDB(data: any) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
      console.error("Error writing db.json database:", error);
    }
  }

  // API endpoint: check health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API endpoint: fetch synchronized state
  app.get("/api/sync", (req, res) => {
    const db = readDB();
    if (db) {
      res.json({ success: true, ...db });
    } else {
      res.json({ success: false, message: "No database records stored on physical container server yet" });
    }
  });

  // API endpoint: update state from client
  app.post("/api/sync", (req, res) => {
    try {
      const { members, tasks, invoices, divisions, notifications } = req.body;
      const currentDB = readDB() || {};

      // Merge or update the fields
      const updatedDB = {
        members: members || currentDB.members || [],
        tasks: tasks || currentDB.tasks || [],
        invoices: invoices || currentDB.invoices || [],
        divisions: divisions || currentDB.divisions || ["Content", "Design", "Digital Ads", "Event & PR"],
        notifications: notifications || currentDB.notifications || [],
        lastUpdated: new Date().toISOString()
      };

      writeDB(updatedDB);
      res.json({ success: true, ...updatedDB });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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
    console.log(`Marketing applet running in full-stack container on port ${PORT}`);
  });
}

startServer();
