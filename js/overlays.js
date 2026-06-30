window.openSearchOverlay = function() {
    const over = document.createElement('div');
    over.id = 'search-overlay';
    over.classList.add('glass-overlay');
    over.style.display = 'flex';
    over.style.flexDirection = 'column';
    over.style.alignItems = 'center';
    over.style.justifyContent = 'center';
    over.style.paddingTop = '0';
    over.style.zIndex = '100004';

    document.body.classList.add('search-open');

    window.closeSearchOverlay = function(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const over = document.getElementById('search-overlay');
        if (over) over.remove();
        document.removeEventListener('keydown', window._searchEscHandler);
        document.body.classList.remove('search-open');
        
        // Prevent ghost click on the + button underneath
        window._blockMenuToggle = true;
        setTimeout(() => { window._blockMenuToggle = false; }, 400);

        // Dial back to 'all' automatically
        const allBtn = document.getElementById('filter-bar-all-btn');
        if (allBtn) allBtn.click();
    };

    over.innerHTML = `
        <div class="close-minus mobile-only-close" style="z-index: 100005;" onclick="window.closeSearchOverlay(event)" ontouchstart="window.closeSearchOverlay(event)">–</div>
        <input type="text" id="project-search-input" placeholder="search archive..." autocomplete="off" spellcheck="false">
        <div id="search-results-grid"></div>
    `;

    document.body.appendChild(over);

    window._searchEscHandler = (e) => {
        if (e.key === 'Escape') {
            over.remove();
            document.removeEventListener('keydown', window._searchEscHandler);
            document.body.classList.remove('search-open');
        }
    };
    document.addEventListener('keydown', window._searchEscHandler);

    const input = document.getElementById('project-search-input');
    const grid = document.getElementById('search-results-grid');
    
    input.focus();

    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        grid.innerHTML = '';
        if (!query) return;

        let matches = archiveData.filter(p => {
            const name = (p.metadata.name || '').toLowerCase();
            const desc = (p.metadata.description || '').toLowerCase();
            return name.includes(query) || desc.includes(query);
        });

        matches = matches.slice(0, window.innerWidth <= 900 ? 2 : 5);

        matches.forEach(p => {
            const card = document.createElement('div');
            card.className = 'search-result-card';
            card.innerHTML = `
                <img src="${getSafeImg(p.titleImage)}" alt="${p.metadata.name}">
                <div class="search-result-title">${p.metadata.name}</div>
            `;
            card.onclick = () => {
                document.removeEventListener('keydown', window._searchEscHandler);
                document.body.classList.remove('search-open');
                window.cameFromSearch = true;
                unfoldProject(p.id);
            };
            grid.appendChild(card);
        });
    });
};


// ---------------------------------------------------------------------------
// HISTORY
// ---------------------------------------------------------------------------
window.toggleAudioCategory = function(catId) {
    const el = document.getElementById(catId);
    if (el) {
        if (el.style.display === 'none') {
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
            // Clear player when collapsing
            const container = document.getElementById('audio-player-container');
            if (container) container.innerHTML = '';
            if (globalAudio) { globalAudio.pause(); globalAudio = null; }
        }
    }
};

window.openHistory = function() {
    const colArch = document.getElementById('col-archive');
    if (colArch) colArch.style.opacity = '0';
    const marquee = document.querySelector('.marquee-wrapper');
    if (marquee) marquee.style.opacity = '0';
    
    document.body.classList.add('spread-open');
    document.body.classList.add('history-open');
    const over = document.createElement('div');
    over.id = 'unfold-overlay';
    over.classList.add('glass-overlay'); // Adds the blur effect matching magazine
    
    const filterBar = document.getElementById('filter-bar');
    if (filterBar) {
        filterBar.style.opacity = '0';
        filterBar.style.pointerEvents = 'none';
    }
    
    const dummyHistory = [
        { title: "Founding 2019", text: "Apollo was founded in 2019 as a student initiative to create a space for architectural discourse..." },
        { title: "First Exhibition 2020", text: "The first major exhibition took place in 2020, showcasing works from over forty students across three universities..." },
        { title: "Digital Pivot 2021", text: "In 2021, Apollo pivoted to a digital-first format, pioneering the web-based archive format you see today..." },
        { title: "Magazine Launch 2022", text: "The Apollo Magazine launched in 2022 as a curated editorial platform for longform architectural writing..." },
        { title: "Present Day 2026", text: "Today, Apollo operates as a fully independent platform with contributors from across Europe and beyond..." }
    ];    let parsedDocs = (historyData && historyData.length > 0) ? historyData : dummyHistory;
    
    // Sort descending by date so newest is left (index 0) and oldest is right
    parsedDocs.sort((a, b) => {
        const dateA = a.Date || a.date || '';
        const dateB = b.Date || b.date || '';
        if (dateA && dateB) {
            return new Date(dateB) - new Date(dateA);
        }
        return 0;
    });

    let sheetsHtml = parsedDocs.map((doc, i) => {
        const title = doc['Name / File'] || doc.name || doc.title || 'Untitled';
        const text = doc.text || doc.content || '';
        const imageUrl = doc['Image URL'] || doc.imageUrl || '';
        const audioUrl = getHDImageUrl(doc['Audio URL'] || doc.audioUrl || '');
        
        const alignmentClass = (i % 2 === 0) ? 'align-top' : 'align-bottom';
        
        let imageHtml = '';
        if (imageUrl) {
            if (imageUrl.toLowerCase().trim().endsWith('.mp4')) {
                const realUrl = imageUrl.trim().slice(0, -4);
                imageHtml = `<video src="${getHDImageUrl(realUrl)}" class="history-partition-image" autoplay loop muted playsinline></video>`;
            } else {
                imageHtml = `<img src="${getSafeImg(imageUrl)}" class="history-partition-image" alt="${title}" />`;
            }
        }
        let audioHtml = audioUrl ? `
            <div style="margin-top: 0.5rem; text-align: left;">
                <span class="magazine-audio-btn mag-listen-btn" style="font-family: 'Ufficio', sans-serif; font-size: inherit; opacity: 1; text-decoration: none; cursor: pointer;" onclick="event.stopPropagation(); if(typeof toggleMagazineAudio === 'function') toggleMagazineAudio('${audioUrl}')">${typeof magAudioState !== 'undefined' ? magAudioState : 'listen'}</span>
            </div>` : '';

        return `
            <div class="history-partition ${alignmentClass}" data-index="${i}">
                <div class="history-partition-text">
                    <p style="margin-bottom: 0;">${text}</p>
                    ${audioHtml}
                </div>
                <div class="history-partition-title">${title}</div>
                ${imageHtml}
            </div>`;
    }).join('');
    
    window.closeHistory = function(e) {
        if(e) e.preventDefault();
        document.body.classList.remove('spread-open'); 
        document.body.classList.remove('history-open'); 
        if (over._resizeHandler) window.removeEventListener('resize', over._resizeHandler);
        over.remove(); 
        const colArch = document.getElementById('col-archive');
        if (colArch) colArch.style.opacity = '1'; 
        const mq = document.querySelector('.marquee-wrapper'); 
        if (mq) mq.style.opacity='1'; 
        const fb = document.getElementById('filter-bar'); 
        if (fb) { fb.style.opacity=''; fb.style.pointerEvents=''; }
        if (window.innerWidth <= 900 && typeof window.updateMobileTitles === 'function') window.updateMobileTitles();
    };

    over.innerHTML = `
        <div class="close-minus" onclick="window.closeHistory(event)" ontouchstart="window.closeHistory(event)">–</div>
        <div class="history-pile-wrapper" id="history-scroll-container">
            <div class="history-endless-roll">
                <div class="history-paper-strip">
                    ${sheetsHtml}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(over);

    const scrollContainer = document.getElementById('history-scroll-container');
    
    // Give browser a moment to mount before measuring columns
    if (scrollContainer) {
        
        function updatePartitionWidths() {
            const parts = over.querySelectorAll('.history-partition');
            
            // 1. Reset widths to let CSS calculate base minimums
            parts.forEach(p => {
                p.style.width = '';
            });
            
            // Force browser layout calculation
            void scrollContainer.offsetHeight;
            
            // 2. Expand width to encapsulate overflowed columns
            parts.forEach(p => {
                const textContainer = p.querySelector('.history-partition-text');
                if (textContainer) {
                    const range = document.createRange();
                    range.selectNodeContents(textContainer);
                    const rect = range.getBoundingClientRect();
                    
                    const containerRect = textContainer.getBoundingClientRect();
                    
                    const visualWidth = rect.right - containerRect.left;
                    const cssWidth = textContainer.offsetWidth; 
                    
                    if (visualWidth > cssWidth) {
                        const extraWidthNeeded = visualWidth - cssWidth;
                        p.style.width = (p.offsetWidth + extraWidthNeeded) + 'px';
                    }
                }
            });
        }

        // Run once strictly after layout painting
        setTimeout(updatePartitionWidths, 100);
        
        // And recalculate on window resize
        window.addEventListener('resize', updatePartitionWidths);
        over._resizeHandler = updatePartitionWidths;

        // Desktop horizontal scroll mapping
        scrollContainer.addEventListener('wheel', (e) => {
            // Only map if deltaY exists and deltaX is very small (standard mouse wheel, not trackpad swipe)
            if (Math.abs(e.deltaY) > 0 && Math.abs(e.deltaX) < 10) {
                e.preventDefault();
                scrollContainer.scrollLeft += e.deltaY * 1.5;
            }
        });
    }
};

// ---------------------------------------------------------------------------
// AUDIO LIBRARY (Deep Linked)
// ---------------------------------------------------------------------------
let globalAudio = null;

window.closeAudioLibrary = function() {
    document.body.classList.remove('spread-open');
    document.body.classList.remove('history-open');
    document.body.classList.remove('audio-library-open');
    const over = document.getElementById('unfold-overlay');
    if (over) over.remove();
    const colArch = document.getElementById('col-archive');
    if (colArch) {
        colArch.style.opacity = '1';
        colArch.style.pointerEvents = '';
    }
    const mq = document.querySelector('.marquee-wrapper');
    if (mq) mq.style.opacity = '1';
    const fb = document.getElementById('filter-bar');
    if (fb) { fb.style.opacity = ''; fb.style.pointerEvents = ''; }
    const mf = document.getElementById('main-footer');
    if (mf) { mf.style.opacity = ''; mf.style.pointerEvents = ''; }
    
    if (window.innerWidth <= 900 && typeof window.updateMobileTitles === 'function') {
        window.updateMobileTitles();
    }
    
    if (globalAudio) {
        globalAudio.pause();
        globalAudio = null;
    }
    
    // In case there is a URL param, remove it without reloading
    if (window.history.pushState) {
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({path:newUrl}, '', newUrl);
    }
};

window.flatAudioTracks = [];
window.currentAudioIndex = 0;

window.openAudioLibrary = function() {
    document.body.classList.add('spread-open');
    document.body.classList.add('audio-library-open');
    const over = document.createElement('div');
    over.id = 'unfold-overlay';
    over.classList.add('glass-overlay'); // Dark blurred bg

    // Hide ARCHIVE header and filter tags
    const colArch = document.getElementById('col-archive');
    if (colArch) { colArch.style.opacity = '0'; colArch.style.pointerEvents = 'none'; }
    const filterBar = document.getElementById('filter-bar');
    if (filterBar) {
        filterBar.style.opacity = '0';
        filterBar.style.pointerEvents = 'none';
    }
    const mainFooter = document.getElementById('main-footer');
    if (mainFooter) {
        mainFooter.style.opacity = '0';
        mainFooter.style.pointerEvents = 'none';
    }
    
    // Group real data by Category
    const grouped = {};
    const safeAudioData = (audioData && audioData.length > 0) ? audioData : [];
    
    safeAudioData.forEach(item => {
        const category = item.category || 'misc';
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(item);
    });

    window.flatAudioTracks = [];
    let listHtml = '';
    let mobileDialHtml = '';
    let trackGlobalIndex = 0;

    for (const cat in grouped) {
        mobileDialHtml += `<div class="desktop-chapter-group">`;
        
        let subItems = grouped[cat].map((item, catIdx) => {
            window.flatAudioTracks.push(item);
            
            // Build mobile dial
            if (catIdx === 0) {
                mobileDialHtml += `<span class="highlight-link mag-page-item" data-audio-idx="${trackGlobalIndex}" onclick="event.stopPropagation(); playAudioTrack('${item.file}')">${cat}</span>`;
            } else {
                mobileDialHtml += `<span class="mag-chapter-dot mag-page-item" data-audio-idx="${trackGlobalIndex}" style="--stagger-idx: ${catIdx};" onclick="event.stopPropagation(); playAudioTrack('${item.file}')"></span>`;
            }
            trackGlobalIndex++;
            
            // Build desktop list
            return `<div class="audio-track-link" id="audio-link-${item.file}" onclick="playAudioTrack('${item.file}')">${item.title}</div>`;
        }).join('');
        
        mobileDialHtml += `</div>`;
        
        listHtml += `
            <div>
                <div class="audio-category" onclick="this.classList.toggle('expanded')">${cat}</div>
                <div class="audio-sublist">${subItems}</div>
            </div>
        `;
    }

    over.innerHTML = `
        <div class="close-minus" onclick="closeAudioLibrary()" ontouchstart="closeAudioLibrary()">–</div>
        <div class="audio-library-wrapper" id="audio-library-wrapper">
            <div class="audio-left-col">
                ${listHtml}
            </div>
            <div class="audio-right-col" id="audio-player-container">
                <!-- Player UI will load here -->
            </div>
            <div class="audio-mobile-footer mobile-only">
                <div class="audio-mobile-chapters">${mobileDialHtml}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(over);
    
    if (window.flatAudioTracks.length > 0) {
        playAudioTrack(window.flatAudioTracks[0].file);
    }
    
    initAudioMobileSwiper();
};

window.playAudioTrack = function(fileId) {
    const trackIdx = window.flatAudioTracks.findIndex(t => t.file === fileId);
    if (trackIdx === -1) return;
    
    window.currentAudioIndex = trackIdx;
    const track = window.flatAudioTracks[trackIdx];
    
    if (globalAudio) {
        globalAudio.pause();
        globalAudio = null;
    }

    const container = document.getElementById('audio-player-container');
    if (!container) return;
    
    let parsedUrl = track.file;
    if (!parsedUrl.startsWith('http') && /^[a-zA-Z0-9_-]{25,40}$/.test(parsedUrl)) {
        parsedUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${parsedUrl}`;
    } else if (parsedUrl.includes('drive.google.com')) {
        const idMatch = parsedUrl.match(new RegExp("(?:id=|/d/)([a-zA-Z0-9_-]+)"));
        if (idMatch) {
            parsedUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${idMatch[1]}`;
        }
    }

    let shareUrl = window.location.origin + window.location.pathname + "?audio=" + track.file;

    container.innerHTML = `
        <div class="audio-player-ui" style="max-width: 380px;">
            <div class="note-ref-code">[ REF: AUDIO-${track.file.substring(0,6).toUpperCase()} ]</div>
            <div class="note-divider"></div>
            <div class="note-title" style="font-size: 1.8em; margin: 1rem 0;">${track.title}</div>
            <div class="note-divider"></div>
            <div class="note-meta-grid">
                <div>Year</div><div>${track.year || '2026'}</div>
                <div>Category</div><div>${track.category || 'Archive'}</div>
                <div>Type</div><div>${track.type || 'Audio'}</div>
                <div>Format</div><div>${track.format || 'MP3'}</div>
            </div>
            <div class="note-divider"></div>
            <div class="note-text-content" style="display: block; -webkit-line-clamp: unset; overflow: visible; font-size: 1.1em; line-height: 1.6; margin-top: 1rem;">${track.desc}</div>
        </div>
        <div class="magazine-audio-controls" style="position: static; transform: none; margin-top: 1.5rem;">
            <div class="magazine-audio-btn" id="library-audio-btn" onclick="toggleLibraryAudio('${parsedUrl}')">listen</div>
            <div class="magazine-audio-btn" onclick="navigator.clipboard.writeText('${shareUrl}'); this.innerText='copied ↗'; setTimeout(()=>this.innerText='share ↗', 2000)">share ↗</div>
        </div>
    `;

    // Highlight desktop links
    document.querySelectorAll('.audio-track-link').forEach(el => el.classList.remove('active-track'));
    const linkEl = document.getElementById('audio-link-' + track.file);
    if (linkEl) {
        linkEl.classList.add('active-track');
        linkEl.previousElementSibling?.classList.add('expanded');
    }
    
    // Highlight mobile dial
    document.querySelectorAll('.audio-mobile-chapters .desktop-chapter-group').forEach(el => el.classList.remove('active-group'));
    document.querySelectorAll('.audio-mobile-chapters .mag-page-item').forEach(el => {
        el.classList.remove('active-tag', 'active-swipe-tag');
        if (parseInt(el.dataset.audioIdx) === window.currentAudioIndex) {
            el.classList.add('active-tag');
            if (el.classList.contains('mag-chapter-dot')) el.classList.add('active-swipe-tag');
            el.closest('.desktop-chapter-group')?.classList.add('active-group');
        }
    });
};

window.toggleLibraryAudio = function(url) {
    const btn = document.getElementById('library-audio-btn');
    if (!globalAudio) {
        globalAudio = new Audio(url);
        globalAudio.loop = true;
    }
    
    if (globalAudio.paused) {
        globalAudio.play();
        btn.innerText = 'pause';
    } else {
        globalAudio.pause();
        btn.innerText = 'resume';
    }
};

window.initAudioMobileSwiper = function() {
    const wrapper = document.getElementById('audio-library-wrapper');
    if (!wrapper) return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    
    wrapper.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, {passive: true});
    
    wrapper.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleAudioSwipe();
    }, {passive: true});
    
    function handleAudioSwipe() {
        if (window.innerWidth > 900) return; // Only active on mobile
        
        const swipeThreshold = 50;
        if (touchEndX < touchStartX - swipeThreshold) {
            // Swipe Left -> Next Track
            if (window.currentAudioIndex < window.flatAudioTracks.length - 1) {
                playAudioTrack(window.flatAudioTracks[window.currentAudioIndex + 1].file);
            }
        } else if (touchEndX > touchStartX + swipeThreshold) {
            // Swipe Right -> Prev Track
            if (window.currentAudioIndex > 0) {
                playAudioTrack(window.flatAudioTracks[window.currentAudioIndex - 1].file);
            }
        }
    }
};


window.exitGridMode = function() {
    window._blockTagDialActions = true;
    setTimeout(() => { window._blockTagDialActions = false; }, 500); // Auto-unlock tag dial actions after reflow
    
    // Collapse dynamic tags
    filterBar.classList.remove('tags-expanded', 'hover-expanded');
    filterBar.classList.add('tags-collapsed');
    
    document.body.classList.remove('grid-mode');
    document.querySelectorAll('.tag-filter').forEach(b => b.classList.remove('active-tag'));
    window._lastFilteredTag = null; // Allow re-dialing the same tag after returning to 'all'
    
    // Also close the search overlay if it's currently open
    const searchOverlay = document.getElementById('search-overlay');
    if (searchOverlay) {
        searchOverlay.remove();
        document.removeEventListener('keydown', window._searchEscHandler);
        document.body.classList.remove('search-open');
    }
    
    renderPile(archiveData, false);
    
    // Force synchronous layout update and instant scroll to prevent visual flash of calendar slide
    mobileWrapper.style.scrollBehavior = 'auto';
    const forceReflow = mobileWrapper.offsetHeight; 
    mobileWrapper.scrollLeft = window.innerWidth;
    updateMobileTitles();
    
    // Force scroll to top immediately and after DOM/layout updates settle
    window.scrollTo(0, 0);
    setTimeout(() => window.scrollTo(0, 0), 50);
    setTimeout(() => window.scrollTo(0, 0), 150);
};



document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (document.body.classList.contains('grid-mode')) {
            renderPile(archiveData, false);
        }
    }
});
