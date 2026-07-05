import Hls from 'hls.js';

// ============================================================
// STATE
// ============================================================
let currentTier = 'free';
let activeCameras = 1;
const maxCameras = 5;
const userId = "vignus-user-uuid";
const activeConnections = {}; // { cam1: { pc, monitorInterval, hls, wasLive } ... }
let currentSelectedCamera = '1';
let currentSelectedProtocol = 'web';
const pairingKeys = {}; // { cam1: { token, expires } ... }

// ============================================================
// DOM ELEMENTS
// ============================================================
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const tierBadge = document.getElementById('tier-badge');
const upsellBanner = document.getElementById('upsell-banner');
const videoGrid = document.getElementById('video-grid');
const addCamBtn = document.getElementById('add-cam-btn');
const mockTierSelect = document.getElementById('mock-tier-select');
const copyBtns = document.querySelectorAll('.btn-copy');

// Tailscale elements
const tsDot = document.getElementById('ts-dot');
const tsStatusText = document.getElementById('ts-status-text');
const tsIpText = document.getElementById('ts-ip-text');
const tsWarningTip = document.getElementById('ts-warning-tip');
const tsCard = document.getElementById('tailscale-status-card');

// Pairing Panel elements
const pairingCamSelect = document.getElementById('pairing-cam-select');
const protocolButtons = document.querySelectorAll('.protocol-tabs button');
const webPairingPanel = document.getElementById('pairing-content-web');
const rtmpPairingPanel = document.getElementById('pairing-content-rtmp');
const srtPairingPanel = document.getElementById('pairing-content-srt');
const pairingWebUrlInput = document.getElementById('pairing-web-url');
const btnRegenerateLink = document.getElementById('btn-regenerate-link');
const pairingRtmpUrl = document.getElementById('pairing-rtmp-url');
const pairingRtmpKey = document.getElementById('pairing-rtmp-key');
const pairingSrtUrl = document.getElementById('pairing-srt-url');
const pairingSrtId = document.getElementById('pairing-srt-id');
const pairingSrtPass = document.getElementById('pairing-srt-pass');

// OBS elements
const obsCamSelect = document.getElementById('obs-cam-select');
const obsUrlInput = document.getElementById('obs-url');

// Modal Elements
const overlaySettingsBtn = document.getElementById('overlay-settings-btn');
const overlayModal = document.getElementById('overlay-modal');
const overlayModalClose = document.getElementById('overlay-modal-close');
const overlayModalCancel = document.getElementById('overlay-modal-cancel');
const overlayModalSave = document.getElementById('overlay-modal-save');
const txtOverlayEnabled = document.getElementById('overlay-text-enabled');
const txtOverlayContent = document.getElementById('overlay-text-content');
const clockOverlayEnabled = document.getElementById('overlay-clock-enabled');
const wmOverlayEnabled = document.getElementById('overlay-watermark-enabled');
const wmOverlayUrl = document.getElementById('overlay-watermark-url');
const htmlOverlayEnabled = document.getElementById('overlay-html-enabled');
const htmlOverlayContent = document.getElementById('overlay-html-content');

// ============================================================
// INIT
// ============================================================
async function init() {
    setupEventListeners();

    // Auth Session Persistence
    if (localStorage.getItem('vignus_logged_in') === 'true') {
        currentTier = localStorage.getItem('vignus_user_tier') || 'free';
        const savedEmail = localStorage.getItem('vignus_user_email') || 'user@example.com';
        emailInput.value = savedEmail;
        mockTierSelect.value = currentTier;

        authView.style.display = 'none';
        dashboardView.style.display = 'flex';
        applyTierLogic();
    } else {
        authView.style.display = 'flex';
        dashboardView.style.display = 'none';
    }

    // Start Tailscale status polling
    pollTailscaleStatus();
    setInterval(pollTailscaleStatus, 5000);

    // Start global clock updater for overlays
    setInterval(updateClocks, 1000);
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function setupEventListeners() {
    // Auth Tabs
    document.getElementById('tab-login').addEventListener('click', (e) => {
        toggleAuthTab(e.target, 'login');
    });
    document.getElementById('btn-public-link')?.addEventListener('click', async (e) => {
        const btn = e.target;
        btn.disabled = true;
        btn.textContent = '⏳ Membuka Tunnel...';
        try {
            const res = await window.api.startTunnel();
            if (res.success) {
                // Change base URL to tunnel URL
                const urlObj = new URL(pairingWebUrlInput.value);
                const tunnelUrl = new URL(res.url);
                urlObj.protocol = tunnelUrl.protocol;
                urlObj.hostname = tunnelUrl.hostname;
                urlObj.port = tunnelUrl.port || (tunnelUrl.protocol === 'https:' ? '443' : '80');
                pairingWebUrlInput.value = urlObj.toString();
                btn.textContent = '✅ Link Publik Aktif';

                // Redraw QR
                if (window.qrc) {
                    window.qrc.clear();
                    window.qrc.makeCode(urlObj.toString());
                }
            } else {
                alert('Gagal membuat link publik: ' + res.error);
                btn.textContent = '🌐 Buat Link Publik (Mudah)';
                btn.disabled = false;
            }
        } catch (err) {
            alert('Error: ' + err.message);
            btn.textContent = '🌐 Buat Link Publik (Mudah)';
            btn.disabled = false;
        }
    });
    document.getElementById('tab-register').addEventListener('click', (e) => {
        toggleAuthTab(e.target, 'register');
    });

    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);

    // Mock tier selector
    mockTierSelect.addEventListener('change', (e) => {
        currentTier = e.target.value;
        localStorage.setItem('vignus_user_tier', currentTier);
        applyTierLogic();
    });

    // Sidebar Camera pairing selects
    pairingCamSelect.addEventListener('change', (e) => {
        currentSelectedCamera = e.target.value;
        updatePairingEndpoints();
    });

    // Protocol tab buttons
    protocolButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            protocolButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentSelectedProtocol = e.target.getAttribute('data-proto');
            updatePairingUI();
        });
    });

    // Regenerate QR URL
    btnRegenerateLink.addEventListener('click', () => {
        generateNewTokenForCam(currentSelectedCamera);
        updatePairingEndpoints();
    });

    // Add camera card
    addCamBtn.addEventListener('click', () => {
        if (currentTier === 'pro' && activeCameras < maxCameras) {
            activeCameras++;
            renderVideoGrid();
        }
    });

    // OBS camera select
    obsCamSelect.addEventListener('change', updateOBSUrl);

    // Copy buttons
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-copy') || e.target.closest('.btn-copy')) {
            const btn = e.target.classList.contains('btn-copy') ? e.target : e.target.closest('.btn-copy');
            const inputId = btn.getAttribute('data-copy');
            const inputEl = document.getElementById(inputId);
            if (inputEl) {
                navigator.clipboard.writeText(inputEl.value);
                const origText = btn.innerText;
                btn.innerText = 'Copied!';
                btn.style.background = 'var(--status-live)';
                setTimeout(() => {
                    btn.innerText = origText;
                    btn.style.background = '';
                }, 1500);
            }
        }
    });

    // Modal Overlays event listeners
    overlaySettingsBtn.addEventListener('click', openOverlayModal);
    overlayModalClose.addEventListener('click', closeOverlayModal);
    overlayModalCancel.addEventListener('click', closeOverlayModal);
    overlayModalSave.addEventListener('click', saveOverlaySettings);
}

function toggleAuthTab(activeBtn, mode) {
    document.querySelectorAll('.auth-tabs button').forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
    const title = authView.querySelector('h2');
    if (mode === 'login') {
        loginBtn.textContent = 'Sign In';
    } else {
        loginBtn.textContent = 'Register Account';
    }
}

// ============================================================
// AUTH & PERSISTENCE
// ============================================================
function handleLogin() {
    const email = emailInput.value.trim();
    if (!email) {
        showAuthError("Please enter a valid email address.");
        return;
    }

    // Save mock session persistence
    localStorage.setItem('vignus_logged_in', 'true');
    localStorage.setItem('vignus_user_email', email);
    localStorage.setItem('vignus_user_tier', mockTierSelect.value);

    document.getElementById('user-email').textContent = email;
    authView.style.display = 'none';
    dashboardView.style.display = 'flex';

    currentTier = mockTierSelect.value;
    applyTierLogic();
}

function handleLogout() {
    stopAllConnections();
    localStorage.removeItem('vignus_logged_in');
    authView.style.display = 'flex';
    dashboardView.style.display = 'none';
}

function showAuthError(msg) {
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    setTimeout(() => { errorEl.style.display = 'none'; }, 4000);
}

// ============================================================
// TAILSCALE CONNECTION STATUS
// ============================================================
async function pollTailscaleStatus() {
    if (window.api && window.api.getTailscaleStatus) {
        try {
            const status = await window.api.getTailscaleStatus();
            if (status.connected) {
                tsCard.className = 'status-card-connected';
                tsDot.style.background = 'var(--status-live)';
                tsStatusText.textContent = 'TAILSCALE ACTIVE';
                tsIpText.textContent = status.ip;
                tsWarningTip.style.display = 'none';
            } else {
                tsCard.className = 'status-card-disconnected';
                tsDot.style.background = 'var(--status-error)';
                tsStatusText.textContent = status.installed ? 'TAILSCALE DISCONNECTED' : 'TAILSCALE NOT FOUND';
                tsIpText.textContent = '---.---.---.---';
                tsWarningTip.style.display = 'block';
                tsWarningTip.textContent = status.installed
                    ? '⚠️ Tailscale terputus! Kamera seluler tidak akan bisa terhubung ke PC ini.'
                    : '⚠️ Tailscale belum terinstal! Silakan pasang Tailscale untuk menghubungkan HP Anda.';
            }
            // Update camera pairing urls to reflect Tailscale IP changes
            updatePairingEndpoints();
        } catch (e) {
            console.error("Error reading Tailscale status", e);
        }
    }
}

// ============================================================
// TIER LOGIC
// ============================================================
function applyTierLogic() {
    if (currentTier === 'free') {
        tierBadge.textContent = 'FREE TIER';
        tierBadge.className = 'badge badge-free';
        upsellBanner.style.display = 'block';
        activeCameras = 1;

        // Apply visual lock blocks to Pro elements
        document.querySelectorAll('.pro-locked').forEach(el => {
            el.style.opacity = '0.5';
            el.style.pointerEvents = 'none';
            el.classList.add('pro-locked-style');
            if (el.tagName === 'OPTION') {
                if (!el.textContent.startsWith('🔒')) {
                    el.textContent = '🔒 ' + el.textContent;
                }
            }
        });

        pairingCamSelect.value = '1';
        currentSelectedCamera = '1';
        obsCamSelect.value = '1';
    } else {
        tierBadge.textContent = 'PRO TIER';
        tierBadge.className = 'badge badge-pro';
        upsellBadgeRemove();
    }

    updateOBSUrl();
    updatePairingEndpoints();
    renderVideoGrid();
}

function upsellBadgeRemove() {
    upsellBanner.style.display = 'none';
    document.querySelectorAll('.pro-locked').forEach(el => {
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
        el.classList.remove('pro-locked-style');
        if (el.tagName === 'OPTION') {
            el.textContent = el.textContent.replace('🔒 ', '');
        }
    });
}

function updateOBSUrl() {
    const camIndex = obsCamSelect.value;
    // OBS Widget is served from our port 3000 server!
    obsUrlInput.value = `http://localhost:3000/obs-widget.html?cam=${camIndex}&uid=${userId}`;
}

// ============================================================
// CAMERA PAIRING ENDPOINTS GENERATION
// ============================================================
function generateNewTokenForCam(camKeyNum) {
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes from now
    const token = Math.random().toString(36).substring(2, 10);
    pairingKeys[camKeyNum] = { token, expires };
}

async function updatePairingEndpoints() {
    const camKeyNum = currentSelectedCamera;
    const camKey = `cam${camKeyNum}`;

    // Generate token if not exists or expired
    if (!pairingKeys[camKeyNum] || Date.now() > pairingKeys[camKeyNum].expires) {
        generateNewTokenForCam(camKeyNum);
    }

    const { token, expires } = pairingKeys[camKeyNum];

    // Determine current serving host
    let host = 'localhost';
    if (window.api && window.api.getTailscaleIP) {
        const tsIp = await window.api.getTailscaleIP();
        if (tsIp) host = tsIp;
    }

    // Web pairing URL
    const webUrl = `http://${host}:3000/mobile/cam${camKeyNum}?token=${token}&expires=${expires}`;
    pairingWebUrlInput.value = webUrl;

    // Draw QR code
    const canvas = document.getElementById('pairing-qr');
    if (canvas && window.QRious) {
        new window.QRious({
            element: canvas,
            value: webUrl,
            size: 250,
            background: '#ffffff',
            foreground: '#090D1A',
            level: 'H'
        });
    }

    // RTMP Ingest Info — MediaMTX uses path-based naming directly (not /live)
    // In IRL Pro: Server = rtmp://host:1935   Stream Key = camX
    pairingRtmpUrl.value = `rtmp://${host}:1935`;
    pairingRtmpKey.value = camKey;

    // SRT Ingest Info — MediaMTX supports streamid=publish:camX natively without passphrase
    pairingSrtUrl.value = `srt://${host}:8890`;
    pairingSrtId.value = `publish:${camKey}`;


    // Fill the separate host field for manual entry
    const srtHostEl = document.getElementById('pairing-srt-host');
    if (srtHostEl) srtHostEl.value = host;

    updatePairingUI();
}

function updatePairingUI() {
    webPairingPanel.style.display = 'none';
    rtmpPairingPanel.style.display = 'none';
    srtPairingPanel.style.display = 'none';

    if (currentSelectedProtocol === 'web') {
        webPairingPanel.style.display = 'block';
    } else if (currentSelectedProtocol === 'rtmp') {
        rtmpPairingPanel.style.display = 'block';
    } else if (currentSelectedProtocol === 'srt') {
        srtPairingPanel.style.display = 'block';
    }
}

// ============================================================
// DYNAMIC VIDEO GRID
// ============================================================
function stopAllConnections() {
    for (const key of Object.keys(activeConnections)) {
        cleanupConnection(key);
    }
}

function cleanupConnection(camKey) {
    const conn = activeConnections[camKey];
    if (conn) {
        if (conn.monitorInterval) clearInterval(conn.monitorInterval);
        if (conn.hls) {
            conn.hls.destroy();
            conn.hls = null;
        }
        if (conn.pc && conn.pc.connectionState !== 'closed') {
            try { conn.pc.close(); } catch (e) { }
        }
        delete activeConnections[camKey];
    }
}

function renderVideoGrid() {
    // Cleanup extra cameras that are no longer part of the grid
    for (const key of Object.keys(activeConnections)) {
        const num = parseInt(key.replace('cam', ''));
        if (num > activeCameras) {
            cleanupConnection(key);
        }
    }

    videoGrid.innerHTML = '';
    videoGrid.className = `grid-${activeCameras}`;

    for (let i = 1; i <= activeCameras; i++) {
        const camKey = `cam${i}`;
        const card = document.createElement('div');
        card.className = 'video-card';
        card.id = `card-${camKey}`;

        // Active camera selector on click
        card.addEventListener('click', (e) => {
            // Check if user clicked on audio-toggle button or overlay close buttons
            if (e.target.closest('.audio-toggle') || e.target.closest('.btn-close-cam')) return;

            if (currentTier === 'pro' || i === 1) {
                pairingCamSelect.value = i.toString();
                currentSelectedCamera = i.toString();
                updatePairingEndpoints();

                // Highlight active camera card
                document.querySelectorAll('.video-card').forEach(c => c.style.border = 'none');
                card.style.border = '2px solid var(--accent-primary)';

                // Update pairing UI disabled state based on selected camera status
                const isLive = document.getElementById(`label-cam${i}`).textContent.includes('LIVE');
                disablePairingUI(isLive);
            }
        });

        const closeBtnHtml = (currentTier === 'pro' && activeCameras > 1)
            ? `<button class="btn-close-cam" style="position:absolute; top:12px; left:120px; background:rgba(239, 68, 68, 0.7); color:white; border-radius:4px; padding:4px 8px; z-index:5;" id="close-${camKey}">&times; Close</button>`
            : '';

        card.innerHTML = `
            <video id="vid-${camKey}" autoplay muted playsinline></video>
            <div class="status-overlay">
                <div class="status-dot" id="dot-${camKey}"></div>
                <span id="label-${camKey}">WAITING - CAM ${i}</span>
            </div>
            ${closeBtnHtml}
            <button class="audio-toggle" id="audio-${camKey}">🔇 Muted</button>
            <div class="stats-overlay" id="stats-${camKey}">Waiting for stream...</div>
        `;
        videoGrid.appendChild(card);

        // Audio toggle
        const audioBtn = document.getElementById(`audio-${camKey}`);
        const vidEl = document.getElementById(`vid-${camKey}`);
        audioBtn.addEventListener('click', () => {
            vidEl.muted = !vidEl.muted;
            audioBtn.textContent = vidEl.muted ? '🔇 Muted' : '🔊 Audio On';
        });

        // Close camera click handler
        if (currentTier === 'pro' && activeCameras > 1) {
            const closeBtn = document.getElementById(`close-${camKey}`);
            closeBtn.addEventListener('click', () => {
                cleanupConnection(camKey);
                activeCameras--;
                renderVideoGrid();
            });
        }

        // Init connections state
        activeConnections[camKey] = {
            pc: null,
            monitorInterval: null,
            hls: null,
            wasLive: false,
            reconnecting: false
        };

        // Render overlays if saved
        renderOverlaysForCard(camKey);

        // Start stream monitoring loop
        startStreamMonitor(camKey, i);
    }

    // Highlight the current selected camera card
    const activeCard = document.getElementById(`card-cam${currentSelectedCamera}`);
    if (activeCard) {
        activeCard.style.border = '2px solid var(--accent-primary)';
    }
}

function updateCamStatus(camKey, camIndex, status) {
    const dot = document.getElementById(`dot-${camKey}`);
    const label = document.getElementById(`label-${camKey}`);
    const statsEl = document.getElementById(`stats-${camKey}`);
    if (!dot || !label) return;

    if (status === 'live') {
        dot.style.background = 'var(--status-live)';
        dot.style.boxShadow = '0 0 10px var(--status-live)';
        label.textContent = `LIVE - CAM ${camIndex}`;
        if (currentSelectedCamera === camIndex.toString()) {
            disablePairingUI(true);
        }
    } else if (status === 'reconnecting') {
        dot.style.background = 'var(--status-warn)';
        dot.style.boxShadow = '0 0 10px var(--status-warn)';
        label.textContent = `RECONNECTING - CAM ${camIndex}`;
        if (statsEl) {
            statsEl.textContent = 'Stream disconnected. Reconnecting...';
            statsEl.style.color = 'var(--status-warn)';
        }
        if (currentSelectedCamera === camIndex.toString()) {
            disablePairingUI(false);
        }
    } else {
        dot.style.background = '#555';
        dot.style.boxShadow = 'none';
        label.textContent = `WAITING - CAM ${camIndex}`;
        if (statsEl) {
            statsEl.textContent = 'Waiting for stream...';
            statsEl.style.color = '#94a3b8';
        }
        if (currentSelectedCamera === camIndex.toString()) {
            disablePairingUI(false);
        }
    }
}

function disablePairingUI(disabled) {
    const panels = [webPairingPanel, rtmpPairingPanel, srtPairingPanel];
    panels.forEach(panel => {
        const inputs = panel.querySelectorAll('input, button');
        inputs.forEach(el => {
            el.disabled = disabled;
            if (disabled) {
                el.style.opacity = '0.5';
                el.style.cursor = 'not-allowed';
            } else {
                el.style.opacity = '1';
                el.style.cursor = '';
            }
        });
    });

    // Also add a message or disable the tabs themselves
    const protocolBtns = document.querySelectorAll('.protocol-btn');
    protocolBtns.forEach(btn => {
        btn.disabled = disabled;
        if (disabled) {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.title = "Camera is currently LIVE. Disconnect stream to reconfigure.";
        } else {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.title = "";
        }
    });
}

// ============================================================
// STREAM MONITORS
// ============================================================
async function checkStreamActive(camKey) {
    try {
        const res = await fetch(`http://localhost:9997/v3/paths/get/${camKey}`, {
            signal: AbortSignal.timeout(1000)
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data.ready === true;
    } catch (e) {
        return false;
    }
}

function startStreamMonitor(camKey, camIndex) {
    const conn = activeConnections[camKey];
    if (!conn) return;

    if (conn.monitorInterval) clearInterval(conn.monitorInterval);
    if (conn.hls) { conn.hls.destroy(); conn.hls = null; }

    conn.monitorInterval = setInterval(async () => {
        const isLive = await checkStreamActive(camKey);

        if (isLive) {
            if (!conn.wasLive) {
                // Stream just came online
                conn.wasLive = true;
                conn.reconnecting = false;
                startHLSPlayback(camKey, camIndex);
                startWebRTC(camKey, camIndex);
            } else {
                // Stream continues to be online, update stats
                updateApiStats(camKey);
            }
        } else {
            if (conn.wasLive) {
                // Stream went offline, trigger reconnect state
                conn.wasLive = false;
                conn.reconnecting = true;

                // Clear video feed
                const vid = document.getElementById(`vid-${camKey}`);
                if (vid) { vid.srcObject = null; vid.src = ''; }
                if (conn.hls) { conn.hls.destroy(); conn.hls = null; }
                if (conn.pc && conn.pc.connectionState !== 'closed') {
                    try { conn.pc.close(); } catch (e) { }
                }

                updateCamStatus(camKey, camIndex, 'reconnecting');
            }
            // If it hasn't connected yet, it remains in WAITING status.
            // If it is in reconnecting status, it continues polling here.
        }
    }, 500);
}

function startHLSPlayback(camKey, camIndex) {
    const vid = document.getElementById(`vid-${camKey}`);
    if (!vid) return;

    const hlsUrl = `http://localhost:8888/${camKey}/index.m3u8`;

    if (vid.canPlayType('application/vnd.apple.mpegurl')) {
        vid.src = hlsUrl;
        vid.play().catch(() => { });
        updateCamStatus(camKey, camIndex, 'live');
        return;
    }

    if (!Hls.isSupported()) return;

    const conn = activeConnections[camKey];
    if (conn.hls) {
        conn.hls.destroy();
        conn.hls = null;
    }

    const hls = new Hls({
        liveSyncDurationCount: 1.5,
        liveMaxLatencyDurationCount: 3.0,
        maxBufferLength: 1.5,
        maxMaxBufferLength: 3.0,
        enableWorker: true,
        lowLatencyMode: true,
    });
    conn.hls = hls;

    hls.loadSource(hlsUrl);
    hls.attachMedia(vid);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
        vid.play().catch(() => { });
        updateCamStatus(camKey, camIndex, 'live');
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
            hls.destroy();
            conn.hls = null;
            updateCamStatus(camKey, camIndex, conn.reconnecting ? 'reconnecting' : 'waiting');
        }
    });
}

function startWebRTC(camKey, camIndex) {
    const conn = activeConnections[camKey];
    if (!conn) return;

    if (conn.pc && conn.pc.connectionState !== 'closed') {
        try { conn.pc.close(); } catch (e) { }
    }

    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    conn.pc = pc;

    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    const remoteStream = new MediaStream();

    pc.ontrack = (event) => {
        const vid = document.getElementById(`vid-${camKey}`);
        if (!vid) return;

        // If WebRTC is available, stop HLS for lower latency
        if (conn.hls) { conn.hls.destroy(); conn.hls = null; }

        remoteStream.addTrack(event.track);
        vid.srcObject = remoteStream;
        vid.src = '';
        vid.play().catch(() => { });
        updateCamStatus(camKey, camIndex, 'live');
    };

    (async () => {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Wait for ICE gathering to complete before sending SDP to WHEP endpoint
            if (pc.iceGatheringState !== 'complete') {
                await new Promise(resolve => {
                    pc.onicegatheringstatechange = () => {
                        if (pc.iceGatheringState === 'complete') resolve();
                    };
                    // Timeout just in case
                    setTimeout(resolve, 2000);
                });
            }

            const res = await fetch(`http://${window.location.hostname}:8889/${camKey}/whep`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/sdp' },
                body: pc.localDescription.sdp
            });
            if (res.ok) {
                const sdp = await res.text();
                await pc.setRemoteDescription({ type: 'answer', sdp });
            } else {
                console.error("WHEP failed", res.status);
            }
        } catch (e) {
            console.error("WHEP error", e);
        }
    })();
}

async function updateApiStats(camKey) {
    const conn = activeConnections[camKey];
    if (!conn) return;
    const statsEl = document.getElementById(`stats-${camKey}`);
    if (!statsEl) return;

    const vid = document.getElementById(`vid-${camKey}`);
    let resStr = '--';
    if (vid && vid.videoWidth) {
        resStr = `${vid.videoWidth}x${vid.videoHeight}`;
    }

    if (conn.pc && conn.pc.connectionState === 'connected') {
        try {
            const stats = await conn.pc.getStats();
            let fps = '--', bitrate = '--', loss = '0';
            stats.forEach(report => {
                if (report.type === 'inbound-rtp' && report.kind === 'video') {
                    if (report.framesPerSecond !== undefined) fps = Math.round(report.framesPerSecond);
                    if (report.packetsLost !== undefined) loss = report.packetsLost;

                    const bytesReceived = report.bytesReceived;
                    const now = report.timestamp;
                    if (conn.lastVideoBytes && conn.lastVideoTime) {
                        const diffBytes = bytesReceived - conn.lastVideoBytes;
                        const diffTime = now - conn.lastVideoTime;
                        if (diffTime > 0) {
                            const bps = (diffBytes * 8 * 1000) / diffTime;
                            bitrate = bps >= 1_000_000 ? `${(bps / 1_000_000).toFixed(1)} Mbps` : `${(bps / 1000).toFixed(0)} Kbps`;
                        }
                    } else {
                        bitrate = "Calculating...";
                    }
                    conn.lastVideoBytes = bytesReceived;
                    conn.lastVideoTime = now;
                }
            });
            statsEl.textContent = `${resStr} · ${fps} FPS · ${bitrate} · Loss: ${loss}`;
            statsEl.style.color = '#10B981'; // Green for WebRTC
        } catch (e) { }
    } else if (conn.hls) {
        statsEl.textContent = `${resStr} · HLS Fallback`;
        statsEl.style.color = '#F59E0B'; // Orange
    } else {
        statsEl.textContent = 'Connected · Processing...';
        statsEl.style.color = '#94a3b8';
    }
}

// ============================================================
// OVERLAY SYSTEM (PRO FEATURE)
// ============================================================
function openOverlayModal() {
    if (currentTier !== 'pro') return;

    const settings = getOverlaySettings();
    txtOverlayEnabled.checked = settings.textEnabled;
    txtOverlayContent.value = settings.textContent || '';
    clockOverlayEnabled.checked = settings.clockEnabled;
    wmOverlayEnabled.checked = settings.watermarkEnabled;
    wmOverlayUrl.value = settings.watermarkUrl || '';
    htmlOverlayEnabled.checked = settings.htmlEnabled;
    htmlOverlayContent.value = settings.htmlContent || '';

    overlayModal.style.display = 'flex';
}

function closeOverlayModal() {
    overlayModal.style.display = 'none';
}

function saveOverlaySettings() {
    const settings = {
        textEnabled: txtOverlayEnabled.checked,
        textContent: txtOverlayContent.value.trim(),
        clockEnabled: clockOverlayEnabled.checked,
        watermarkEnabled: wmOverlayEnabled.checked,
        watermarkUrl: wmOverlayUrl.value.trim(),
        htmlEnabled: htmlOverlayEnabled.checked,
        htmlContent: htmlOverlayContent.value.trim()
    };

    localStorage.setItem('vignus_overlays', JSON.stringify(settings));

    // Notify window components (and OBS widgets if local storage fires storage event)
    window.dispatchEvent(new Event('storage'));

    // Re-render overlays in active cards
    for (let i = 1; i <= activeCameras; i++) {
        renderOverlaysForCard(`cam${i}`);
    }

    closeOverlayModal();
}

function getOverlaySettings() {
    try {
        const raw = localStorage.getItem('vignus_overlays');
        if (raw) return JSON.parse(raw);
    } catch (e) { }
    return {
        textEnabled: false,
        textContent: '',
        clockEnabled: false,
        watermarkEnabled: false,
        watermarkUrl: '',
        htmlEnabled: false,
        htmlContent: ''
    };
}

function renderOverlaysForCard(camKey) {
    const card = document.getElementById(`card-${camKey}`);
    if (!card) return;

    // Remove existing overlay container
    const existing = card.querySelector('.cam-render-overlay');
    if (existing) existing.remove();

    if (currentTier !== 'pro') return;

    const settings = getOverlaySettings();
    const hasAnyOverlay = settings.textEnabled || settings.clockEnabled || settings.watermarkEnabled || settings.htmlEnabled;
    if (!hasAnyOverlay) return;

    const overlayContainer = document.createElement('div');
    overlayContainer.className = 'cam-render-overlay';

    if (settings.textEnabled && settings.textContent) {
        const textDiv = document.createElement('div');
        textDiv.className = 'overlay-item-text';
        textDiv.textContent = settings.textContent;
        overlayContainer.appendChild(textDiv);
    }

    if (settings.clockEnabled) {
        const clockDiv = document.createElement('div');
        clockDiv.className = 'overlay-item-clock';
        clockDiv.textContent = '--:--:-- WIB';
        overlayContainer.appendChild(clockDiv);
    }

    if (settings.watermarkEnabled) {
        const img = document.createElement('img');
        img.className = 'overlay-item-watermark';
        img.src = settings.watermarkUrl || 'https://vignus.live/favicon.svg';
        img.onerror = () => { img.style.display = 'none'; };
        overlayContainer.appendChild(img);
    }

    if (settings.htmlEnabled && settings.htmlContent) {
        const htmlDiv = document.createElement('div');
        htmlDiv.className = 'overlay-item-html';
        htmlDiv.innerHTML = settings.htmlContent;
        overlayContainer.appendChild(htmlDiv);
    }

    card.appendChild(overlayContainer);
    updateClocks();
}

function updateClocks() {
    const clocks = document.querySelectorAll('.overlay-item-clock');
    if (clocks.length === 0) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';

    clocks.forEach(clock => {
        clock.textContent = timeString;
    });
}

// Ensure the overlays updates in other windows/tabs
window.addEventListener('storage', () => {
    for (let i = 1; i <= activeCameras; i++) {
        renderOverlaysForCard(`cam${i}`);
    }
});

// ============================================================
// RUN
// ============================================================
init();
