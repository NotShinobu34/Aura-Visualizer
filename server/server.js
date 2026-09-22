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
 * Shared metadata extraction helper for /api/info and /api/warm.
 * Extracts metadata via yt-dlp with skipDownload: true (zero audio downloaded).
 * Exposes the underlying child process via onProcessCreated for real cancellation.
 */
function extractVideoMetadata(videoUrl, options = {}) {
    const timeout = options.timeout || 15000;

    const subprocess = youtubedl.exec(videoUrl, {
        dumpSingleJson: true,
        noWarnings: true,
        quiet: true,
        skipDownload: true,
        ...(hasCookies && { cookies: cookiesPath })
    }, {
        timeout
    });

    if (typeof options.onProcessCreated === 'function') {
        options.onProcessCreated(subprocess);
    }

    return (async () => {
        const { stdout } = await subprocess;
        const info = JSON.parse(stdout);

        let parsedDuration = 0;
        if (typeof info.duration === 'number' && isFinite(info.duration) && info.duration >= 0) {
            parsedDuration = info.duration;
        } else if (typeof info.duration === 'string') {
            const num = parseFloat(info.duration);
            if (isFinite(num) && num >= 0) parsedDuration = num;
        }

        return {
            title:     (typeof info.title === 'string' && info.title.trim().length > 0) ? info.title.trim() : 'YouTube Audio',
            duration:  parsedDuration,
            thumbnail: info.thumbnail || null,
            channel:   info.channel || info.uploader || 'Unknown',
            videoId:   info.id || null,
            views:     info.view_count || 0
        };
    })();
}

/**
 * GET /api/info?url=<YouTube URL>
 * Returns metadata (title, duration, thumbnail) without streaming.
 */
app.get('/api/info', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: 'No URL provided' });

    try {
        const metadata = await extractVideoMetadata(videoUrl, { timeout: 15000 });
        res.json(metadata);
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

// ─────────────────── Lightweight Warm Cache ───────────────────
const warmCache = new Map();
const inFlightWarmRequests = new Map();
const MAX_WARM_CACHE = 100;
const WARM_TTL_MS = 15 * 60 * 1000; // 15 minutes
const WARM_EXTRACTION_TIMEOUT_MS = 10000; // Strict maximum timeout (10s) for /api/warm metadata extraction

// Clean up expired warm cache entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of warmCache.entries()) {
        if (now - entry.timestamp > WARM_TTL_MS) {
            warmCache.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * GET /api/warm?url=<YouTube URL>
 * Lightweight pre-warming endpoint for upcoming tracks.
 * Resolves and caches lightweight metadata only (title, duration, thumbnail, videoId).
 * DOES NOT download audio bytes, DOES NOT pipe audio to the client, and DOES NOT cache audio chunks in RAM.
 * Guarded by a strict maximum server-side timeout (WARM_EXTRACTION_TIMEOUT_MS).
 */
app.get('/api/warm', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: 'No URL provided' });

    // Extract video ID or fallback to URL as cache key
    let videoId = null;
    try {
        const urlObj = new URL(videoUrl);
        videoId = urlObj.searchParams.get('v');
        if (!videoId && videoUrl.includes('youtu.be/')) {
            videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        }
    } catch (e) {}

    const cacheKey = videoId || videoUrl;

    // 1. Check if valid warm entry exists in cache
    const cachedEntry = warmCache.get(cacheKey);
    const now = Date.now();
    if (cachedEntry && (now - cachedEntry.timestamp < WARM_TTL_MS)) {
        console.log(`[/api/warm] Cache hit for: ${cacheKey}`);
        return res.json({
            warmed: true,
            cached: true,
            videoId: cachedEntry.videoId,
            metadata: cachedEntry.metadata
        });
    }

    // 2. In-flight deduplication with consumer reference tracking & strict timeout guard
    let entry = inFlightWarmRequests.get(cacheKey);
    if (!entry) {
        let activeProcess = null;
        let consumerCount = 1;
        let timeoutTimer = null;
        let timedOut = false;

        const promise = new Promise((resolve, reject) => {
            // Strict server-side timeout guard: aborts process and rejects if extraction takes too long
            timeoutTimer = setTimeout(() => {
                timedOut = true;
                console.warn(`[/api/warm] Extraction timed out after ${WARM_EXTRACTION_TIMEOUT_MS}ms for: ${cacheKey}`);
                if (activeProcess && !activeProcess.killed) {
                    try { activeProcess.kill('SIGTERM'); } catch (e) {}
                    // Force SIGKILL fallback if process fails to exit after 1s
                    setTimeout(() => {
                        if (activeProcess && !activeProcess.killed) {
                            try { activeProcess.kill('SIGKILL'); } catch (e) {}
                        }
                    }, 1000).unref();
                }
                const timeoutErr = new Error(`Warm extraction timed out after ${WARM_EXTRACTION_TIMEOUT_MS}ms`);
                timeoutErr.timedOut = true;
                reject(timeoutErr);
            }, WARM_EXTRACTION_TIMEOUT_MS);

            (async () => {
                try {
                    console.log(`[/api/warm] Warming metadata for: ${cacheKey}`);
                    const metadata = await extractVideoMetadata(videoUrl, {
                        timeout: WARM_EXTRACTION_TIMEOUT_MS,
                        onProcessCreated: (proc) => {
                            activeProcess = proc;
                        }
                    });

                    // Never populate cache if already timed out
                    if (timedOut) return;

                    // Evict oldest if cache limit reached
                    if (warmCache.size >= MAX_WARM_CACHE) {
                        const oldestKey = warmCache.keys().next().value;
                        if (oldestKey) warmCache.delete(oldestKey);
                    }

                    warmCache.set(cacheKey, {
                        timestamp: Date.now(),
                        videoId: metadata.videoId || videoId,
                        metadata
                    });

                    resolve({
                        warmed: true,
                        cached: false,
                        videoId: metadata.videoId || videoId,
                        metadata
                    });
                } catch (err) {
                    if (!timedOut) {
                        reject(err);
                    }
                } finally {
                    clearTimeout(timeoutTimer);
                    // Guaranteed cleanup: always remove from in-flight map on resolution, failure, timeout, or cancellation
                    inFlightWarmRequests.delete(cacheKey);
                }
            })();
        });

        entry = {
            get consumerCount() { return consumerCount; },
            incrementConsumer() { consumerCount++; },
            decrementConsumer() {
                consumerCount--;
                if (consumerCount <= 0 && activeProcess && !activeProcess.killed) {
                    console.log(`[/api/warm] All consumers disconnected for ${cacheKey}. Terminating yt-dlp subprocess.`);
                    try { activeProcess.kill('SIGTERM'); } catch (e) {}
                }
            },
            promise
        };

        inFlightWarmRequests.set(cacheKey, entry);
    } else {
        console.log(`[/api/warm] Attaching to existing in-flight warm operation for: ${cacheKey}`);
        entry.incrementConsumer();
    }

    let isRequestClosed = false;
    req.on('close', () => {
        if (!isRequestClosed) {
            isRequestClosed = true;
            entry.decrementConsumer();
        }
    });

    try {
        const result = await entry.promise;
        isRequestClosed = true;
        if (!res.headersSent) {
            res.json(result);
        }
    } catch (err) {
        isRequestClosed = true;
        if (!res.headersSent) {
            console.warn(`[/api/warm] Warm operation failed for ${cacheKey}:`, err.message);
            const isTimeout = err.timedOut || (err.message && err.message.toLowerCase().includes('timed out'));
            const statusCode = isTimeout ? 504 : 500;
            const errorMsg = isTimeout ? 'Warm metadata extraction timed out.' : 'Warm operation failed';
            res.status(statusCode).json({ error: errorMsg, details: err.message });
        }
    }
});

// ─────────────────── Active Stream Manager (Direct Progressive Delivery) ───────────────────
const STREAM_STARTUP_BUFFER_LIMIT = 512 * 1024;       // 512 KB: Bounded startup buffer
const CLIENT_MAX_BACKPRESSURE_BYTES = 2 * 1024 * 1024; // 2 MB: Max queued backpressure before disconnecting slow client
const STREAM_STALL_TIMEOUT_MS = 30000;                // 30 seconds: Stalled stream timeout
const STREAM_MAX_LIFETIME_MS = 60 * 60 * 1000;         // 60 minutes: Max lifetime bound for any single stream

const activeStreams = new Set();    // All currently streaming ActiveStream instances
const joinableStreams = new Map();  // cacheKey -> currently joinable ActiveStream (within 512 KB startup window)

let streamClientCounter = 0;

class ActiveStream {
    constructor(key, videoUrl) {
        this.key = key;
        this.videoUrl = videoUrl;
        this.subprocess = null;
        this.clients = new Set();
        this.initialBuffer = [];
        this.totalBufferedBytes = 0;
        this.totalBytesStreamed = 0;
        this.isJoinable = true;
        this.isEnded = false;
        this.isTerminated = false;
        this.startedAt = Date.now();
        this.stallTimer = null;
        this.maxLifetimeTimer = null;
    }

    markNonJoinable(reason) {
        if (!this.isJoinable) return;
        this.isJoinable = false;
        if (joinableStreams.get(this.key) === this) {
            joinableStreams.delete(this.key);
        }
        console.log(`[/api/stream] Stream for ${this.key} is permanently non-joinable: ${reason}`);
    }

    addClient(req, res) {
        if (this.isTerminated || this.isEnded) {
            if (!res.headersSent) {
                res.status(500).json({ error: 'Stream has already ended' });
            }
            return null;
        }

        // Set headers for Web Audio API compatibility
        res.setHeader('Content-Type', 'audio/webm');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const client = {
            id: ++streamClientCounter,
            req,
            res,
            isDestroyed: false
        };

        this.clients.add(client);
        console.log(`[/api/stream] Attached client #${client.id} to stream ${this.key} (total clients: ${this.clients.size})`);

        // Deliver any retained startup buffer bytes to this client
        if (this.initialBuffer && this.initialBuffer.length > 0) {
            for (const bufChunk of this.initialBuffer) {
                if (client.isDestroyed) break;
                try {
                    client.res.write(bufChunk);
                } catch (e) {
                    this.removeClient(client, 'Error writing initial buffer');
                    break;
                }
            }
        }

        // Idempotent response-centric cleanup handlers
        const onClientCloseOrFinish = () => {
            this.removeClient(client, 'Response closed/finished');
        };

        res.on('close', onClientCloseOrFinish);
        res.on('finish', onClientCloseOrFinish);
        req.on('close', onClientCloseOrFinish);

        return client;
    }

    removeClient(client, reason = 'unknown') {
        if (!client || client.isDestroyed) return;
        client.isDestroyed = true;

        const hadClient = this.clients.delete(client);
        if (!hadClient) return;

        console.log(`[/api/stream] Removed client #${client.id} from stream ${this.key} (reason: ${reason}, remaining: ${this.clients.size})`);

        // If no clients remain and stream is active, terminate upstream process
        if (this.clients.size === 0 && !this.isEnded && !this.isTerminated) {
            console.log(`[/api/stream] No clients remaining on stream ${this.key}. Terminating upstream.`);
            this.terminate('All clients disconnected');
        }
    }

    resetStallTimer() {
        if (this.stallTimer) clearTimeout(this.stallTimer);
        this.stallTimer = setTimeout(() => {
            console.warn(`[/api/stream] Stream for ${this.key} stalled (no data for ${STREAM_STALL_TIMEOUT_MS}ms). Terminating.`);
            this.terminate('Stall timeout');
        }, STREAM_STALL_TIMEOUT_MS);
    }

    start() {
        this.resetStallTimer();

        this.maxLifetimeTimer = setTimeout(() => {
            console.warn(`[/api/stream] Stream for ${this.key} reached max lifetime (${STREAM_MAX_LIFETIME_MS}ms). Terminating.`);
            this.terminate('Max lifetime reached');
        }, STREAM_MAX_LIFETIME_MS);

        try {
            this.subprocess = youtubedl.exec(this.videoUrl, {
                output: '-',           // Stream directly to standard output
                format: 'bestaudio',   // Highest quality audio
                quiet: true,           // Suppress unnecessary yt-dlp console logs
                noWarnings: true,
                preferFreeFormats: true,
                skipDownload: false,
                skipUpdate: true,
                bufferSize: '64K',     // Stream buffer optimization
                httpChunkSize: '10M',  // HTTP chunk size
                ...(hasCookies && { cookies: cookiesPath })
            }, {
                stdio: ['ignore', 'pipe', 'ignore'] // Only keep stdout open for piping
            });
        } catch (err) {
            console.error(`[/api/stream] Failed to spawn yt-dlp:`, err.message);
            this.terminate(`Spawn failed: ${err.message}`);
            return;
        }

        // Subprocess stdout data handler
        this.subprocess.stdout.on('data', (chunk) => {
            if (this.isTerminated || this.isEnded) return;

            this.resetStallTimer();
            this.totalBytesStreamed += chunk.length;

            // Retain up to STREAM_STARTUP_BUFFER_LIMIT exactly in initialBuffer
            if (this.isJoinable) {
                const remaining = STREAM_STARTUP_BUFFER_LIMIT - this.totalBufferedBytes;
                if (remaining > 0) {
                    if (chunk.length <= remaining) {
                        this.initialBuffer.push(chunk);
                        this.totalBufferedBytes += chunk.length;
                        if (this.totalBufferedBytes >= STREAM_STARTUP_BUFFER_LIMIT) {
                            this.markNonJoinable('Startup buffer reached 512 KB limit');
                        }
                    } else {
                        // Retain only the allowed portion up to the exact limit
                        const slice = chunk.subarray(0, remaining);
                        this.initialBuffer.push(slice);
                        this.totalBufferedBytes += slice.length;
                        this.markNonJoinable('Startup buffer capacity filled exactly to 512 KB');
                    }
                } else {
                    this.markNonJoinable('Startup buffer already full');
                }
            }

            // Distribute full chunk to all active clients with backpressure monitoring
            for (const client of this.clients) {
                if (client.isDestroyed) continue;

                // Monitor client response backpressure
                const queuedBytes = client.res.writableLength || 0;
                if (queuedBytes > CLIENT_MAX_BACKPRESSURE_BYTES) {
                    console.warn(`[/api/stream] Client #${client.id} exceeded backpressure limit (${queuedBytes} bytes > ${CLIENT_MAX_BACKPRESSURE_BYTES}). Disconnecting slow client.`);
                    this.removeClient(client, 'Backpressure limit exceeded');
                    try { client.res.destroy(); } catch (e) {}
                    continue;
                }

                try {
                    client.res.write(chunk);
                } catch (err) {
                    this.removeClient(client, `Write error: ${err.message}`);
                }
            }
        });

        // Subprocess stdout end handler
        this.subprocess.stdout.on('end', () => {
            if (this.isTerminated || this.isEnded) return;
            console.log(`[/api/stream] Stream finished naturally for key: ${this.key} (Total streamed: ${this.totalBytesStreamed} bytes)`);
            this.isEnded = true;

            // End all active clients cleanly
            for (const client of this.clients) {
                client.isDestroyed = true;
                try {
                    if (!client.res.writableEnded) {
                        client.res.end();
                    }
                } catch (e) {}
            }
            this.clients.clear();
            this.terminate('Stream finished normally');
        });

        // Catch promise rejection (e.g. process error or signal kill)
        this.subprocess.catch((err) => {
            if (this.isTerminated || this.isEnded) return;
            if (err.signalCode === 'SIGTERM' || err.signalCode === 'SIGINT' || err.signalCode === 'SIGKILL' || err.killed) {
                return;
            }
            console.error(`[/api/stream] yt-dlp process error for ${this.key}:`, err.message);
            this.terminate(`Process error: ${err.message}`);
        });

        // Subprocess error event
        this.subprocess.on('error', (err) => {
            if (this.isTerminated || this.isEnded) return;
            console.error(`[/api/stream] yt-dlp subprocess error for ${this.key}:`, err.message);
            this.terminate(`Subprocess error: ${err.message}`);
        });
    }

    terminate(reason = 'Terminated') {
        if (this.isTerminated) return;
        this.isTerminated = true;
        this.isJoinable = false;

        console.log(`[/api/stream] Terminating stream ${this.key} (reason: ${reason})`);

        if (this.stallTimer) {
            clearTimeout(this.stallTimer);
            this.stallTimer = null;
        }
        if (this.maxLifetimeTimer) {
            clearTimeout(this.maxLifetimeTimer);
            this.maxLifetimeTimer = null;
        }

        // Remove from tracking collections immediately
        activeStreams.delete(this);
        if (joinableStreams.get(this.key) === this) {
            joinableStreams.delete(this.key);
        }

        // Release buffer memory immediately
        this.initialBuffer = null;

        // End/destroy remaining clients
        for (const client of this.clients) {
            client.isDestroyed = true;
            try {
                if (!client.res.writableEnded) {
                    client.res.end();
                }
            } catch (e) {}
        }
        this.clients.clear();

        // Terminate subprocess cleanly
        if (this.subprocess) {
            const proc = this.subprocess;
            if (!proc.killed) {
                try { proc.kill('SIGTERM'); } catch (e) {}
                setTimeout(() => {
                    if (!proc.killed) {
                        try { proc.kill('SIGKILL'); } catch (e) {}
                    }
                }, 1000).unref();
            }
        }
    }
}

/**
 * GET /api/stream?url=<YouTube URL>
 * Progressive direct audio streaming endpoint.
 * Delivers audio directly to requesting clients with bounded in-flight startup sharing (512 KB limit).
 * Does NOT retain complete audio in memory.
 */
app.get('/api/stream', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: 'No URL provided' });

    // Extract video ID or fall back to URL as cache key
    let videoId = null;
    try {
        const urlObj = new URL(videoUrl);
        videoId = urlObj.searchParams.get('v');
        if (!videoId && videoUrl.includes('youtu.be/')) {
            videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        }
    } catch (e) {}
    const cacheKey = videoId || videoUrl;

    // 1. Check if an active stream is currently within its joinable startup window (<= 512 KB)
    const joinableStream = joinableStreams.get(cacheKey);
    if (joinableStream && joinableStream.isJoinable && !joinableStream.isTerminated && !joinableStream.isEnded) {
        console.log(`[/api/stream] Joining active startup stream for: ${cacheKey}`);
        joinableStream.addClient(req, res);
        return;
    }

    // 2. Otherwise create a fresh independent upstream stream from byte 0
    console.log(`[/api/stream] Creating fresh upstream stream for: ${videoUrl}`);
    const stream = new ActiveStream(cacheKey, videoUrl);
    activeStreams.add(stream);
    joinableStreams.set(cacheKey, stream);
    stream.addClient(req, res);
    stream.start();
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
