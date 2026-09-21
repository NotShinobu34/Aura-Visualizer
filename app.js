// app.js

// --- DOM Elements ---
const btnLaunch = document.getElementById('btn-launch');
const heroScreen = document.getElementById('hero-screen');
const controlDeck = document.getElementById('control-deck');
const canvas = document.getElementById('visualizer-canvas');
const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no-alpha background
const audioSource = document.getElementById('audio-source');
const btnUploadMusic = document.getElementById('btn-upload-music');
const uploadModal = document.getElementById('upload-modal');
const btnCloseUploadModal = document.getElementById('btn-close-upload-modal');
const btnUploadFiles = document.getElementById('btn-upload-files');
const btnUploadFolder = document.getElementById('btn-upload-folder');
const hiddenFileInput = document.getElementById('hidden-file-input');
const hiddenFolderInput = document.getElementById('hidden-folder-input');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');
const btnShuffle = document.getElementById('btn-shuffle');
const btnLoopToggle = document.getElementById('btn-loop-toggle');
const loopBadgeText = document.getElementById('loop-badge-text');
const playbackSpeedSelect = document.getElementById('playback-speed');
const customSpeedInput = document.getElementById('custom-speed-input');
const trackNameLabel = document.getElementById('track-name');
const progressBar = document.getElementById('progress-bar');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');

// Volume Elements
const volumeSlider = document.getElementById('volume-slider');
const muteBtn = document.getElementById('mute-btn');
const iconVolUp = document.getElementById('icon-vol-up');
const iconVolMute = document.getElementById('icon-vol-mute');
const sensitivitySlider = document.getElementById('sensitivity-slider');
const modeRadios = document.getElementsByName('visual-mode');

// Top Navigation Elements
const topNavControls = document.getElementById('top-nav-controls');
const btnEffectsToggle = document.getElementById('btn-effects-toggle');
const btnEqToggle = document.getElementById('btn-eq-toggle-nav');

// Playlist Elements
const topRightControls = document.getElementById('top-right-controls');
const btnPlaylistToggle = document.getElementById('playlist-toggle-btn');
const playlistSidebar = document.getElementById('playlist-sidebar');
const playlistContainer = document.getElementById('playlist-container');

// Link Modal Elements
const btnUploadLink = document.getElementById('btn-upload-link');
const linkModal = document.getElementById('link-modal');
const btnCloseLinkModal = document.getElementById('btn-close-link-modal');
const linkTabSingle = document.getElementById('link-tab-single');
const linkTabPlaylist = document.getElementById('link-tab-playlist');
const linkPanelSingle = document.getElementById('link-panel-single');
const linkPanelPlaylist = document.getElementById('link-panel-playlist');
const linkInputSingle = document.getElementById('link-input-single');
const linkInputPlaylist = document.getElementById('link-input-playlist');
const btnLoadSong = document.getElementById('btn-load-song');
const btnLoadPlaylist = document.getElementById('btn-load-playlist');

// Loading Popup Elements
const loadingPopup = document.getElementById('loading-popup');
const loadingPopupText = document.getElementById('loading-popup-text');

// --- Dynamic Theme Logic ---
let activeThemeHour = -1;
let activeThemeColor = '#ffffff';
let activeThemeGlow = '#ffffff';

function setDynamicTheme(hour) {
    if (document.getElementById('color-override-toggle') && document.getElementById('color-override-toggle').checked) return;
    let primary, secondary, glow;
    let bracket = -1;

    if (hour >= 6 && hour < 12) {
        // Morning: Bright Sunrise (Neon Peach, Warm Pink)
        bracket = 0;
        primary = '255, 154, 158';   // #FF9A9E — Bright Peach
        secondary = '255, 183, 150'; // #FFB796 — Warm Coral
        glow = '254, 207, 239';      // #FECFEF — Soft Pink Glow
    } else if (hour >= 12 && hour < 18) {
        // Afternoon: Vivid Daylight (Neon Cyan, Electric Blue)
        bracket = 1;
        primary = '0, 242, 254';     // #00F2FE — Neon Cyan
        secondary = '79, 172, 254';  // #4FACFE — Sky Blue
        glow = '102, 255, 255';      // #66FFFF — Bright Aqua Glow
    } else if (hour >= 18 && hour < 22) {
        // Evening: Vivid Sunset (Hot Pink, Bright Coral)
        bracket = 2;
        primary = '255, 8, 68';      // #FF0844 — Hot Pink
        secondary = '255, 120, 100'; // #FF7864 — Bright Coral
        glow = '255, 177, 153';      // #FFB199 — Warm Peach Glow
    } else {
        // Night: Electric Neon (Vivid Cyan, Electric Blue)
        bracket = 3;
        primary = '0, 198, 255';     // #00C6FF — Electric Cyan
        secondary = '0, 114, 255';   // #0072FF — Royal Blue
        glow = '100, 180, 255';      // #64B4FF — Bright Sky Glow
    }

    let oldBracket = -1;
    if (activeThemeHour !== -1) {
        if (activeThemeHour >= 6 && activeThemeHour < 12) oldBracket = 0;
        else if (activeThemeHour >= 12 && activeThemeHour < 18) oldBracket = 1;
        else if (activeThemeHour >= 18 && activeThemeHour < 22) oldBracket = 2;
        else oldBracket = 3;
    }

    if (activeThemeHour !== -1 && oldBracket === bracket) {
        return; // No change needed
    }

    activeThemeHour = hour;
    document.documentElement.style.setProperty('--theme-primary', primary);
    document.documentElement.style.setProperty('--theme-secondary', secondary);
    document.documentElement.style.setProperty('--theme-glow', glow);
    
    const computedStyle = getComputedStyle(document.documentElement);
    activeThemeColor = `rgb(${computedStyle.getPropertyValue('--theme-primary').trim()})`;
    activeThemeGlow = `rgb(${computedStyle.getPropertyValue('--theme-glow').trim()})`;
}

function startThemeMonitor() {
    setInterval(() => {
        const currentHour = new Date().getHours();
        setDynamicTheme(currentHour);
    }, 60000);
}

setDynamicTheme(new Date().getHours());
startThemeMonitor();

// Sidebar Elements
const effectsPanel = document.getElementById('effects-panel');
const btnEqClose = document.getElementById('btn-eq-close');
const eqSidebar = document.getElementById('eq-sidebar');
const eqPresetSelect = document.getElementById('eq-preset');

// Custom EQ Dropdown Elements
const customEqDropdown = document.getElementById('custom-eq-dropdown');
const customEqTrigger = document.getElementById('custom-eq-trigger');
const customEqOptions = document.getElementById('custom-eq-options');

// EQ Band Config: [id-suffix, frequency, type, Q]
const EQ_BANDS = [
    { id: '60',    freq: 60,   type: 'lowshelf',  Q: null },
    { id: '230',   freq: 230,  type: 'peaking',   Q: 1    },
    { id: '910',   freq: 910,  type: 'peaking',   Q: 1    },
    { id: '3600',  freq: 3600, type: 'peaking',   Q: 1    },
    { id: '14000', freq: 14000, type: 'highshelf', Q: null },
];

// EQ Presets: slider values on 0-100 scale for [60, 230, 910, 3600, 14000]
// Conversion: gainDb = (sliderValue - 50) * (24 / 100)
// So 50 = 0dB, 100 = +12dB, 0 = -12dB
const EQ_PRESETS = {
    'flat':          [50, 50, 50, 50, 50],
    'bass-boost':    [83, 71, 50, 48, 46],
    'treble-boost':  [46, 48, 50, 71, 83],
    'acoustic':      [63, 54, 58, 63, 67],
    'electronic':    [71, 63, 42, 63, 75],
    'hip-hop':       [79, 67, 46, 54, 67],
    'rock':          [67, 58, 46, 63, 71],
    'pop':           [54, 63, 67, 63, 54],
    'classical':     [50, 50, 50, 58, 63],
    'spoken-word':   [42, 50, 67, 63, 46],
};

// --- Slider <-> dB Conversion ---
// Maps 0-100 slider range to -12dB to +12dB
function sliderToDb(sliderValue) {
    return (sliderValue - 50) * (24 / 100);
}

// Maps -12dB to +12dB back to 0-100 slider range
function dbToSlider(dbValue) {
    return (dbValue / 24) * 100 + 50;
}

// --- Global State ---
let audioCtx;
let analyser;
let dataArray;
let timeDataArray;
let isPlaying = false;
let sensitivity = 1.0;
let currentMode = 'mandala'; // 'mandala' or 'swarm'
let animationId;
let playlist = [];
let currentTrackIndex = 0;
let loopMode = 'none'; // 'none', 'playlist', 'single'
let isShuffle = false;

// EQ Filter Nodes (array of 5 BiquadFilterNodes)
let eqFilters = [];

// Safe Window Dimensions
let w = window.innerWidth;
let h = window.innerHeight;

// --- Initialize Canvas ---
function resizeCanvas() {
    w = window.innerWidth;
    h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    
    // Normalize coordinate system to use CSS pixels
    ctx.scale(dpr, dpr);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial call

// --- Audio Engine Initialization ---
function initAudioEngine() {
    if (audioCtx) return; // Already initialized

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    const track = audioCtx.createMediaElementSource(audioSource);
    analyser = audioCtx.createAnalyser();

    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.8;

    // --- 5-Band EQ Filter Setup ---
    eqFilters = EQ_BANDS.map(band => {
        const filter = audioCtx.createBiquadFilter();
        filter.type = band.type;
        filter.frequency.value = band.freq;
        filter.gain.value = 0;
        if (band.Q !== null) {
            filter.Q.value = band.Q;
        }
        return filter;
    });

    // Audio chain: Source → 60Hz → 230Hz → 910Hz → 3.6kHz → 14kHz → Analyser → Destination
    track.connect(eqFilters[0]);
    for (let i = 0; i < eqFilters.length - 1; i++) {
        eqFilters[i].connect(eqFilters[i + 1]);
    }
    eqFilters[eqFilters.length - 1].connect(analyser);
    analyser.connect(audioCtx.destination);

    const bufferLength = analyser.frequencyBinCount; // exactly 256
    dataArray = new Uint8Array(bufferLength);
    timeDataArray = new Uint8Array(bufferLength);
}

// --- UI Event Listeners ---

// 1. Launch Visualizer
btnLaunch.addEventListener('click', () => {
    // Fade out hero screen
    heroScreen.classList.add('fade-out');
    // Show control deck and top navigation
    controlDeck.classList.remove('hidden');
    topNavControls.classList.remove('hidden');
    topRightControls.classList.remove('hidden');
    
    // Start animation loop
    if (!animationId) {
        requestAnimationFrame(renderLoop);
    }
});

// 2. Upload Modal Logic
if (btnUploadMusic && uploadModal) {
    btnUploadMusic.addEventListener('click', () => {
        uploadModal.classList.add('active');
    });
}

if (btnCloseUploadModal && uploadModal) {
    btnCloseUploadModal.addEventListener('click', () => {
        uploadModal.classList.remove('active');
    });
}

// 2.5 Volume Control
volumeSlider.addEventListener('input', (e) => {
    audioSource.volume = e.target.value;
    if (parseFloat(e.target.value) === 0) {
        audioSource.muted = true;
        iconVolUp.classList.add('hidden');
        iconVolMute.classList.remove('hidden');
    } else {
        audioSource.muted = false;
        iconVolUp.classList.remove('hidden');
        iconVolMute.classList.add('hidden');
    }
});

muteBtn.addEventListener('click', () => {
    audioSource.muted = !audioSource.muted;
    if (audioSource.muted) {
        iconVolUp.classList.add('hidden');
        iconVolMute.classList.remove('hidden');
        volumeSlider.value = 0;
    } else {
        iconVolUp.classList.remove('hidden');
        iconVolMute.classList.add('hidden');
        volumeSlider.value = audioSource.volume > 0 ? audioSource.volume : 0.5;
        if (audioSource.volume === 0) audioSource.volume = 0.5;
    }
});

if (uploadModal) {
    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) {
            uploadModal.classList.remove('active');
        }
    });
}

if (btnUploadFiles && uploadModal && hiddenFileInput) {
    btnUploadFiles.addEventListener('click', () => {
        hiddenFileInput.click();
        uploadModal.classList.remove('active');
    });
}

if (btnUploadFolder && uploadModal && hiddenFolderInput) {
    btnUploadFolder.addEventListener('click', () => {
        hiddenFolderInput.click();
        uploadModal.classList.remove('active');
    });
}

// 2.3 Link Modal Logic
if (btnUploadLink && linkModal) {
    btnUploadLink.addEventListener('click', () => {
        linkModal.classList.add('active');
    });
}

if (btnCloseLinkModal && linkModal) {
    btnCloseLinkModal.addEventListener('click', () => {
        linkModal.classList.remove('active');
    });
}

if (linkModal) {
    linkModal.addEventListener('click', (e) => {
        if (e.target === linkModal) {
            linkModal.classList.remove('active');
        }
    });
}

// Tab toggle
function switchLinkTab(tab) {
    linkTabSingle.classList.toggle('active', tab === 'single');
    linkTabPlaylist.classList.toggle('active', tab === 'playlist');
    linkPanelSingle.classList.toggle('active', tab === 'single');
    linkPanelPlaylist.classList.toggle('active', tab === 'playlist');
}

linkTabSingle.addEventListener('click', () => switchLinkTab('single'));
linkTabPlaylist.addEventListener('click', () => switchLinkTab('playlist'));

// Loading Popup Helpers
let hidePopupTimeout = null;
function showLoadingPopup(message) {
    if (hidePopupTimeout) {
        clearTimeout(hidePopupTimeout);
        hidePopupTimeout = null;
    }
    if (loadingPopup && loadingPopupText) {
        loadingPopupText.textContent = message;
        loadingPopup.classList.add('active');
    }
}

function hideLoadingPopup(successMessage, delay = 2000) {
    if (hidePopupTimeout) {
        clearTimeout(hidePopupTimeout);
        hidePopupTimeout = null;
    }
    if (loadingPopup && loadingPopupText) {
        if (successMessage) {
            loadingPopupText.textContent = successMessage;
            hidePopupTimeout = setTimeout(() => {
                loadingPopup.classList.remove('active');
                hidePopupTimeout = null;
            }, delay);
        } else {
            loadingPopup.classList.remove('active');
        }
    }
}

// --- YouTube Helpers & Single Song Metadata Workflow ---

/**
 * Single source of truth for extracting an 11-character YouTube video ID.
 * Safely handles standard watch URLs, youtu.be, shorts, embeds, and music.youtube.com.
 * Returns null if the URL is invalid or does not contain an 11-character video ID.
 */
function extractYouTubeVideoId(urlInput) {
    if (!urlInput || typeof urlInput !== 'string') return null;
    let trimmed = urlInput.trim();
    if (!trimmed) return null;

    if (!/^https?:\/\//i.test(trimmed)) {
        trimmed = 'https://' + trimmed;
    }

    try {
        const parsed = new URL(trimmed);
        const hostname = parsed.hostname.toLowerCase();
        
        const isStandard = hostname === 'youtube.com' || hostname.endsWith('.youtube.com');
        const isShort = hostname === 'youtu.be';

        if (!isStandard && !isShort) return null;

        // 1. youtu.be/<id>
        if (isShort) {
            const pathParts = parsed.pathname.split('/').filter(Boolean);
            if (pathParts.length > 0 && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[0])) {
                return pathParts[0];
            }
            return null;
        }

        // 2. Standard watch URL: youtube.com/watch?v=<id>
        const vParam = parsed.searchParams.get('v');
        if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
            return vParam;
        }

        // 3. Shorts: youtube.com/shorts/<id>
        if (parsed.pathname.startsWith('/shorts/')) {
            const shortParts = parsed.pathname.replace('/shorts/', '').split('/').filter(Boolean);
            if (shortParts.length > 0 && /^[a-zA-Z0-9_-]{11}$/.test(shortParts[0])) {
                return shortParts[0];
            }
        }

        // 4. Embed: youtube.com/embed/<id>
        if (parsed.pathname.startsWith('/embed/')) {
            const embedParts = parsed.pathname.replace('/embed/', '').split('/').filter(Boolean);
            if (embedParts.length > 0 && /^[a-zA-Z0-9_-]{11}$/.test(embedParts[0])) {
                return embedParts[0];
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Validates a YouTube URL using the URL API and extractYouTubeVideoId().
 * Allows harmless extra query parameters (e.g. list, index, si, feature, t).
 * Rejects non-YouTube domains, non-HTTP/HTTPS protocols, malformed URLs, and missing IDs.
 */
function validateYouTubeUrl(urlInput) {
    if (!urlInput || typeof urlInput !== 'string' || !urlInput.trim()) {
        return { valid: false, error: 'Please enter a YouTube video URL.' };
    }
    const trimmed = urlInput.trim();
    const videoId = extractYouTubeVideoId(trimmed);
    if (!videoId) {
        return {
            valid: false,
            error: 'Invalid YouTube URL. Please enter a valid YouTube video, Music, Shorts, or youtu.be link.'
        };
    }
    return {
        valid: true,
        videoId: videoId,
        originalUrl: trimmed,
        normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`
    };
}

/**
 * Normalizes metadata fields defensively to prevent undefined, null, or empty values.
 */
function normalizeMetadata(data, videoId) {
    const safeVideoId = (videoId && typeof videoId === 'string') ? videoId.trim() : '';
    const fallbackTitle = safeVideoId ? `YouTube Audio (${safeVideoId})` : 'YouTube Audio';

    if (!data || typeof data !== 'object') {
        return {
            title: fallbackTitle,
            duration: 0,
            thumbnail: null,
            channel: 'YouTube',
            videoId: safeVideoId,
            isFallback: true
        };
    }

    const rawTitle = typeof data.title === 'string' ? data.title.trim() : '';
    const title = rawTitle.length > 0 ? rawTitle : fallbackTitle;

    let duration = 0;
    if (typeof data.duration === 'number' && isFinite(data.duration) && data.duration >= 0) {
        duration = data.duration;
    } else if (typeof data.duration === 'string') {
        const parsed = parseFloat(data.duration);
        if (isFinite(parsed) && parsed >= 0) {
            duration = parsed;
        }
    }

    const thumbnail = (typeof data.thumbnail === 'string' && data.thumbnail.trim().length > 0)
        ? data.thumbnail.trim()
        : null;

    const channel = (typeof data.channel === 'string' && data.channel.trim().length > 0)
        ? data.channel.trim()
        : (typeof data.uploader === 'string' && data.uploader.trim().length > 0 ? data.uploader.trim() : 'Unknown');

    return {
        title,
        duration,
        thumbnail,
        channel,
        videoId: safeVideoId,
        isFallback: !rawTitle
    };
}

/**
 * Pure metadata fetcher calling /api/info with timeout and abort support.
 * Returns { success: boolean, data?: object, error?: string }
 */
async function fetchTrackMetadata(targetUrl, signal) {
    const infoUrl = `/api/info?url=${encodeURIComponent(targetUrl)}`;
    const internalTimeout = new AbortController();
    const timeoutId = setTimeout(() => internalTimeout.abort(), 15000);

    const abortHandler = () => internalTimeout.abort();
    if (signal) {
        signal.addEventListener('abort', abortHandler);
    }

    try {
        const response = await fetch(infoUrl, { signal: internalTimeout.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errJson.error || `HTTP ${response.status}`
            };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (err) {
        clearTimeout(timeoutId);
        return {
            success: false,
            error: err.name === 'AbortError' ? 'Metadata request timed out or was cancelled' : err.message
        };
    } finally {
        if (signal) {
            signal.removeEventListener('abort', abortHandler);
        }
    }
}

// Request generation and active controller for race/stale protection
let activeMetadataController = null;
let currentMetadataRequestId = 0;

/**
 * Refactored Single YouTube Song Workflow
 * Responsibilities: URL validation -> Metadata fetching -> Track creation -> Immediate UI binding -> Audio stream playback
 */
async function loadSingleYouTubeTrack(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) return;

    // 1. Validate URL upfront using URL API
    const validation = validateYouTubeUrl(rawUrl);
    if (!validation.valid) {
        alert(validation.error);
        return; // Keep modal open for user to correct
    }

    // Modal accepted: clear single input and close modal
    if (linkInputSingle) linkInputSingle.value = '';
    if (linkModal) linkModal.classList.remove('active');

    // 2. Stale Request / Race Protection: Cancel any ongoing metadata request
    if (activeMetadataController) {
        activeMetadataController.abort();
        activeMetadataController = null;
    }

    // Generate unique request ID token
    currentMetadataRequestId++;
    const thisRequestId = currentMetadataRequestId;
    const controller = new AbortController();
    activeMetadataController = controller;

    // 3. UI Loading state: Do NOT claim song is loaded yet
    showLoadingPopup('Fetching Track Info...');

    try {
        // 4. Fetch metadata first (decoupled from audio streaming)
        const metaResult = await fetchTrackMetadata(validation.normalizedUrl, controller.signal);

        // Check if a newer request has been made while waiting
        if (thisRequestId !== currentMetadataRequestId) {
            console.log(`[SingleSong] Discarding stale response for request ID #${thisRequestId}`);
            return;
        }
        activeMetadataController = null;

        // 5. Normalize metadata or use safe fallback title
        const meta = metaResult.success
            ? normalizeMetadata(metaResult.data, validation.videoId)
            : normalizeMetadata(null, validation.videoId);

        if (!metaResult.success) {
            console.warn('[SingleSong] Metadata fetch failed or timed out:', metaResult.error, '- using fallback title:', meta.title);
        }

        // 6. Create track object
        const newTrack = {
            name: meta.title,
            url: validation.normalizedUrl,
            isStream: true,
            duration: meta.duration,
            thumbnail: meta.thumbnail,
            channel: meta.channel,
            videoId: meta.videoId,
            originalUrl: validation.originalUrl
        };

        // 7. Add track to playlist & update playlist UI
        const newTrackIndex = playlist.length;
        playlist.push(newTrack);

        if (playlist.length > 1 && btnPlaylistToggle) {
            btnPlaylistToggle.style.display = 'flex';
        }
        renderPlaylist();

        // 8. Immediate UI metadata binding (DO NOT wait for stream or native loadedmetadata)
        trackNameLabel.textContent = newTrack.name;
        currentTimeEl.textContent = '0:00';
        totalTimeEl.textContent = formatTime(newTrack.duration);
        progressBar.value = 0;
        const themePrimary = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
        progressBar.style.background = `linear-gradient(to right, rgba(${themePrimary}, 1) 0%, rgba(255, 255, 255, 0.1) 0%)`;

        // Smart marquee check for title overflow
        const titleContainer = document.querySelector('.track-title-container');
        trackNameLabel.classList.remove('is-scrolling');
        setTimeout(() => {
            if (titleContainer && trackNameLabel.scrollWidth > titleContainer.clientWidth) {
                trackNameLabel.classList.add('is-scrolling');
            }
        }, 50);

        // 9. Enable player controls
        btnPlayPause.disabled = false;
        btnLoopToggle.disabled = false;
        btnShuffle.disabled = false;
        playbackSpeedSelect.disabled = false;
        btnPrev.disabled = false;
        btnNext.disabled = false;

        // 10. Initialize audio engine (within user activation lifecycle) if required
        if (!audioCtx) initAudioEngine();

        // 11. Inform user of status
        if (meta.isFallback) {
            hideLoadingPopup('Song Info Unavailable - Streaming Directly', 2000);
        } else {
            hideLoadingPopup('Song Loaded!', 1500);
        }

        // 12. Only now invoke loadTrack() to start audio streaming (/api/stream)
        currentTrackIndex = newTrackIndex;
        loadTrack(currentTrackIndex);

    } catch (err) {
        if (thisRequestId !== currentMetadataRequestId) return;
        activeMetadataController = null;
        console.error('[SingleSong] Unexpected error in single song flow:', err);
        hideLoadingPopup(null);
        alert('Failed to process YouTube song. Please try again.');
    }
}

// Progressive playlist request cancellation & generation tracking
let activePlaylistController = null;
let currentPlaylistRequestId = 0;

/**
 * Validates a YouTube playlist URL.
 * Requires valid YouTube domain and the presence of a 'list' parameter.
 */
function validateYouTubePlaylistUrl(urlInput) {
    if (!urlInput || typeof urlInput !== 'string' || !urlInput.trim()) {
        return { valid: false, error: 'Please enter a YouTube playlist URL.' };
    }
    let trimmed = urlInput.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
        trimmed = 'https://' + trimmed;
    }

    try {
        const parsed = new URL(trimmed);
        const hostname = parsed.hostname.toLowerCase();
        const validHosts = ['youtube.com', 'www.youtube.com', 'music.youtube.com', 'youtu.be', 'm.youtube.com'];
        const isValidHost = validHosts.includes(hostname) || hostname.endsWith('.youtube.com');
        if (!isValidHost) {
            return {
                valid: false,
                error: 'Invalid domain. Please enter a valid YouTube playlist URL.'
            };
        }

        const rawListId = parsed.searchParams.get('list');
        const listId = rawListId ? rawListId.trim() : '';
        if (!listId) {
            return {
                valid: false,
                error: 'No playlist ID found. Ensure the YouTube link contains a "list=" parameter.'
            };
        }

        const cleanPlaylistUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}`;
        return {
            valid: true,
            playlistId: listId,
            originalUrl: urlInput.trim(),
            normalizedUrl: cleanPlaylistUrl
        };
    } catch (e) {
        return {
            valid: false,
            error: 'Malformed URL. Please enter a valid YouTube playlist link.'
        };
    }
}

/**
 * Progressive YouTube Playlist Workflow
 * Streams discovered tracks line-by-line using NDJSON (/api/playlist).
 * Appends tracks to the UI incrementally and begins playing the first track immediately if idle.
 */
async function loadProgressivePlaylist(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) return;

    // 1. Validate playlist URL upfront
    const validation = validateYouTubePlaylistUrl(rawUrl);
    if (!validation.valid) {
        alert(validation.error);
        return; // Keep modal open for user to correct
    }

    // Modal accepted: clear input and close modal
    if (linkInputPlaylist) linkInputPlaylist.value = '';
    if (linkModal) linkModal.classList.remove('active');

    // 2. Cancellation / Race Protection: Abort any ongoing playlist loading
    if (activePlaylistController) {
        console.log('[Playlist] Aborting previous active playlist request');
        activePlaylistController.abort();
        activePlaylistController = null;
    }

    // Unique generation token
    currentPlaylistRequestId++;
    const thisRequestId = currentPlaylistRequestId;
    const controller = new AbortController();
    activePlaylistController = controller;

    // 3. UI Loading state
    showLoadingPopup('Connecting to playlist...');

    let tracksLoadedInThisSession = 0;
    let firstTrackStarted = false;
    const initialPlaylistLength = playlist.length;
    let extractionCompleted = false;

    try {
        const response = await fetch('/api/playlist?url=' + encodeURIComponent(validation.normalizedUrl), {
            signal: controller.signal
        });

        if (!response.ok) {
            let errorMsg = `HTTP ${response.status}`;
            try {
                const errJson = await response.json();
                if (errJson && errJson.error) errorMsg = errJson.error;
            } catch (e) {}
            throw new Error(errorMsg);
        }

        if (!response.body) {
            throw new Error('ReadableStream not supported by browser or empty response');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            if (thisRequestId !== currentPlaylistRequestId || controller.signal.aborted) {
                console.log(`[Playlist] Ignoring incoming chunk for superseded or aborted request #${thisRequestId}`);
                reader.cancel().catch(() => {});
                return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (thisRequestId !== currentPlaylistRequestId || controller.signal.aborted) return;

                let msg;
                try {
                    msg = JSON.parse(trimmed);
                } catch (e) {
                    continue;
                }

                if (msg.type === 'init') {
                    showLoadingPopup('Discovering playlist tracks...');
                } else if (msg.type === 'track' && msg.track) {
                    const videoId = msg.track.videoId;
                    // Deduplicate against already-loaded tracks
                    const isDuplicate = playlist.some(t =>
                        (videoId && t.videoId === videoId) ||
                        (!videoId && t.url === msg.track.url)
                    );

                    if (!isDuplicate) {
                        const trackObj = {
                            name: msg.track.title,
                            url: msg.track.url,
                            videoId: msg.track.videoId,
                            duration: msg.track.duration || 0,
                            isStream: true
                        };

                        const trackIndex = playlist.length;
                        playlist.push(trackObj);
                        tracksLoadedInThisSession++;

                        // Progressively append track to UI without full DOM rebuild
                        appendPlaylistTrackUI(trackObj, trackIndex);

                        if (playlist.length > 1 && btnPlaylistToggle) {
                            btnPlaylistToggle.style.display = 'flex';
                        }

                        // Enable controls
                        btnPlayPause.disabled = false;
                        btnLoopToggle.disabled = false;
                        btnShuffle.disabled = false;
                        playbackSpeedSelect.disabled = false;
                        btnPrev.disabled = false;
                        btnNext.disabled = false;

                        // Dynamic real-time progress update
                        showLoadingPopup(`Loading playlist... (${tracksLoadedInThisSession} loaded)`);

                        // If playlist was previously empty and nothing is playing,
                        // immediately play track #1
                        if (!isPlaying && initialPlaylistLength === 0 && !firstTrackStarted) {
                            firstTrackStarted = true;
                            if (!audioCtx) initAudioEngine();
                            currentTrackIndex = 0;
                            loadTrack(0);
                        }
                    }
                } else if (msg.type === 'done') {
                    extractionCompleted = true;
                    hideLoadingPopup(`Playlist loaded! (${tracksLoadedInThisSession} tracks)`, 2000);
                } else if (msg.type === 'error') {
                    extractionCompleted = true;
                    if (msg.partial && tracksLoadedInThisSession > 0) {
                        hideLoadingPopup(`Playlist partially loaded (${tracksLoadedInThisSession} tracks)`, 3000);
                        console.warn('[Playlist] Extraction ended with error:', msg.message);
                    } else {
                        hideLoadingPopup(null);
                        alert(msg.message || 'Failed to extract playlist tracks.');
                    }
                }
            }
        }

        // Process any remainder line in buffer
        if (buffer.trim() && thisRequestId === currentPlaylistRequestId && !controller.signal.aborted) {
            try {
                const msg = JSON.parse(buffer.trim());
                if (msg.type === 'track' && msg.track) {
                    const videoId = msg.track.videoId;
                    const isDuplicate = playlist.some(t =>
                        (videoId && t.videoId === videoId) ||
                        (!videoId && t.url === msg.track.url)
                    );
                    if (!isDuplicate) {
                        const trackObj = {
                            name: msg.track.title,
                            url: msg.track.url,
                            videoId: msg.track.videoId,
                            duration: msg.track.duration || 0,
                            isStream: true
                        };
                        const trackIndex = playlist.length;
                        playlist.push(trackObj);
                        tracksLoadedInThisSession++;
                        appendPlaylistTrackUI(trackObj, trackIndex);

                        if (playlist.length > 1 && btnPlaylistToggle) {
                            btnPlaylistToggle.style.display = 'flex';
                        }

                        if (!isPlaying && initialPlaylistLength === 0 && !firstTrackStarted) {
                            firstTrackStarted = true;
                            if (!audioCtx) initAudioEngine();
                            currentTrackIndex = 0;
                            loadTrack(0);
                        }
                    }
                } else if (msg.type === 'done') {
                    extractionCompleted = true;
                    hideLoadingPopup(`Playlist loaded! (${tracksLoadedInThisSession} tracks)`, 2000);
                }
            } catch (e) {}
        }

        // If extraction closed cleanly without an explicit done or error event
        if (!extractionCompleted && thisRequestId === currentPlaylistRequestId && !controller.signal.aborted) {
            if (tracksLoadedInThisSession > 0) {
                hideLoadingPopup(`Playlist loaded! (${tracksLoadedInThisSession} tracks)`, 2000);
            } else {
                hideLoadingPopup(null);
                alert('No playable tracks found in this playlist.');
            }
        }

    } catch (err) {
        if (thisRequestId !== currentPlaylistRequestId || controller.signal.aborted || (err && err.name === 'AbortError')) {
            console.log(`[Playlist] Request #${thisRequestId} was aborted or superseded.`);
            return;
        }

        console.error('[Playlist] Error processing playlist stream:', err);
        if (tracksLoadedInThisSession > 0) {
            hideLoadingPopup(`Playlist partially loaded (${tracksLoadedInThisSession} tracks)`, 3000);
            alert(`Playlist partially loaded (${tracksLoadedInThisSession} tracks). Error: ${err.message || 'Stream ended unexpectedly'}`);
        } else {
            hideLoadingPopup(null);
            alert('Failed to load playlist. Ensure the backend proxy server is running and the URL is valid.');
        }
    } finally {
        if (activePlaylistController === controller) {
            activePlaylistController = null;
        }
    }
}

/**
 * Universal streaming URL dispatcher.
 * Preserves legacy entry points while cleanly routing single songs and playlists.
 */
async function processStreamingUrl(streamUrl, type) {
    if (!streamUrl || streamUrl.trim() === '') return;
    const isPlaylist = type === 'playlist' || streamUrl.includes('list=') || streamUrl.includes('/playlist');
    if (isPlaylist) {
        return loadProgressivePlaylist(streamUrl);
    } else {
        return loadSingleYouTubeTrack(streamUrl);
    }
}

btnLoadSong.addEventListener('click', () => {
    loadSingleYouTubeTrack(linkInputSingle.value.trim());
});

if (linkInputSingle) {
    linkInputSingle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            loadSingleYouTubeTrack(linkInputSingle.value.trim());
        }
    });
}

btnLoadPlaylist.addEventListener('click', () => {
    loadProgressivePlaylist(linkInputPlaylist.value.trim());
});

if (linkInputPlaylist) {
    linkInputPlaylist.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            loadProgressivePlaylist(linkInputPlaylist.value.trim());
        }
    });
}

// 2.5 File/Folder Upload & Playlist Logic
function processAudioFiles(files) {
    // Filter audio files only
    playlist = files.filter(file => file.type.startsWith('audio/'));
    
    if (playlist.length > 0) {
        currentTrackIndex = 0;
        
        if (playlist.length > 1) {
            btnPlaylistToggle.style.display = 'flex';
        } else {
            btnPlaylistToggle.style.display = 'none';
        }
        
        renderPlaylist();
        
        // Initialize Audio context on user gesture
        initAudioEngine();
        
        // Enable Controls
        btnPlayPause.disabled = false;
        btnLoopToggle.disabled = false;
        btnShuffle.disabled = false;
        playbackSpeedSelect.disabled = false;
        btnPrev.disabled = false;
        btnNext.disabled = false;
        
        loadTrack(currentTrackIndex);
    }
}

const customUploadModal = document.getElementById('custom-upload-modal');
const confirmBtn = document.getElementById('btn-confirm-upload');
const cancelBtn = document.getElementById('btn-cancel-upload');
const modalText = document.getElementById('upload-modal-text');

let pendingFiles = [];

const handleFileSelection = (e) => {
    if (e.target.files.length > 0) {
        const selectedFiles = Array.from(e.target.files);
        const audioFiles = selectedFiles.filter(file => file.type.startsWith('audio/'));
        
        if (audioFiles.length > 0) {
            pendingFiles = audioFiles;
            modalText.textContent = `Ready to add ${pendingFiles.length} tracks to the Visual Engine?`;
            customUploadModal.classList.add('active');
        } else {
            alert("No valid audio files found in selection.");
        }
    }
};

if (hiddenFileInput) hiddenFileInput.addEventListener('change', handleFileSelection);
if (hiddenFolderInput) hiddenFolderInput.addEventListener('change', handleFileSelection);

if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        customUploadModal.classList.remove('active');
        pendingFiles = [];
        if (hiddenFileInput) hiddenFileInput.value = '';
        if (hiddenFolderInput) hiddenFolderInput.value = '';
    });
}

if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
        customUploadModal.classList.remove('active');
        processAudioFiles(pendingFiles);
    });
}

function updatePlaylistHeader() {
    const playlistHeader = document.getElementById('playlist-header');
    if (playlistHeader) {
        playlistHeader.textContent = `PLAYLIST [${playlist.length}]`;
    }
}

function appendPlaylistTrackUI(file, index) {
    if (!playlistContainer) return;
    const li = document.createElement('li');
    li.textContent = file.name || 'YouTube Audio';
    if (index === currentTrackIndex) {
        li.classList.add('active-track');
    }
    li.addEventListener('click', () => {
        currentTrackIndex = index;
        loadTrack(currentTrackIndex);
    });
    playlistContainer.appendChild(li);
    updatePlaylistHeader();
}

function renderPlaylist() {
    if (!playlistContainer) return;
    playlistContainer.innerHTML = '';
    playlist.forEach((file, index) => {
        const li = document.createElement('li');
        li.textContent = file.name || 'YouTube Audio';
        if (index === currentTrackIndex) {
            li.classList.add('active-track');
        }
        li.addEventListener('click', () => {
            currentTrackIndex = index;
            loadTrack(currentTrackIndex);
        });
        playlistContainer.appendChild(li);
    });
    updatePlaylistHeader();
}

function preloadNextTrack(nextTrackUrl) {
    console.log("Pre-loading next track in background: " + nextTrackUrl);
    // Silent fetch triggers backend yt-dlp buffer without auto-playing here
    fetch('/api/stream?url=' + encodeURIComponent(nextTrackUrl))
        .catch(err => console.log('Preload silently failed/aborted:', err));
}

function loadTrack(index) {
    if (playlist.length === 0) return;
    
    // Revoke previous object URL to prevent memory leaks if playing continuously
    if (audioSource.src && audioSource.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioSource.src);
    }
    
    pauseAudio();
    
    const file = playlist[index];
    let fileURL;
    
    if (file.isStream) {
        // Stream from the local backend proxy
        fileURL = `/api/stream?url=${encodeURIComponent(file.url)}`;
        trackNameLabel.textContent = file.name || 'YouTube Audio';
        
        // Immediate timeline binding from metadata duration if available
        if (file.duration && isFinite(file.duration) && file.duration > 0) {
            totalTimeEl.textContent = formatTime(file.duration);
        } else {
            totalTimeEl.textContent = '0:00';
        }
        currentTimeEl.textContent = '0:00';
        progressBar.value = 0;
        
        // Clear hover waveform canvas since we cannot easily pre-render a remote stream
        const hoverCanvas = document.getElementById('waveform-hover-canvas');
        if (hoverCanvas) {
            const hCtx = hoverCanvas.getContext('2d');
            hCtx.clearRect(0, 0, hoverCanvas.width, hoverCanvas.height);
        }
    } else {
        // Local uploaded file
        fileURL = URL.createObjectURL(file);
        trackNameLabel.textContent = file.name;
        // Generate hover waveform overlay
        generateHoverWaveform(fileURL);
    }
    
    audioSource.src = fileURL;
    
    // Highlight Active Track in Playlist
    const items = playlistContainer.querySelectorAll('li');
    items.forEach(item => item.classList.remove('active-track'));
    if (items[index]) {
        items[index].classList.add('active-track');
    }
    
    // Smart Marquee Check
    const titleContainer = document.querySelector('.track-title-container');
    trackNameLabel.classList.remove('is-scrolling');
    setTimeout(() => {
        if (trackNameLabel.scrollWidth > titleContainer.clientWidth) {
            trackNameLabel.classList.add('is-scrolling');
        }
    }, 50);
    
    // Maintain playback speed
    const currentSpeed = parseFloat(playbackSpeedSelect.value === 'custom' ? customSpeedInput.value : playbackSpeedSelect.value) || 1;
    audioSource.playbackRate = Math.min(Math.max(currentSpeed, 0.1), 8.0);
    
    // Ensure loop matches state
    audioSource.loop = (loopMode === 'single');
    
    playAudio();

    // --- Smart Pre-loading ---
    // If the next track is a stream, silently ping the backend to spin up yt-dlp early
    if (!isShuffle && index + 1 < playlist.length) {
        const nextFile = playlist[index + 1];
        if (nextFile.isStream) {
            preloadNextTrack(nextFile.url);
        }
    } else if (isShuffle && playlist.length > 1) {
        // Preload a random track to anticipate shuffle
        const randomNext = (index + 1) % playlist.length; // Simplified guess
        const nextFile = playlist[randomNext];
        if (nextFile && nextFile.isStream) {
            preloadNextTrack(nextFile.url);
        }
    }
}

btnPrev.addEventListener('click', () => {
    if (playlist.length === 0) return;
    currentTrackIndex--;
    if (currentTrackIndex < 0) currentTrackIndex = playlist.length - 1;
    loadTrack(currentTrackIndex);
});

function playNextTrack() {
    if (playlist.length === 0) return;
    
    if (isShuffle && playlist.length > 1) {
        let newIndex = currentTrackIndex;
        while (newIndex === currentTrackIndex) {
            newIndex = Math.floor(Math.random() * playlist.length);
        }
        currentTrackIndex = newIndex;
        loadTrack(currentTrackIndex);
    } else {
        currentTrackIndex++;
        if (currentTrackIndex >= playlist.length) {
            if (loopMode === 'playlist') {
                currentTrackIndex = 0;
                loadTrack(currentTrackIndex);
            } else {
                currentTrackIndex = playlist.length - 1; // Stay on last
                pauseAudio();
                audioSource.currentTime = 0;
            }
        } else {
            loadTrack(currentTrackIndex);
        }
    }
}

btnNext.addEventListener('click', () => {
    playNextTrack();
});

audioSource.addEventListener('ended', () => {
    if (playlist.length > 0 && loopMode !== 'single') {
        playNextTrack();
    }
});

// Sync UI with native audio events (fixes keyboard media keys desync)
audioSource.addEventListener('play', () => {
    isPlaying = true;
    iconPlay.classList.add('hidden');
    iconPause.classList.remove('hidden');
});

audioSource.addEventListener('pause', () => {
    isPlaying = false;
    iconPause.classList.add('hidden');
    iconPlay.classList.remove('hidden');
});

// --- Timeline Logic ---
function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

audioSource.addEventListener('timeupdate', () => {
    const currentTrack = playlist[currentTrackIndex];
    // For local files, native duration is finite and valid.
    // For remote streams with chunked/live headers, fallback to metadata duration when native duration is invalid.
    const isNativeValid = isFinite(audioSource.duration) && audioSource.duration > 0;
    const duration = isNativeValid
        ? audioSource.duration
        : (currentTrack && currentTrack.duration && isFinite(currentTrack.duration) ? currentTrack.duration : 0);

    if (duration <= 0) return;
    
    const curTime = (isFinite(audioSource.currentTime) && audioSource.currentTime >= 0) ? audioSource.currentTime : 0;
    const progressPercent = Math.min(100, Math.max(0, (curTime / duration) * 100));
    progressBar.value = progressPercent;
    
    const themePrimary = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
    progressBar.style.background = `linear-gradient(to right, rgba(${themePrimary}, 1) ${progressPercent}%, rgba(255, 255, 255, 0.1) ${progressPercent}%)`;
    
    currentTimeEl.textContent = formatTime(curTime);
    totalTimeEl.textContent = formatTime(duration);
});

progressBar.addEventListener('input', () => {
    const currentTrack = playlist[currentTrackIndex];
    const isNativeValid = isFinite(audioSource.duration) && audioSource.duration > 0;
    const duration = isNativeValid
        ? audioSource.duration
        : (currentTrack && currentTrack.duration && isFinite(currentTrack.duration) ? currentTrack.duration : 0);

    if (!duration || !isFinite(duration) || duration <= 0) return;

    const percent = parseFloat(progressBar.value);
    if (isNaN(percent) || !isFinite(percent)) return;

    const seekTime = (percent / 100) * duration;
    if (isFinite(seekTime) && seekTime >= 0) {
        try {
            audioSource.currentTime = seekTime;
        } catch (seekErr) {
            console.warn('[AudioPlayer] Defensive seek failed safely:', seekErr);
        }
    }
});

// Update duration when native metadata is loaded if finite
audioSource.addEventListener('loadedmetadata', () => {
    const currentTrack = playlist[currentTrackIndex];
    if (isFinite(audioSource.duration) && audioSource.duration > 0) {
        totalTimeEl.textContent = formatTime(audioSource.duration);
    } else if (currentTrack && currentTrack.duration > 0) {
        totalTimeEl.textContent = formatTime(currentTrack.duration);
    }
});

// 3. Play/Pause
btnPlayPause.addEventListener('click', () => {
    if (!audioCtx) initAudioEngine();
    
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    if (isPlaying) {
        pauseAudio();
    } else {
        playAudio();
    }
});


// 3.6 Playback Speed
playbackSpeedSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
        customSpeedInput.style.display = 'block';
        const customVal = parseFloat(customSpeedInput.value) || 1;
        audioSource.playbackRate = Math.min(Math.max(customVal, 0.1), 8.0);
    } else {
        customSpeedInput.style.display = 'none';
        audioSource.playbackRate = parseFloat(val);
    }
});

customSpeedInput.addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) return;
    val = Math.min(Math.max(val, 0.1), 8.0);
    audioSource.playbackRate = val;
});

function playAudio() {
    audioSource.play();
}

function pauseAudio() {
    audioSource.pause();
}

// 4. Playback Mode Logic (Shuffle/Loop)
function updatePlaybackUI() {
    const primary = `rgba(${getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim()}, 1)`;
    const glow = `drop-shadow(0 0 8px rgba(${getComputedStyle(document.documentElement).getPropertyValue('--theme-glow').trim()}, 0.6))`;

    if (isShuffle) {
        btnShuffle.style.color = primary;
        btnShuffle.style.filter = glow;
    } else {
        btnShuffle.style.color = '';
        btnShuffle.style.filter = '';
    }

    if (loopMode === 'none') {
        btnLoopToggle.style.color = '';
        btnLoopToggle.style.filter = '';
        loopBadgeText.classList.add('hidden');
    } else if (loopMode === 'playlist') {
        btnLoopToggle.style.color = primary;
        btnLoopToggle.style.filter = glow;
        loopBadgeText.textContent = '•';
        loopBadgeText.classList.remove('hidden');
    } else if (loopMode === 'single') {
        btnLoopToggle.style.color = primary;
        btnLoopToggle.style.filter = glow;
        loopBadgeText.textContent = '1';
        loopBadgeText.classList.remove('hidden');
    }
}

btnShuffle.addEventListener('click', () => {
    isShuffle = !isShuffle;
    updatePlaybackUI();
});

btnLoopToggle.addEventListener('click', () => {
    if (loopMode === 'none') loopMode = 'playlist';
    else if (loopMode === 'playlist') loopMode = 'single';
    else loopMode = 'none';
    
    updatePlaybackUI();
    audioSource.loop = (loopMode === 'single');
});

// 5. Mode Selection
modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentMode = e.target.value;
        
        // Hard clear the canvas to prevent ghosting between modes
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (currentMode === 'swarm') {
            initParticles();
        } else if (currentMode === 'warpdrive') {
            initWarpStars();
        }
    });
});

// 5. Sensitivity Slider
sensitivitySlider.addEventListener('input', (e) => {
    sensitivity = parseFloat(e.target.value);
});

// 5.5 Effects Sidebar Toggle
btnEffectsToggle.addEventListener('click', () => {
    const isOpen = effectsPanel.classList.toggle('open');
    btnEffectsToggle.classList.toggle('active', isOpen);
});

// 6. EQ Sidebar Toggle
btnEqToggle.addEventListener('click', () => {
    const isOpen = eqSidebar.classList.toggle('open');
    btnEqToggle.classList.toggle('active', isOpen);
});

btnEqClose.addEventListener('click', () => {
    eqSidebar.classList.remove('open');
    btnEqToggle.classList.remove('active');
});

// 6.2 Playlist Sidebar Toggle
btnPlaylistToggle.addEventListener('click', () => {
    const isOpen = playlistSidebar.classList.toggle('open');
    btnPlaylistToggle.classList.toggle('active', isOpen);
});

// 6.3 Custom EQ Dropdown Logic
customEqTrigger.addEventListener('click', () => {
    customEqDropdown.classList.toggle('open');
});

const customEqOptionItems = customEqOptions.querySelectorAll('li');
customEqOptionItems.forEach(item => {
    item.addEventListener('click', () => {
        // Update trigger text
        customEqTrigger.querySelector('span').textContent = item.textContent;
        
        // Update selected class
        customEqOptionItems.forEach(li => li.classList.remove('selected'));
        item.classList.add('selected');
        
        // Update native select and trigger change event
        eqPresetSelect.value = item.getAttribute('data-value');
        eqPresetSelect.dispatchEvent(new Event('change'));
        
        // Close dropdown
        customEqDropdown.classList.remove('open');
    });
});

// 6.5 Global Click-Outside to Close Side Panels
document.addEventListener('click', (event) => {
    const clickedInsideEffects = effectsPanel.contains(event.target) || btnEffectsToggle.contains(event.target);
    const clickedInsideEQ = eqSidebar.contains(event.target) || btnEqToggle.contains(event.target);
    const clickedInsidePlaylist = playlistSidebar.contains(event.target) || btnPlaylistToggle.contains(event.target);
    const clickedInsideCustomEQ = customEqDropdown.contains(event.target);

    // If clicked outside Effects panel while it's open, close it
    if (!clickedInsideEffects && effectsPanel.classList.contains('open')) {
        effectsPanel.classList.remove('open');
        btnEffectsToggle.classList.remove('active');
    }

    // If clicked outside EQ sidebar while it's open, close it
    if (!clickedInsideEQ && eqSidebar.classList.contains('open')) {
        eqSidebar.classList.remove('open');
        btnEqToggle.classList.remove('active');
    }

    // If clicked outside Playlist sidebar while it's open, close it
    if (!clickedInsidePlaylist && playlistSidebar.classList.contains('open')) {
        playlistSidebar.classList.remove('open');
        btnPlaylistToggle.classList.remove('active');
    }
    
    // If clicked outside Custom EQ Dropdown while it's open, close it
    if (!clickedInsideCustomEQ && customEqDropdown.classList.contains('open')) {
        customEqDropdown.classList.remove('open');
    }
});

// 7. EQ Band Slider Data Binding (0-100 scale → dB mapping)
function updateEqSliderLabel(bandId, dbValue) {
    const label = document.getElementById(`eq-val-${bandId}`);
    if (label) {
        const rounded = Math.round(dbValue * 10) / 10;
        label.textContent = `${rounded > 0 ? '+' : ''}${rounded} dB`;
    }
}

EQ_BANDS.forEach((band, index) => {
    const slider = document.getElementById(`eq-${band.id}`);
    if (!slider) return;

    slider.addEventListener('input', (e) => {
        const sliderVal = parseFloat(e.target.value);
        const dbVal = sliderToDb(sliderVal);
        if (eqFilters[index]) {
            eqFilters[index].gain.value = dbVal;
        }
        updateEqSliderLabel(band.id, dbVal);
        // Switch preset dropdown to "Custom" when user manually adjusts
        eqPresetSelect.value = 'custom';
    });
});

// 8. EQ Preset Dropdown
function applyPreset(presetName) {
    const sliderValues = EQ_PRESETS[presetName];
    if (!sliderValues) return;

    EQ_BANDS.forEach((band, index) => {
        const slider = document.getElementById(`eq-${band.id}`);
        const sliderVal = sliderValues[index];
        const dbVal = sliderToDb(sliderVal);

        if (slider) {
            slider.value = sliderVal;
            updateEqSliderLabel(band.id, dbVal);
        }
        if (eqFilters[index]) {
            eqFilters[index].gain.value = dbVal;
        }
    });
}

eqPresetSelect.addEventListener('change', (e) => {
    if (e.target.value !== 'custom') {
        applyPreset(e.target.value);
    }
});


// --- Render Engine & Visual Modes ---

// Mode B: Swarm Setup
const NUM_PARTICLES = 150;
let particles = [];

function initParticles() {
    particles = [];
    for (let i = 0; i < NUM_PARTICLES; i++) {
        createParticle();
    }
}

function createParticle() {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;
    particles.push({
        x: w / 2,
        y: h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        baseVx: Math.cos(angle) * speed,
        baseVy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 1.5,
        hue: Math.floor(Math.random() * 360),
        alpha: Math.random() * 0.5 + 0.5,
        life: Math.random() * 100 + 50
    });
}

// Mode C: Warp Drive Setup
const NUM_WARP_STARS = 300;
let warpStars = [];

function initWarpStars() {
    warpStars = [];
    for (let i = 0; i < NUM_WARP_STARS; i++) {
        const z = Math.random() * w + 1;
        warpStars.push({
            x: (Math.random() - 0.5) * w,
            y: (Math.random() - 0.5) * h,
            z: z,
            pz: z
        });
    }
}

function getAverageFrequency(start, end) {
    if (!dataArray) return 0;
    const safeEnd = Math.min(end, analyser.frequencyBinCount);
    let sum = 0;
    for (let i = start; i < safeEnd; i++) {
        sum += dataArray[i];
    }
    return sum / (safeEnd - start);
}

function getRenderColorParams(currentMode, elementIndex, totalElements, timeElapsed) {
    const overrideToggle = document.getElementById('color-override-toggle');
    const isOverrideOn = overrideToggle ? overrideToggle.checked : false;
    const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
    
    const multiColorModes = ['mandala', 'swarm', 'neonbars'];
    
    if (!isOverrideOn && multiColorModes.includes(currentMode)) {
        const hue = ((elementIndex / totalElements) * 360 + (timeElapsed * 50)) % 360;
        return { isSpectrum: true, hue: hue, rgb: themeColor };
    } else {
        return { isSpectrum: false, rgb: themeColor };
    }
}

// Draw Mandala Mode
function drawMandala(bassAvg) {
    const cx = w / 2;
    const cy = h / 2;
    const numSpokes = 64;
    
    // Bass scales the base radius
    const baseRadius = Math.min(w, h) * 0.15 + (bassAvg * sensitivity * 0.5);
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    const timeElapsed = performance.now() / 1000;

    for (let i = 0; i < numSpokes; i++) {
        const angle = (i * (Math.PI * 2)) / numSpokes;
        
        // Map spoke to frequency bin safely (0 to 255)
        const binIndex = Math.min(Math.floor((i / numSpokes) * analyser.frequencyBinCount), analyser.frequencyBinCount - 1);
        const freqVal = dataArray ? dataArray[binIndex] : 0;
        
        // Mid-to-high drives length
        const extrusion = freqVal * sensitivity * 1.2;
        const finalRadius = baseRadius + extrusion;
        
        const x1 = cx + Math.cos(angle) * baseRadius;
        const y1 = cy + Math.sin(angle) * baseRadius;
        const x2 = cx + Math.cos(angle) * finalRadius;
        const y2 = cy + Math.sin(angle) * finalRadius;
        
        const alpha = 0.4 + (freqVal / 255) * 0.6;
        const cParams = getRenderColorParams('mandala', i, numSpokes, timeElapsed);
        
        if (cParams.isSpectrum) {
            ctx.strokeStyle = `hsla(${cParams.hue}, 100%, 60%, ${alpha})`;
        } else {
            ctx.strokeStyle = `rgba(${cParams.rgb}, ${alpha})`;
        }
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    
    // Draw central connecting ring
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    const ringAlpha = 0.2 + (bassAvg/255)*0.5;
    const ringCParams = getRenderColorParams('mandala', 0, 1, timeElapsed);
    if (ringCParams.isSpectrum) {
        ctx.strokeStyle = `hsla(${(timeElapsed * 50) % 360}, 100%, 60%, ${ringAlpha})`;
    } else {
        ctx.strokeStyle = `rgba(${ringCParams.rgb}, ${ringAlpha})`;
    }
    ctx.stroke();
}

// Draw Swarm Mode
function drawSwarm(bassAvg, highAvg) {
    const bassMultiplier = 1 + (bassAvg / 255) * sensitivity * 3;
    const highActive = highAvg > 100; // Transient threshold
    const timeElapsed = performance.now() / 1000;

    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        
        // Update positions (bass volume multiplies velocity)
        p.x += p.baseVx * bassMultiplier;
        p.y += p.baseVy * bassMultiplier;
        p.life--;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        
        const cParams = getRenderColorParams('swarm', i, particles.length, timeElapsed);
        if (cParams.isSpectrum) {
            // Swarm particles have an intrinsic hue assigned at birth, so we can use that for a chaotic rainbow
            ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.alpha})`;
        } else {
            ctx.fillStyle = `rgba(${cParams.rgb}, ${p.alpha})`;
        }
        ctx.fill();

        // Check bounds or dead
        const outOfBounds = (p.x < 0 || p.x > w || p.y < 0 || p.y > h);
        
        // High frequencies reset dead/out-of-bounds particles with vibrant hues
        if ((outOfBounds || p.life <= 0) && highActive) {
            // Reset to center
            p.x = w / 2;
            p.y = h / 2;
            // Altered vibrant hue driven by high frequencies
            p.hue = (highAvg * sensitivity * 2 + Math.random() * 60) % 360;
            p.life = Math.random() * 100 + 50;
            // New direction
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 1;
            p.baseVx = Math.cos(angle) * speed;
            p.baseVy = Math.sin(angle) * speed;
        } else if (outOfBounds || p.life <= 0) {
             // Normal reset if high isn't active
            p.x = w / 2;
            p.y = h / 2;
            p.life = Math.random() * 100 + 50;
        }
    }
}

// Main 60 FPS Render Loop
function renderLoop() {
    animationId = requestAnimationFrame(renderLoop);

    // CRITICAL GUARD CLAUSE: Do not attempt to process audio data if the analyser isn't ready
    if (!analyser || typeof analyser.frequencyBinCount === 'undefined') return;

    // Update activeThemeColor and activeThemeGlow from CSS variables dynamically
    const computedStyle = getComputedStyle(document.documentElement);
    const themePrimary = computedStyle.getPropertyValue('--theme-primary').trim();
    const themeGlow = computedStyle.getPropertyValue('--theme-glow').trim();
    activeThemeColor = `rgb(${themePrimary})`;
    activeThemeGlow = `rgb(${themeGlow})`;

    // 1. Reset composite operation to default so clearing works
    ctx.globalCompositeOperation = 'source-over'; 

    // 2. Reset shadows so they don't accidentally apply to the background
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Motion Blur Effect
    if (currentMode === 'warpdrive' || currentMode === 'synthwave') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    } else if (currentMode === 'nebula') {
        ctx.fillStyle = 'rgba(10, 10, 12, 0.08)';
    } else {
        ctx.fillStyle = 'rgba(10, 10, 12, 0.15)';
    }
    ctx.fillRect(0, 0, w, h);

    if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        analyser.getByteTimeDomainData(timeDataArray);
    } else if (analyser) {
        // Slowly drop to zero if paused
        for(let i=0; i<dataArray.length; i++) {
            dataArray[i] = Math.max(0, dataArray[i] - 5);
        }
        for(let i=0; i<timeDataArray.length; i++) {
            // time domain rests at 128
            timeDataArray[i] = timeDataArray[i] > 128 ? Math.max(128, timeDataArray[i] - 5) : Math.min(128, timeDataArray[i] + 5);
        }
    }

    // Averages
    const bassAvg = getAverageFrequency(0, 15);
    const highAvg = getAverageFrequency(180, 255); // high bins

    // Render Mode
    switch (currentMode) {
        case 'mandala':
            drawMandala(bassAvg);
            break;
        case 'swarm':
            if (particles.length === 0) initParticles();
            drawSwarm(bassAvg, highAvg);
            break;
        case 'oscilloscope':
            drawOscilloscope();
            break;
        case 'neonbars':
            drawNeonBars();
            break;
        case 'warpdrive':
            if (warpStars.length === 0) initWarpStars();
            drawWarpDrive(bassAvg);
            break;
        case 'synthwave':
            drawSynthwaveGrid(bassAvg);
            break;
        case 'plexus':
            if (plexusNodes.length === 0) initPlexusNodes();
            drawAudioPlexus(bassAvg);
            break;
        case 'fractal':
            drawFractalEcho(bassAvg);
            break;
        case 'nebula':
            drawLiquidNebula(bassAvg);
            break;
    }
}

// Oscilloscope Mode
function drawOscilloscope() {
    const themePrimary = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
    const themeGlow = getComputedStyle(document.documentElement).getPropertyValue('--theme-glow').trim();
    
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = `rgba(${themePrimary}, 0.9)`;
    ctx.shadowBlur = 10;
    ctx.shadowColor = `rgba(${themeGlow}, 0.8)`;
    
    ctx.beginPath();
    
    const sliceWidth = w / timeDataArray.length;
    let x = 0;
    
    for (let i = 0; i < timeDataArray.length; i++) {
        const v = (timeDataArray[i] / 128.0) - 1; // Map 0-255 to -1 to 1
        const y = (h / 2) + (v * (h / 3) * sensitivity);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow
}

// Neon Spectrum Bars
function drawNeonBars() {
    const barWidth = (w / dataArray.length) * 2.5;
    let x = 0;
    const timeElapsed = performance.now() / 1000;
    
    ctx.shadowBlur = 15;
    
    for (let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i] * sensitivity * 1.5;
        const alpha = 0.6 + (dataArray[i] / 255) * 0.4;
        
        const cParams = getRenderColorParams('neonbars', i, dataArray.length, timeElapsed);
        
        if (cParams.isSpectrum) {
            ctx.fillStyle = `hsla(${cParams.hue}, 100%, 60%, ${alpha})`;
            ctx.shadowColor = `hsla(${cParams.hue}, 100%, 60%, 0.8)`;
        } else {
            const themeGlow = getComputedStyle(document.documentElement).getPropertyValue('--theme-glow').trim();
            ctx.fillStyle = `rgba(${cParams.rgb}, ${alpha})`;
            ctx.shadowColor = `rgba(${themeGlow}, 0.8)`;
        }
        
        // Draw from bottom up
        ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
        
        x += barWidth;
    }
    ctx.shadowBlur = 0; // Reset shadow
}

// Warp Drive (3D Starfield)
function drawWarpDrive(bassAvg) {
    const speed = 2 + (bassAvg * 0.2);
    
    ctx.beginPath();
    
    for (let i = 0; i < warpStars.length; i++) {
        let star = warpStars[i];
        
        star.z -= speed;
        
        if (star.z < 1) {
            star.z = w;
            star.x = (Math.random() - 0.5) * w;
            star.y = (Math.random() - 0.5) * h;
            star.pz = star.z;
        }
        
        let sx = (star.x / star.z) * w + w / 2;
        let sy = (star.y / star.z) * h + h / 2;
        
        let px = (star.x / star.pz) * w + w / 2;
        let py = (star.y / star.pz) * h + h / 2;
        
        star.pz = star.z;
        
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
    }
    
    ctx.strokeStyle = activeThemeColor;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = activeThemeGlow;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

// =============================================
// MODE A: Synthwave Grid (3D Retro Floor)
// =============================================
let synthwaveOffset = 0;

function drawSynthwaveGrid(bassAvg) {
    const horizonY = h * 0.35;
    const vanishX = w / 2;
    const gridLines = 20;
    const perspectiveLines = 16;
    const speed = 1.5 + bassAvg * 0.15;

    synthwaveOffset = (synthwaveOffset + speed) % (h * 0.06);

    ctx.save();

    // Draw perspective lines (radiating from vanishing point)
    ctx.strokeStyle = `rgba(${getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim()}, 0.25)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < perspectiveLines; i++) {
        const xBottom = (i / (perspectiveLines - 1)) * w;
        ctx.moveTo(vanishX, horizonY);
        ctx.lineTo(xBottom, h);
    }
    ctx.stroke();

    // Draw horizontal grid lines with audio distortion
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = activeThemeGlow;
    ctx.strokeStyle = activeThemeColor;

    for (let i = 0; i < gridLines; i++) {
        const t = (i / gridLines + synthwaveOffset / (h * 0.06) / gridLines) % 1;
        // Exponential spacing for perspective
        const yBase = horizonY + Math.pow(t, 1.8) * (h - horizonY);

        // Audio distortion — sample bass frequencies
        const freqIndex = Math.floor((i / gridLines) * 30);
        const audioVal = dataArray ? (dataArray[freqIndex] || 0) / 255 : 0;
        const distortion = audioVal * 30 * sensitivity;

        const alpha = Math.min(1, 0.2 + t * 0.8);
        ctx.strokeStyle = `rgba(${getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim()}, ${alpha})`;

        ctx.beginPath();
        const segments = 40;
        for (let s = 0; s <= segments; s++) {
            const sx = (s / segments) * w;
            // Sine-wave distortion modulated by audio
            const wave = Math.sin((s / segments) * Math.PI * 4 + synthwaveOffset * 0.1) * distortion;
            const sy = yBase - wave;
            if (s === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
    }

    // Horizon glow line
    ctx.shadowBlur = 20;
    ctx.shadowColor = activeThemeGlow;
    ctx.strokeStyle = activeThemeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(w, horizonY);
    ctx.stroke();

    // Sun circle at horizon
    const sunRadius = 40 + bassAvg * 0.5;
    const sunGrad = ctx.createRadialGradient(vanishX, horizonY, 0, vanishX, horizonY, sunRadius);
    sunGrad.addColorStop(0, `rgba(${getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim()}, 0.8)`);
    sunGrad.addColorStop(0.5, `rgba(${getComputedStyle(document.documentElement).getPropertyValue('--theme-glow').trim()}, 0.3)`);
    sunGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(vanishX, horizonY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
}

// =============================================
// MODE B: Audio Plexus (Connected Nodes)
// =============================================
let plexusNodes = [];
const PLEXUS_COUNT = 90;
const PLEXUS_CONNECT_DIST = 150;

function initPlexusNodes() {
    plexusNodes = [];
    for (let i = 0; i < PLEXUS_COUNT; i++) {
        plexusNodes.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 1.2,
            vy: (Math.random() - 0.5) * 1.2,
            radius: Math.random() * 2 + 1.5,
        });
    }
}

function drawAudioPlexus(bassAvg) {
    const primaryRGB = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
    const glowRGB = getComputedStyle(document.documentElement).getPropertyValue('--theme-glow').trim();

    // Overall audio energy
    let totalEnergy = 0;
    const sampleSize = dataArray ? Math.min(dataArray.length, 128) : 0;
    for (let i = 0; i < sampleSize; i++) {
        totalEnergy += dataArray[i];
    }
    const avgEnergy = sampleSize > 0 ? totalEnergy / sampleSize / 255 : 0;

    const bassBoost = bassAvg > 40 ? 1.5 : 1;

    // Update positions
    for (let i = 0; i < plexusNodes.length; i++) {
        const p = plexusNodes[i];
        p.x += p.vx * bassBoost;
        p.y += p.vy * bassBoost;

        // Bounce off walls
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        p.x = Math.max(0, Math.min(w, p.x));
        p.y = Math.max(0, Math.min(h, p.y));
    }

    // Draw connections
    const lineAlpha = 0.05 + avgEnergy * 0.45;
    for (let i = 0; i < plexusNodes.length; i++) {
        for (let j = i + 1; j < plexusNodes.length; j++) {
            const dx = plexusNodes[i].x - plexusNodes[j].x;
            const dy = plexusNodes[i].y - plexusNodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < PLEXUS_CONNECT_DIST) {
                const proximity = 1 - dist / PLEXUS_CONNECT_DIST;
                ctx.beginPath();
                ctx.moveTo(plexusNodes[i].x, plexusNodes[i].y);
                ctx.lineTo(plexusNodes[j].x, plexusNodes[j].y);
                ctx.strokeStyle = `rgba(${primaryRGB}, ${proximity * lineAlpha})`;
                ctx.lineWidth = proximity * 1.5;
                ctx.stroke();
            }
        }
    }

    // Draw nodes
    ctx.shadowBlur = 12;
    ctx.shadowColor = `rgba(${glowRGB}, 0.8)`;
    for (let i = 0; i < plexusNodes.length; i++) {
        const p = plexusNodes[i];
        const nodeAlpha = 0.4 + avgEnergy * 0.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + avgEnergy * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${primaryRGB}, ${nodeAlpha})`;
        ctx.fill();
    }
    ctx.shadowBlur = 0;
}

// =============================================
// MODE C: Fractal Echo (Geometric Tunnel)
// =============================================
let fractalAngle = 0;

function drawFractalEcho(bassAvg) {
    const primaryRGB = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
    const glowRGB = getComputedStyle(document.documentElement).getPropertyValue('--theme-glow').trim();

    const cx = w / 2;
    const cy = h / 2;
    const maxRadius = Math.min(w, h) * 0.48;
    const ringCount = 18;
    const sides = 6; // Hexagons

    // Mid-range frequency for gap pulsing
    const midAvg = getAverageFrequency(40, 100);
    const gapScale = 1 + midAvg * 0.01;

    fractalAngle += 0.008 + bassAvg * 0.0003;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowBlur = 12;
    ctx.shadowColor = `rgba(${glowRGB}, 0.6)`;

    for (let ring = 0; ring < ringCount; ring++) {
        const t = ring / ringCount;
        const radius = maxRadius * (1 - Math.pow(t, 0.7)) * gapScale;
        if (radius < 8) continue;

        // Even = clockwise, Odd = counter-clockwise
        const direction = ring % 2 === 0 ? 1 : -1;
        const rotationSpeed = direction * fractalAngle * (1 + ring * 0.15);

        // Audio-reactive line thickness
        const freqIdx = Math.floor(t * 60);
        const audioVal = dataArray ? (dataArray[freqIdx] || 0) / 255 : 0;
        const lineWidth = 0.5 + audioVal * 2.5;

        const alpha = 0.15 + (1 - t) * 0.7;

        ctx.beginPath();
        for (let s = 0; s <= sides; s++) {
            const angle = (s / sides) * Math.PI * 2 + rotationSpeed;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${primaryRGB}, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
}

// =============================================
// MODE D: Liquid Nebula (Organic Soundwaves)
// =============================================
let nebulaTime = 0;

function drawLiquidNebula(bassAvg) {
    const primaryRGB = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
    const glowRGB = getComputedStyle(document.documentElement).getPropertyValue('--theme-glow').trim();

    const cx = w / 2;
    const cy = h / 2;
    const blobCount = 5;

    nebulaTime += 0.012;

    // Frequency bands
    const bass = getAverageFrequency(0, 15) / 255;
    const lowMid = getAverageFrequency(15, 60) / 255;
    const highMid = getAverageFrequency(60, 120) / 255;
    const bands = [bass, lowMid, highMid, (bass + lowMid) / 2, (lowMid + highMid) / 2];

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let b = 0; b < blobCount; b++) {
        const band = bands[b];
        const phase = nebulaTime + b * 1.2;

        // Organic movement offsets
        const offsetX = Math.sin(phase * 0.7) * (100 + band * 120);
        const offsetY = Math.cos(phase * 0.9) * (80 + band * 100);
        const bx = cx + offsetX;
        const by = cy + offsetY;

        // Audio-reactive radius
        const baseRadius = Math.min(w, h) * 0.12;
        const radius = baseRadius + band * baseRadius * 1.8;

        // Radial gradient for soft glow
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, radius);
        const alpha = 0.15 + band * 0.35;
        grad.addColorStop(0, `rgba(${b % 2 === 0 ? primaryRGB : glowRGB}, ${Math.min(alpha + 0.1, 0.6)})`);
        grad.addColorStop(0.4, `rgba(${primaryRGB}, ${alpha * 0.6})`);
        grad.addColorStop(1, 'transparent');

        ctx.beginPath();
        // Draw bezier blob instead of perfect circle
        const points = 8;
        for (let p = 0; p <= points; p++) {
            const a1 = (p / points) * Math.PI * 2;
            const a2 = ((p + 1) / points) * Math.PI * 2;

            // Wobble the radius per-point
            const wobble1 = 1 + Math.sin(phase * 2 + p * 0.8) * 0.25 * band;
            const wobble2 = 1 + Math.sin(phase * 2 + (p + 1) * 0.8) * 0.25 * band;

            const r1 = radius * wobble1;
            const r2 = radius * wobble2;

            const x1 = bx + Math.cos(a1) * r1;
            const y1 = by + Math.sin(a1) * r1;
            const x2 = bx + Math.cos(a2) * r2;
            const y2 = by + Math.sin(a2) * r2;

            // Control point offset for organic curves
            const cpDist = r1 * 0.55;
            const cpx = bx + Math.cos((a1 + a2) / 2) * cpDist * (1 + band * 0.5);
            const cpy = by + Math.sin((a1 + a2) / 2) * cpDist * (1 + band * 0.5);

            if (p === 0) ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(cpx, cpy, x2, y2);
        }
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

// Initial mode setup
if (currentMode === 'swarm') initParticles();

// ---------------- 3D Velocity Motion Entrance ----------------
document.addEventListener('DOMContentLoaded', () => {
    const title = document.querySelector('.main-headline');
    const subtitle = document.querySelector('.sub-headline');
    const button = document.querySelector('.cta-container');
    const environmentElements = document.querySelectorAll('.asteroid-wrapper, .hyper-diamond-container');

    // 1. Text Velocity Whip (Split letters)
    if (title) {
        const text = title.textContent.trim();
        title.innerHTML = ''; 
        text.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char;
            span.className = 'velocity-letter';
            span.style.animationDelay = `${0.6 + (index * 0.05)}s`;
            title.appendChild(span);
        });
    }

    // 1b. Subtitle & Button (Glides up to finish: 1.2s - 1.4s delay)
    if (subtitle) {
        subtitle.style.opacity = '0';
        subtitle.style.animation = 'velocityFadeUp 1.2s cubic-bezier(0.075, 0.82, 0.165, 1) forwards 1.2s';
    }
    if (button) {
        button.style.opacity = '0';
        button.style.animation = 'velocityFadeUp 1.2s cubic-bezier(0.075, 0.82, 0.165, 1) forwards 1.4s';
    }

    // 2. Background Elements Enter
    if (environmentElements) {
        environmentElements.forEach((el, index) => {
            const delay = 0.7 + (index * 0.15);
            el.style.animation = `environmentEnter 2s cubic-bezier(0.16, 1, 0.3, 1) forwards ${delay}s, aliveDrift 9s ease-in-out infinite ${delay + 2}s`;
        });
    }
});

// ---------------- Personalization Engine ----------------
document.addEventListener('DOMContentLoaded', () => {
    const colorPicker = document.getElementById('custom-color-picker');
    const colorToggle = document.getElementById('color-override-toggle');
    const bgUpload = document.getElementById('custom-bg-upload');
    const mediaLayer = document.getElementById('custom-media-layer');
    const visualizerToggle = document.getElementById('visualizer-toggle');
    const canvas = document.getElementById('visualizer-canvas');

    // Feature 1: Custom Color Override
    if (colorToggle && colorPicker) {
        // Function to handle the actual color override state
        const handleColorOverride = () => {
            if (colorToggle.checked) {
                // ON: Force the custom color
                document.documentElement.style.setProperty('--theme-primary', hexToRgb(colorPicker.value));
            } else {
                // OFF: Revert to the time-based color
                
                // Fallback: remove the inline style to let CSS take over if applicable
                document.documentElement.style.removeProperty('--theme-primary'); 
                
                // Revert to time-based color immediately
                activeThemeHour = -1; // Reset active theme hour to force update
                setDynamicTheme(new Date().getHours());
            }
        };

        colorToggle.addEventListener('change', (e) => {
            handleColorOverride(e);
            if (typeof drawWaveformBars === 'function') drawWaveformBars();
        });

        colorPicker.addEventListener('input', (e) => {
            // Only change live if the override toggle is actually ON
            if (colorToggle.checked) {
                document.documentElement.style.setProperty('--theme-primary', hexToRgb(e.target.value));
                if (typeof drawWaveformBars === 'function') drawWaveformBars();
            }
        });
    }

    // Feature 2 & 3: Custom Photo/Video Background
    if (bgUpload && mediaLayer) {
        bgUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const fileURL = URL.createObjectURL(file);
            mediaLayer.innerHTML = '';
            mediaLayer.style.opacity = '1';

            if (file.type.startsWith('video/')) {
                const vid = document.createElement('video');
                vid.src = fileURL;
                vid.autoplay = true; 
                vid.preload = 'none'; // Only load when necessary
                
                // 1. DEEP MUTE (Stops the music player from fighting it)
                vid.muted = true; 
                vid.defaultMuted = true;
                vid.volume = 0; 
                vid.setAttribute('muted', '');
                
                // 2. NATIVE LOOPING
                vid.loop = true; 
                vid.setAttribute('loop', ''); 
                vid.setAttribute('playsinline', '');
                
                // 3. GPU ACCELERATION (Fixes the micro-stutters)
                vid.style.willChange = 'transform, opacity';
                vid.style.transform = 'translateZ(0)'; // Forces hardware acceleration
                vid.style.backfaceVisibility = 'hidden';
                
                vid.className = 'custom-media-element';
                
                // 4. CLEAN ENDED FALLBACK (No laggy timeupdate loops)
                vid.addEventListener('ended', function() {
                    this.play().catch(e => console.log("Native loop fallback:", e));
                });

                // 5. TAB VISIBILITY MANAGER
                document.addEventListener('visibilitychange', () => {
                    if (!document.hidden && document.body.contains(vid)) {
                        vid.play().catch(e => console.log("Tab resume failed:", e));
                    }
                });

                mediaLayer.appendChild(vid);
            } else if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = fileURL;
                img.decoding = 'async'; // For performance
                img.loading = 'lazy'; // For performance
                img.className = 'custom-media-element';
                mediaLayer.appendChild(img);
            }
            
            const defaultBg = document.querySelector('.background-glow');
            if (defaultBg) defaultBg.style.display = 'none';
        });
    }

    // Feature 4: Toggle Canvas Effects on/off
    if (visualizerToggle && canvas) {
        visualizerToggle.addEventListener('change', (e) => {
            canvas.style.opacity = e.target.checked ? '1' : '0';
            canvas.style.transition = 'opacity 0.3s ease';
        });
    }

    // Helper function for CSS variables
    function hexToRgb(hex) {
        let r = parseInt(hex.slice(1, 3), 16),
            g = parseInt(hex.slice(3, 5), 16),
            b = parseInt(hex.slice(5, 7), 16);
        return `${r}, ${g}, ${b}`;
    }
});

window.currentAudioChannelData = null;

async function generateHoverWaveform(audioFileUrl) {
    const canvas = document.getElementById('waveform-hover-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set canvas internal resolution to match display size for crisp lines
    canvas.width = canvas.offsetWidth * 2; 
    canvas.height = canvas.offsetHeight * 2;
    
    try {
        // 1. Fetch and decode the audio
        const response = await fetch(audioFileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        // 2. Extract PCM data from the first channel
        window.currentAudioChannelData = audioBuffer.getChannelData(0);
        
        drawWaveformBars();
        
        // Mark canvas as ready for hover
        canvas.classList.add('has-data');
        
    } catch (err) {
        console.error("Error generating waveform:", err);
    }
}

function drawWaveformBars() {
    const canvas = document.getElementById('waveform-hover-canvas');
    if (!canvas || !window.currentAudioChannelData) return;
    const ctx = canvas.getContext('2d');
    
    const channelData = window.currentAudioChannelData;
    const barWidth = 4;
    const gap = 2;
    const totalBars = Math.floor(canvas.width / (barWidth + gap));
    const step = Math.floor(channelData.length / totalBars);
    const centerY = canvas.height / 2; // The center axis
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fetch live color
    const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim() || '255, 255, 255';
    
    // Set glowing light effect
    ctx.shadowBlur = 12;
    ctx.shadowColor = `rgba(${themeColor}, 0.8)`;
    ctx.fillStyle = `rgba(${themeColor}, 1)`;
    
    for (let i = 0; i < totalBars; i++) {
        let peak = 0;
        // Find the absolute max amplitude for this chunk
        for (let j = 0; j < step; j++) {
            const val = Math.abs(channelData[(i * step) + j]);
            if (val > peak) peak = val;
        }
        
        // Calculate height and center it on the Y axis
        const height = Math.max(2, peak * canvas.height * 0.85); // 85% max height
        const x = i * (barWidth + gap);
        const y = centerY - (height / 2); // Mirrors up and down from center
        
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, [2]);
        ctx.fill();
    }
}

// CLEAN 3D PARALLAX - ONLY RUNS ONCE
document.addEventListener('DOMContentLoaded', () => {
    // Ensure we don't spawn multiple loops
    if (window.parallaxLoopRunning) return; 
    window.parallaxLoopRunning = true;

    const parentContainer = document.querySelector('.floating-container'); // Or your exact wrapper class
    if (!parentContainer) return;

    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    // Extremely lightweight tracking
    document.addEventListener('mousemove', (e) => {
        targetX = (window.innerWidth / 2 - e.pageX) / 90; 
        targetY = (window.innerHeight / 2 - e.pageY) / 90;
    });

    document.addEventListener('mouseleave', () => {
        targetX = 0; targetY = 0;
    });

    // Single smooth loop
    function renderParallax() {
        currentX += (targetX - currentX) * 0.1;
        currentY += (targetY - currentY) * 0.1;
        
        if (Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01) {
            parentContainer.style.transform = `rotateY(${currentX.toFixed(2)}deg) rotateX(${currentY.toFixed(2)}deg)`;
        }
        
        requestAnimationFrame(renderParallax);
    }
    
    renderParallax();
});
