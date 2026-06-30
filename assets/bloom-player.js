/**
 * KOBA-I UNIVERSAL PLAYER
 * Version 6.0 - Mobile Lock Screen, Media Session API & Fullscreen
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // 1. INIT MAIN PLAYER
    const mainRoot = document.getElementById('koba-bloom-root');
    if (mainRoot && window.kobaData) {
        initPlayer(mainRoot, window.kobaData, 'full');
    }

    // 2. INIT MINI PLAYERS
    const miniRoots = document.querySelectorAll('.koba-mini-root');
    miniRoots.forEach(root => {
        if(root.dataset.config) {
            const config = JSON.parse(root.dataset.config);
            initPlayer(root, config, 'mini');
        }
    });

    function initPlayer(root, data, mode) {
        const chapters = data.chapters || [];
        if(chapters.length === 0) return;
        
        // --- CUSTOM ICONS ---
        const icons = {
            play:  `<svg viewBox="0 0 40 40" fill="currentColor"><path d="M13.5 11.855L27.98 20 13.5 28.145z"/></svg>`,
            pause: `<svg viewBox="0 0 40 40" fill="currentColor"><path d="M23.5 11.5H27.5V28.5H23.5z"/><path d="M12.5 11.5H16.5V28.5H12.5z"/></svg>`,
            prev:   `<svg viewBox="0 0 40 40" fill="currentColor"><path d="M12.571 20L24 10 24 30z"/></svg>`,
            next:   `<svg viewBox="0 0 40 40" fill="currentColor"><path d="M27.429 20L16 10 16 30z"/></svg>`,
            rw30:  `<svg viewBox="0 0 40 40" fill="currentColor"><path d="M18.878 20L30.5 11.954 30.5 28.046z"/><path d="M7.878 20L19.5 11.954 19.5 28.046z"/></svg>`,
            ff30:  `<svg viewBox="0 0 40 40" fill="currentColor"><path d="M9.5 11.954L21.122 20 9.5 28.046z"/><path d="M20.5 11.954L32.122 20 20.5 28.046z"/></svg>`,
            menu:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>`,
            text:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/></svg>`,
            fullscreen:  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`,
            exit_full: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`
        };

        // STATE
        let currentIndex = 0;
        let isPlaying = false;
        let mediaEl = null; 
        let transcriptData = null;

        // --- RENDER HTML ---
        if (mode === 'mini') {
            root.classList.add('koba-mini-container');
            root.innerHTML = `
                <div class="k-mini-shell">
                    <div class="k-mini-cover" style="background-image:url('${data.coverUrl}')"></div>
                    <button class="k-mini-play-btn">${icons.play}</button>
                    <div class="k-mini-info">
                        <div class="k-mini-title">${data.title}</div>
                        <div class="k-mini-scrubber"><div class="k-mini-progress"></div></div>
                    </div>
                </div>`;
        } else {
            root.innerHTML = `
                <div class="k-bloom-bg" style="background-image: url('${data.bgImage}')"></div>
                <img src="${data.logoUrl}" class="k-bloom-logo" alt="KOBA-I">
                <div class="k-bloom-interface">
                    <div class="k-bloom-stage">
                        <div id="k-media-container" class="k-media-box"></div>
                        <div id="k-read-scrollbox" class="k-read-scrollbox">
                            <div style="opacity:0.5; margin-top:100px;">Loading Transcript...</div>
                        </div>

                        <div class="k-bloom-controls">
                            <div class="k-scrubber" id="k-scrubber"><div class="k-progress" id="k-progress"></div></div>
                            <div class="k-time-row"><span id="k-curr-time">0:00</span><span id="k-dur-time">0:00</span></div>
                            <div class="k-buttons">
                                <button class="k-btn-icon" id="k-speed-btn" title="Speed">1x</button>
                                <button class="k-btn-icon" id="k-rw-btn" title="Rewind 30s">${icons.rw30}</button>
                                <button class="k-btn-icon" id="k-prev-btn" title="Previous Chapter">${icons.prev}</button>
                                <button class="k-btn-main" id="k-play-btn">${icons.play}</button>
                                <button class="k-btn-icon" id="k-next-btn" title="Next Chapter">${icons.next}</button>
                                <button class="k-btn-icon" id="k-ff-btn" title="Forward 30s">${icons.ff30}</button>
                                <div class="k-actions">
                                    <button class="k-btn-icon" id="k-mark-btn" title="Chapters">${icons.menu}</button>
                                    <button class="k-btn-icon" id="k-text-btn" title="Read Along" style="opacity:0.3; cursor:default;">${icons.text}</button>
                                    <button class="k-btn-icon" id="k-fullscreen-btn" title="Full Screen">${icons.fullscreen}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="k-bloom-sidebar">
                        <div class="k-tabs">
                            <button class="k-tab active">Chapters</button>
                            <button class="k-tab" style="opacity: 0.4; cursor: not-allowed;">Bookmarks</button>
                        </div>
                        <div class="k-list" id="k-list-container"></div>
                    </div>
                </div>
            `;
        }

        // REFERENCES
        const playBtn = root.querySelector(mode === 'mini' ? '.k-mini-play-btn' : '#k-play-btn');
        const progressBar = root.querySelector(mode === 'mini' ? '.k-mini-progress' : '#k-progress');
        const scrubber = root.querySelector(mode === 'mini' ? '.k-mini-scrubber' : '#k-scrubber');
        const mediaBox = root.querySelector('#k-media-container');
        const listContainer = root.querySelector('#k-list-container');
        const currTimeEl = root.querySelector('#k-curr-time');
        const durTimeEl = root.querySelector('#k-dur-time');
        const fullscreenBtn = root.querySelector('#k-fullscreen-btn');
        const textBtn = root.querySelector('#k-text-btn');
        const readBox = root.querySelector('#k-read-scrollbox');

        // Fullscreen Toggle Logic
        if (fullscreenBtn) {
            fullscreenBtn.onclick = () => {
                if (!document.fullscreenElement) {
                    root.requestFullscreen().catch(err => {
                        console.log(`Error attempting to enable full-screen mode: ${err.message}`);
                    });
                } else {
                    document.exitFullscreen();
                }
            };
        }

        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                if(fullscreenBtn) fullscreenBtn.innerHTML = icons.exit_full;
                root.classList.add('is-fullscreen');
            } else {
                if(fullscreenBtn) fullscreenBtn.innerHTML = icons.fullscreen;
                root.classList.remove('is-fullscreen');
            }
        });
        
        function loadChapter(index) {
            if (index < 0 || index >= chapters.length) return;
            currentIndex = index;
            const chap = chapters[index];

            // 🚀 YOUR INTERCEPTOR (Leave this exactly as you wrote it)
            // 🚀 UPDATED INTERCEPTOR (Replace this in bloom-player.js)
            if (data.mediaType === 'E-Book' || chap.type === 'text' || chap.textContent) {
                root.classList.add('k-mode-reading'); 
                
                if (mediaEl) { 
                    mediaEl.pause(); 
                    mediaEl = null; 
                }
                
                if (readBox) {
                    const rawText = chap.textContent || `<p style="opacity:0.5; padding-top:120px; text-align:center;">Parsing chapter data...</p>`;
                    
                    // Wraps each paragraph in .k-ebook-page for the CSS snap engine
                    const formattedText = rawText
                        .split('\n')
                        .map(line => {
                            const trimmed = line.trim();
                            if (trimmed === '') return '';
                            const style = line.startsWith(' ') ? 'padding-left: 1.5em;' : '';
                            return `<div class="k-ebook-page"><p style="${style}">${trimmed}</p></div>`;
                        })
                        .join('');

                    // Inject the content and force block display
                    readBox.innerHTML = `<div class="k-ebook-content">${formattedText}</div>`;
                    readBox.style.display = 'block'; 
                    readBox.scrollLeft = 0; 
                }
                
                renderList(); 
                return; 
            }

            // --- STANDARD AUDIO/VIDEO LOGIC (Keep this so your audiobooks still work!) ---
            if(mode === 'full') {
                root.classList.remove('k-mode-reading'); 
                if(readBox) readBox.innerHTML = '<div style="opacity:0.5; padding-top:120px;">Loading Transcript...</div>';
            }

            if(mediaBox) mediaBox.innerHTML = '';
            if (mediaEl) { 
                mediaEl.pause(); 
                mediaEl.removeAttribute('src'); 
                mediaEl = null; 
            }
    
    // ... rest of your original audio loading code goes here ...
            if (mode === 'full') {
                if (chap.type === 'video') {
                    mediaEl = document.createElement('video');
                    mediaEl.className = 'k-video-element';
                    mediaEl.setAttribute('playsinline', 'true');
                    mediaEl.setAttribute('webkit-playsinline', 'true'); 
                    mediaEl.style.width = "100%";
                    mediaEl.style.height = "100%";
                    mediaEl.style.objectFit = "contain"; 
                } else {
                    const cover = document.createElement('div');
                    cover.className = 'k-bloom-cover';
                    
                    // 🚀 THE FIX: Check root level AND nested theme level defensively
                    const activeCoverUrl = data.coverArtUrl || data.coverUrl || (data.theme && data.theme.coverUrl) || '';
                    cover.style.backgroundImage = `url('${activeCoverUrl}')`;
                    
                    mediaBox.appendChild(cover);
                    mediaEl = document.createElement('audio');
                }
                mediaBox.appendChild(mediaEl);
            } else {
                mediaEl = new Audio(); 
            }
            
            mediaEl.src = chap.url;
            mediaEl.preload = 'metadata';

            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: chap.title,
                    artist: data.title,
                    album: "KOBA-I Audio",
                    artwork: [
                        // 🚀 Defensively check all possible payload locations for the phone lock screen
                        { src: data.coverArtUrl || data.coverUrl || (data.theme && data.theme.coverUrl) || '', sizes: '512x512', type: 'image/jpeg' }
                    ]
                });

                navigator.mediaSession.setActionHandler('play', () => { togglePlay(); });
                navigator.mediaSession.setActionHandler('pause', () => { togglePlay(); });
                navigator.mediaSession.setActionHandler('previoustrack', () => { loadChapter(currentIndex - 1); setTimeout(togglePlay, 500); });
                navigator.mediaSession.setActionHandler('nexttrack', () => { loadChapter(currentIndex + 1); setTimeout(togglePlay, 500); });
                navigator.mediaSession.setActionHandler('seekto', (details) => {
                    if (mediaEl && details.seekTime) mediaEl.currentTime = details.seekTime;
                });
            }

            mediaEl.addEventListener('timeupdate', updateProgress);
            mediaEl.addEventListener('ended', () => { if(mode === 'full') loadChapter(currentIndex + 1); });
            mediaEl.addEventListener('loadedmetadata', () => { if(durTimeEl) durTimeEl.innerText = formatTime(mediaEl.duration); });

            if(playBtn) playBtn.innerHTML = icons.play;
            isPlaying = false;
            
            if(mode === 'full') { renderList(); loadTranscript(chap); }
        }

        // 🚀 SWIPE GESTURE ENGINE
        let touchStartX = 0;
        let touchEndX = 0;

        if (readBox) {
            readBox.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, false);

            readBox.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            }, false);
        }

        function handleSwipe() {
            const threshold = 50; 
            const pageSlideDistance = readBox.clientWidth;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > threshold) {
                // If diff > 0, we swiped left (next), else right (prev)
                const direction = diff > 0 ? 1 : -1;
                const targetScroll = readBox.scrollLeft + (direction * pageSlideDistance);
                
                readBox.scrollTo({ 
                    left: targetScroll, 
                    behavior: 'smooth' 
                });
            }
        }

        

        function togglePlay() {
            if (!mediaEl) return;
            if (mediaEl.paused) { 
                mediaEl.play()
                    .then(() => {
                        playBtn.innerHTML = icons.pause; 
                        isPlaying = true;
                        if('mediaSession' in navigator) navigator.mediaSession.playbackState = "playing";
                    })
                    .catch(e => console.log("Play interrupted:", e));
            } else { 
                mediaEl.pause(); 
                playBtn.innerHTML = icons.play; 
                isPlaying = false;
                if('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused";
            }
        }

        function updateProgress() {
            if (!mediaEl) return;
            const pct = (mediaEl.currentTime / mediaEl.duration) * 100;
            if(progressBar) progressBar.style.width = `${pct}%`;
            if(currTimeEl) currTimeEl.innerText = formatTime(mediaEl.currentTime);
            
            if (transcriptData && root.classList.contains('k-mode-reading')) syncText(mediaEl.currentTime);
        }

        function formatTime(s) {
            if (!s || isNaN(s)) return "0:00";
            const m = Math.floor(s / 60);
            const sec = Math.floor(s % 60);
            return `${m}:${sec < 10 ? '0' : ''}${sec}`;
        }

        function renderList() {
            if(!listContainer) return;
            listContainer.innerHTML = '';
            
            // The speaker icon from your mockup
            const speakerIcon = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;

            chapters.forEach((c, i) => {
                const row = document.createElement('div');
                row.className = `k-list-item ${i === currentIndex ? 'active' : ''}`;
                
                // Formatted to match your pristine mockup
                row.innerHTML = `<div class="k-item-info"><span class="k-item-title">${c.title}</span></div> ${i === currentIndex ? speakerIcon : ''}`;
                row.onclick = () => { loadChapter(i); setTimeout(togglePlay, 500); };
                listContainer.appendChild(row);
            });
        }

        function loadTranscript(chap) {
            if(!textBtn) return;
            transcriptData = null;
            textBtn.style.opacity = '0.3';
            textBtn.style.cursor = 'default';
            
            if (chap.transcript_file_url && chap.transcript_file_url.includes('.json')) {
                fetch(chap.transcript_file_url)
                    .then(r => r.json())
                    .then(json => {
                        transcriptData = [];
                        if(json.results) {
                            json.results.forEach(res => {
                                if(res.alternatives) res.alternatives[0].words.forEach(w => {
                                    transcriptData.push({ word: w.word, start: parseFloat(w.startOffset.replace('s','')), end: parseFloat(w.endOffset.replace('s','')) });
                                });
                            });
                        }
                        if(transcriptData.length > 0) {
                            textBtn.style.opacity = '1';
                            textBtn.style.cursor = 'pointer';
                            if(readBox) {
                                readBox.innerHTML = '';
                                transcriptData.forEach(t => {
                                    const span = document.createElement('span');
                                    span.className = 'k-word'; span.innerText = t.word + ' ';
                                    span.dataset.start = t.start; span.dataset.end = t.end;
                                    span.onclick = () => { if(mediaEl) { mediaEl.currentTime = t.start; mediaEl.play(); isPlaying = true; playBtn.innerHTML = icons.pause; }};
                                    readBox.appendChild(span);
                                });
                            }
                        }
                    })
                    .catch(err => {
                        console.log('Transcript load failed', err);
                        if(readBox) readBox.innerHTML = '<div style="opacity:0.5; padding-top:120px;">Transcript Not Available</div>';
                    });
            } else {
                 if(readBox) readBox.innerHTML = '<div style="opacity:0.5; padding-top:120px;">Transcript Not Available</div>';
            }
        }

        function syncText(time) {
            if(!readBox) return;
            const words = readBox.querySelectorAll('.k-word');
            let activeWord = null;
            words.forEach(w => {
                const start = parseFloat(w.dataset.start);
                const end = parseFloat(w.dataset.end);
                if (time >= start && time <= end) {
                    w.classList.add('active');
                    activeWord = w;
                } else {
                    w.classList.remove('active');
                }
            });
            if(activeWord) {
                activeWord.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
            }
        }

        if(playBtn) playBtn.onclick = togglePlay;
        if(scrubber) scrubber.onclick = (e) => {
            if(!mediaEl) return;
            const rect = scrubber.getBoundingClientRect();
            mediaEl.currentTime = ((e.clientX - rect.left) / rect.width) * mediaEl.duration;
        };
        
        // Speed toggle
        const speedBtn = root.querySelector('#k-speed-btn');
        if (speedBtn) {
            speedBtn.onclick = () => {
                if(!mediaEl) return;
                let currentRate = mediaEl.playbackRate;
                if(currentRate === 1) mediaEl.playbackRate = 1.25;
                else if(currentRate === 1.25) mediaEl.playbackRate = 1.5;
                else if(currentRate === 1.5) mediaEl.playbackRate = 2.0;
                else mediaEl.playbackRate = 1.0;
                speedBtn.innerText = mediaEl.playbackRate + 'x';
            };
        }

        // Skip buttons
        const rwBtn = root.querySelector('#k-rw-btn');
        const ffBtn = root.querySelector('#k-ff-btn');
        if (rwBtn) rwBtn.onclick = () => { if(mediaEl) mediaEl.currentTime = Math.max(0, mediaEl.currentTime - 30); };
        if (ffBtn) ffBtn.onclick = () => { if(mediaEl) mediaEl.currentTime = Math.min(mediaEl.duration, mediaEl.currentTime + 30); };

        // Previous / Next Buttons
        const prevBtn = root.querySelector('#k-prev-btn');
        const nextBtn = root.querySelector('#k-next-btn');
        if (prevBtn) prevBtn.onclick = () => { loadChapter(currentIndex - 1); setTimeout(togglePlay, 500); };
        if (nextBtn) nextBtn.onclick = () => { loadChapter(currentIndex + 1); setTimeout(togglePlay, 500); };

        // Read along / Mark buttons
        const markBtn = root.querySelector('#k-mark-btn');
        if (markBtn) markBtn.onclick = () => {
            root.classList.remove('k-mode-reading');
        };
        if (textBtn) textBtn.onclick = () => {
            if (transcriptData && transcriptData.length > 0) root.classList.add('k-mode-reading');
        };

        // ... (existing code above) ...
        loadChapter(0);
    } // Closes initPlayer()

    // 🚀 FIXED: Properly closed applyBloomTheme function and main DOMContentLoaded wrapper
    function applyBloomTheme(bgHex, panelHex, textHex, accentHex) {
        const root = document.getElementById('bloom-player-root');
        if (root) {
            root.style.background = bgHex;
            root.style.color = textHex;
        }
        
        const sticky = document.getElementById('bloom-sticky-footer');
        if (sticky) {
            sticky.style.background = panelHex;
            sticky.style.borderColor = bgHex === '#f8fafc' ? '#e2e8f0' : '#30363d';
        }
        
        const headers = document.querySelectorAll('#bloom-player-root h1, #bloom-player-root h4');
        headers.forEach(h => {
            h.style.color = bgHex === '#f8fafc' ? '#0f172a' : '#ffffff';
        });

        const playBtn = document.getElementById('bloom-master-play');
        const scrubBar = document.getElementById('bloom-scrub-bar');
        if (playBtn) {
            playBtn.style.background = accentHex;
            playBtn.style.color = bgHex === '#f8fafc' ? '#ffffff' : '#000000';
            playBtn.style.boxShadow = `0 4px 12px ${accentHex}40`;
        }
        if (scrubBar) {
            scrubBar.style.accentColor = accentHex;
        }
    } // This closes applyBloomTheme()
}); // This closes DOMContentLoaded
