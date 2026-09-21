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

app.get('/api/playlist', async (req, res) => {
    const playlistUrl = req.query.url;
    if (!playlistUrl) return res.status(400).json({ error: 'No URL provided' });

    console.log(`[/api/playlist] Fetching metadata for: ${playlistUrl}`);

    try {
        // 'flat-playlist' + 'skip-download' is the fastest way to list tracks
        // We pass timeout: 10000 inside spawn options (3rd arg) to terminate subprocess if it hangs,
        // and socketTimeout: 10 in the flags (2nd arg) to avoid socket hang.
        const output = await youtubedl(playlistUrl, {
            dumpSingleJson: true,
            flatPlaylist: true,
            skipDownload: true,
            quiet: true,
            noWarnings: true,
            socketTimeout: 10,
            ...(hasCookies && { cookies: cookiesPath })
        }, {
            timeout: 10000
        });

        if (!output || !output.entries) {
            return res.status(404).send('Playlist error');
        }

        // Map the data
        const tracks = output.entries.map((entry) => ({
            title: entry.title || 'Unknown Track',
            url: entry.url || entry.webpage_url || `https://www.youtube.com/watch?v=${entry.id}`
        }));

        res.json({
            playlistTitle: output.title || 'YouTube Playlist',
            trackCount: tracks.length,
            tracks: tracks
        });

    } catch (err) {
        console.error('[/api/playlist] Error:', err.message);
        res.status(500).json({ error: 'Playlist fetch timed out or failed.' });
    }
});

// ─────────────────── Boot ───────────────────
app.listen(PORT, () => {
    console.log(`\n  🎧  yt-dlp Stream Proxy running on http://localhost:${PORT}`);
    console.log(`      Health check  →  http://localhost:${PORT}/api/health`);
    console.log(`      Stream test   →  http://localhost:${PORT}/api/stream?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ\n`);
});
