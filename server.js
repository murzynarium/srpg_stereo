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
  const attempts = [
    [
      "--no-playlist",
      "--ignore-config",
      "--force-ipv4",
      "--no-warnings",
      "--extractor-args",
      "youtube:player_client=android,web,mweb,tv_embedded",
      "-f",
      "bestaudio*/best",
      "-g",
      url,
    ],
    [
      "--no-playlist",
      "--ignore-config",
      "--force-ipv4",
      "--no-warnings",
      "--extractor-args",
      "youtube:player_client=web",
      "-f",
      "best",
      "-g",
      url,
    ],
    [
      "--no-playlist",
      "--ignore-config",
      "--force-ipv4",
      "--no-warnings",
      "-g",
      url,
    ],
  ];

  return new Promise((resolve, reject) => {
    const errors = [];

    const run = (idx) => {
      if (idx >= attempts.length) {
        reject(new Error(errors.join(" | ") || "yt-dlp error"));
        return;
      }

      const args = attempts[idx];
      execFile(
        YTDLP_BIN,
        args,
        { timeout: 30000, windowsHide: true },
        (err, stdout, stderr) => {
          if (err) {
            errors.push((stderr || err.message || "yt-dlp error").toString().trim().slice(0, 350));
            run(idx + 1);
            return;
          }

          const lines = String(stdout || "")
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);

          // Bierzemy pierwszy prawidlowy URL
          const stream = lines.find((l) => /^https?:\/\//i.test(l)) || "";
          if (!stream) {
            errors.push("Brak URL streamu z yt-dlp");
            run(idx + 1);
            return;
          }
          resolve(stream);
        }
      );
    };

    run(0);
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
