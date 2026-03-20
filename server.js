const express = require("express");
const { execFile } = require("node:child_process");

const app = express();

const PORT = process.env.PORT || 3007;
const HOST = process.env.HOST || "127.0.0.1";
const YTDLP_BIN = process.env.YTDLP_BIN || "yt-dlp";

function isYouTubeUrl(url) {
  const u = String(url || "").toLowerCase();
  return (
    u.includes("youtube.com/") ||
    u.includes("youtu.be/") ||
    u.includes("music.youtube.com/")
  );
}

function resolveYouTubeStream(url) {
  return new Promise((resolve, reject) => {
    const args = [
      "--no-playlist",
      "-f",
      "bestaudio",
      "-g",
      url,
    ];

    execFile(YTDLP_BIN, args, { timeout: 20000, windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message || "yt-dlp error"));
        return;
      }
      const lines = String(stdout || "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const stream = lines[0] || "";
      if (!stream) {
        reject(new Error("Brak URL streamu z yt-dlp"));
        return;
      }
      resolve(stream);
    });
  });
}

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "srpg_stereo_resolver" });
});

app.get("/resolve", async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();
    if (!url) {
      res.status(400).json({ ok: false, error: "Brak parametru url" });
      return;
    }

    if (!isYouTubeUrl(url)) {
      // Dla direct mp3/ogg zwracamy bez zmian.
      res.json({ ok: true, stream_url: url });
      return;
    }

    const stream = await resolveYouTubeStream(url);
    res.json({ ok: true, stream_url: stream });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`[srpg_stereo resolver] listening on http://${HOST}:${PORT}`);
});

