// server.js — AuraCanvas Stream Proxy (yt-dlp engine)
// Uses the yt-dlp binary via youtube-dl-exec. Zero API keys, 403-proof.

const dns = require('dns');
// Forces Node to use IPv4 for internet requests, fixing the ENOTFOUND Windows bug
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const app = express();
const PORT = process.env.PORT || 3001;

const cookiesPath = path.join(__dirname, 'cookies.txt');
const hasCookies = fs.existsSync(cookiesPath);
if (!hasCookies) {
    console.warn('\n======================================================');
    console.warn('⚠️  MASSIVE WARNING: cookies.txt not found in server root! ⚠️');
    console.warn('   YouTube may block requests with 403 errors.');
    console.warn('   Please export your YouTube cookies and save as cookies.txt');
    console.warn('======================================================\n');
}

// ─────────────────── CORS ───────────────────
app.use(cors({
    origin: '*',
    methods: ['GET'],
    exposedHeaders: ['Content-Length', 'Content-Type']
}));

// Block direct access to server directory files from the frontend static serving
app.use((req, res, next) => {
    if (req.path.startsWith('/server')) {
        return res.status(403).send('Access denied');
    }
    next();
});

// Serve frontend static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// ─────────────────── Routes ───────────────────

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /api/info?url=<YouTube URL>
 * Returns metadata (title, duration, thumbnail) without streaming.
 */
app.get('/api/info', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: 'No URL provided' });

    try {
        const info = await youtubedl(videoUrl, {
            dumpSingleJson: true,
            noWarnings: true,
            quiet: true,
            skipDownload: true,
            ...(hasCookies && { cookies: cookiesPath })
        }, {
            timeout: 15000
        });

        // Normalize duration to a finite positive number in seconds or 0
        let parsedDuration = 0;
        if (typeof info.duration === 'number' && isFinite(info.duration) && info.duration >= 0) {
            parsedDuration = info.duration;
        } else if (typeof info.duration === 'string') {
            const num = parseFloat(info.duration);
            if (isFinite(num) && num >= 0) parsedDuration = num;
        }

        res.json({
            title:     (typeof info.title === 'string' && info.title.trim().length > 0) ? info.title.trim() : 'YouTube Audio',
            duration:  parsedDuration,
            thumbnail: info.thumbnail || null,
            channel:   info.channel || info.uploader || 'Unknown',
            videoId:   info.id || null,
            views:     info.view_count || 0
        });
    } catch (err) {
        console.error(`[/api/info] Extraction failed: ${err.message}`);
        if (!res.headersSent) {
            const isTimeout = err.timedOut || (err.message && err.message.toLowerCase().includes('timed out'));
            const statusCode = isTimeout ? 504 : 500;
            const errorMsg = isTimeout ? 'Metadata fetch timed out.' : 'Failed to fetch video info.';
            res.status(statusCode).json({ error: errorMsg, details: err.message });
        }
    }
});

const streamCache = new Map();

// Periodically clean up cache entries older than 60 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of streamCache.entries()) {
        if (now - entry.timestamp > 60 * 60 * 1000) {
            console.log(`[Cache] Expiring cache entry for key: ${key}`);
            streamCache.delete(key);
        }
    }
}, 5 * 60 * 1000); // run every 5 minutes

/**
 * GET /api/stream?url=<YouTube URL>
 * Pipes an audio-only stream straight to the response via yt-dlp subprocess, caching in memory.
 *
 * Frontend usage:
 *   audioElement.src = `http://localhost:3001/api/stream?url=${encodeURIComponent(ytLink)}`;
 */
app.get('/api/stream', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: 'No URL provided' });

    console.log(`[/api/stream] Attempting to extract: ${videoUrl}`);

    // Set headers for Web Audio API compatibility
    res.setHeader('Content-Type', 'audio/webm'); // yt-dlp 'bestaudio' usually defaults to webm/opus
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Extract video ID or fall back to URL
    let videoId = null;
    try {
        const urlObj = new URL(videoUrl);
        videoId = urlObj.searchParams.get('v');
        if (!videoId && videoUrl.includes('youtu.be/')) {
            videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        }
    } catch (e) {
        // Ignore parsing errors
    }
    const cacheKey = videoId || videoUrl;

    const entry = streamCache.get(cacheKey);
    const now = Date.now();

    if (entry && (now - entry.timestamp < 60 * 60 * 1000)) {
        console.log(`[/api/stream] CACHE HIT! Serving from in-memory cache: ${cacheKey}`);
        entry.timestamp = now; // update TTL

        // Write existing chunks
        for (const chunk of entry.chunks) {
            res.write(chunk);
        }

        if (entry.isComplete) {
            res.end();
            return;
        }

        // If not complete, subscribe to incoming chunks
        const onData = (chunk) => {
            res.write(chunk);
        };
        const onEnd = () => {
            res.end();
        };
        const onError = (err) => {
            if (!res.headersSent) {
                res.status(500).json({ error: 'Streaming failed' });
            }
        };

        const listener = { onData, onEnd, onError, res };
        entry.listeners.push(listener);

        req.on('close', () => {
            console.log(`[/api/stream] Subscribed client closed request for: ${cacheKey}`);
            entry.listeners = entry.listeners.filter(l => l !== listener);
        });
        return;
    }

    // Cache miss
    console.log(`[/api/stream] CACHE MISS. Spawning yt-dlp for: ${videoUrl}`);
    const newEntry = {
        timestamp: now,
        chunks: [],
        isComplete: false,
        listeners: []
    };
    streamCache.set(cacheKey, newEntry);

    const subprocess = youtubedl.exec(videoUrl, {
        output: '-',           // Stream directly to standard output
        format: 'bestaudio',   // Grab the highest quality audio stream
        quiet: true,           // Suppress unnecessary yt-dlp console logs
        noWarnings: true,
        preferFreeFormats: true,
        skipDownload: false,
        skipUpdate: true,      // Speed up process by not checking for yt-dlp updates every time
        bufferSize: '64K',     // Stream Buffer Optimization (Requested: 64K)
        httpChunkSize: '10M',  // Stream Buffer Optimization
        ...(hasCookies && { cookies: cookiesPath })
    }, {
        stdio: ['ignore', 'pipe', 'ignore'] // Only keep stdout open for piping
    });

    // Pipe directly to the initial request
    subprocess.stdout.pipe(res);

    // Save chunks to memory cache and distribute to active subscribers
    subprocess.stdout.on('data', (chunk) => {
        newEntry.chunks.push(chunk);
        for (const listener of newEntry.listeners) {
            listener.onData(chunk);
        }
    });

    subprocess.stdout.on('end', () => {
        console.log(`[/api/stream] Stream finished downloading for key: ${cacheKey}`);
        newEntry.isComplete = true;
        for (const listener of newEntry.listeners) {
            listener.onEnd();
        }
        newEntry.listeners = [];
    });

    // Catch the promise to prevent Node from crashing when killed
    subprocess.catch((err) => {
        if (err.signalCode === 'SIGINT' || err.killed) return;
        console.error('[/api/stream] yt-dlp Process Error:', err.message);
        for (const listener of newEntry.listeners) {
            listener.onError(err);
        }
        newEntry.listeners = [];
        streamCache.delete(cacheKey);
    });

    subprocess.on('error', (err) => {
        console.error('[/api/stream] yt-dlp Subprocess Error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Streaming failed' });
        }
        for (const listener of newEntry.listeners) {
            listener.onError(err);
        }
        newEntry.listeners = [];
        streamCache.delete(cacheKey);
    });

    req.on('close', () => {
        console.log(`[/api/stream] Initial client disconnected for key: ${cacheKey}`);
        // If there are no other active listeners/subscribers and the download is not finished, kill it
        if (newEntry.listeners.length === 0 && !newEntry.isComplete) {
            console.log(`[/api/stream] No other clients listening. Killing process...`);
            subprocess.kill('SIGINT');
            streamCache.delete(cacheKey);
        }
    });
});

app.get('/api/playlist', (req, res) => {
    const playlistUrl = req.query.url;
    if (!playlistUrl) return res.status(400).json({ error: 'No URL provided' });

    console.log(`[/api/playlist] Progressive extraction started for: ${playlistUrl}`);

    // Set headers for line-delimited JSON (NDJSON) streaming
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
    }

    let isTerminated = false;
    let trackCount = 0;

    // Send init event
    res.write(JSON.stringify({ type: 'init', url: playlistUrl }) + '\n');

    // Spawn yt-dlp with dumpJson (one JSON object per line) + flatPlaylist
    const subprocess = youtubedl.exec(playlistUrl, {
        dumpJson: true,
        flatPlaylist: true,
        skipDownload: true,
        noWarnings: true,
        quiet: true,
        socketTimeout: 15,
        ...(hasCookies && { cookies: cookiesPath })
    }, {
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 120000 // 2-minute safety ceiling for large playlists
    });

    const rl = readline.createInterface({
        input: subprocess.stdout,
        crlfDelay: Infinity
    });

    rl.on('line', (line) => {
        if (isTerminated) return;
        const trimmed = line.trim();
        if (!trimmed) return;

        try {
            const entry = JSON.parse(trimmed);
            if (!entry || !entry.id) return;
            // Filter deleted, private, or unavailable videos
            if (entry.title === '[Private video]' || entry.title === '[Deleted video]' || entry.title === '[Unavailable video]') {
                return;
            }

            trackCount++;
            const track = {
                videoId: entry.id,
                title: (typeof entry.title === 'string' && entry.title.trim().length > 0) ? entry.title.trim() : `Track ${trackCount}`,
                url: entry.url && entry.url.startsWith('http') ? entry.url : `https://www.youtube.com/watch?v=${entry.id}`,
                duration: typeof entry.duration === 'number' && isFinite(entry.duration) && entry.duration >= 0 ? entry.duration : 0
            };

            res.write(JSON.stringify({ type: 'track', track }) + '\n');
        } catch (e) {
            // Non-fatal parse error on malformed line
        }
    });

    function cleanup() {
        if (isTerminated) return;
        isTerminated = true;
        rl.close();
        if (subprocess && !subprocess.killed) {
            try {
                subprocess.kill('SIGTERM');
            } catch (e) {}
        }
    }

    subprocess.on('close', (code) => {
        if (isTerminated) return;
        if (code === 0) {
            console.log(`[/api/playlist] Extraction finished successfully. Total tracks: ${trackCount}`);
            res.write(JSON.stringify({ type: 'done', count: trackCount }) + '\n');
        } else {
            console.warn(`[/api/playlist] Extraction ended with exit code ${code}. Total tracks found: ${trackCount}`);
            if (trackCount > 0) {
                res.write(JSON.stringify({ type: 'error', message: `Playlist extraction ended with code ${code}`, partial: true, count: trackCount }) + '\n');
            } else {
                res.write(JSON.stringify({ type: 'error', message: 'Failed to extract playlist tracks. Verify the URL or cookies.', partial: false, count: 0 }) + '\n');
            }
        }
        res.end();
        cleanup();
    });

    subprocess.catch((err) => {
        if (isTerminated) return;
        console.error('[/api/playlist] Subprocess error:', err.message);
        if (trackCount > 0) {
            res.write(JSON.stringify({ type: 'error', message: err.message, partial: true, count: trackCount }) + '\n');
        } else {
            res.write(JSON.stringify({ type: 'error', message: err.message, partial: false, count: 0 }) + '\n');
        }
        res.end();
        cleanup();
    });

    req.on('close', () => {
        if (!isTerminated) {
            console.log(`[/api/playlist] Client closed connection for: ${playlistUrl}`);
            cleanup();
        }
    });
});

// ─────────────────── Boot ───────────────────
app.listen(PORT, () => {
    console.log(`\n  🎧  yt-dlp Stream Proxy running on http://localhost:${PORT}`);
    console.log(`      Health check  →  http://localhost:${PORT}/api/health`);
    console.log(`      Stream test   →  http://localhost:${PORT}/api/stream?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ\n`);
});
