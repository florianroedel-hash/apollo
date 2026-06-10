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
    ];

    const docs = (historyData && historyData.length > 0) ? historyData : dummyHistory;
    const N = docs.length;
    const latchW = 100 / N; 
    
    let sheetsHtml = docs.map((doc, i) => {
        const angle = (Math.random() * 8 - 4); 
        const dx = (Math.random() * 4 - 2); 
        const dy = (Math.random() * 3 - 1.5); 
        const zIdx = N - i;
        const latchLeft = i * latchW; 
        return `
            <div class="history-sheet" 
                 style="transform: rotate(${angle}deg) translate(${dx}vw, ${dy}vw); z-index: ${zIdx};"
                 data-index="${i}"
                 onclick="historyShuffleToBack(this, event)">
                <div class="history-latch" style="left: ${latchLeft}%; width: ${latchW}%;">
                    <span class="history-latch-title">${doc.title}</span>
                </div>
                <div class="history-sheet-content">
                    <p>${doc.text}</p>
                </div>
            </div>`;
    }).join('');
    
    over.innerHTML = `
        <div class="close-minus" onclick="document.body.classList.remove('spread-open'); document.body.classList.remove('history-open'); this.parentElement.remove(); document.getElementById('col-archive').style.opacity = '1'; const mq=document.querySelector('.marquee-wrapper'); if(mq) mq.style.opacity='1'; const fb=document.getElementById('filter-bar'); if(fb){ fb.style.opacity=''; fb.style.pointerEvents=''; }" ontouchstart="document.body.classList.remove('spread-open'); document.body.classList.remove('history-open'); this.parentElement.remove(); document.getElementById('col-archive').style.opacity = '1'; const mq=document.querySelector('.marquee-wrapper'); if(mq) mq.style.opacity='1'; const fb=document.getElementById('filter-bar'); if(fb){ fb.style.opacity=''; fb.style.pointerEvents=''; }">–</div>
        <div class="history-pile-wrapper">
            <div class="history-pile">
                ${sheetsHtml}
            </div>
        </div>
    `;
    
    document.body.appendChild(over);
};

window.historyShuffleToBack = function(sheet, event) {
    event.stopPropagation();
    const pile = sheet.parentElement;
    const allSheets = Array.from(pile.querySelectorAll('.history-sheet'));
    const maxZ = Math.max(...allSheets.map(s => parseInt(s.style.zIndex || '0')));
    if (parseInt(sheet.style.zIndex) !== maxZ) return;
    
    sheet.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
    sheet.style.opacity = '0';
    sheet.style.transform += ' translateY(-8vw) rotate(15deg)';
    
    setTimeout(() => {
        pile.appendChild(sheet); 
        const sheets = Array.from(pile.querySelectorAll('.history-sheet'));
        const N = sheets.length;
        sheets.forEach((s, idx) => {
            s.style.zIndex = N - idx;
        });
        const angle = (Math.random() * 8 - 4);
        const dx = (Math.random() * 4 - 2);
        const dy = (Math.random() * 3 - 1.5);
        sheet.style.transition = 'none';
        sheet.style.opacity = '0';
        sheet.style.transform = `rotate(${angle}deg) translate(${dx}vw, ${dy}vw)`;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                sheet.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
                sheet.style.opacity = '1';
            });
        });
    }, 500);
};

// ---------------------------------------------------------------------------
// AUDIO LIBRARY (Deep Linked)
// ---------------------------------------------------------------------------
let globalAudio = null;

window.openAudioLibrary = function() {
    document.body.classList.add('spread-open');
    document.body.classList.add('audio-library-open');
    const over = document.createElement('div');
    over.id = 'unfold-overlay';
    over.classList.add('glass-overlay'); // Dark blurred bg

    // Hide ARCHIVE header and filter tags
    const colArch = document.getElementById('col-archive');
    if (colArch) { colArch.style.opacity = '0'; colArch.style.pointerEvents = 'none'; }
    filterBar.innerHTML = '';
    filterBar.style.opacity = '';
    filterBar.style.pointerEvents = '';
    
    // Group real data by Category
    const grouped = {};
    const safeAudioData = (audioData && audioData.length > 0) ? audioData : [];
    
    safeAudioData.forEach(item => {
        const category = item.category || 'misc';
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(item);
    });

    let listHtml = '';
    for (const cat in grouped) {
        let subItems = grouped[cat].map(item => `
            <div class="audio-track-link" id="audio-link-${item.file}" onclick="playAudioTrack('${item.file}')">${item.title}</div>
        `).join('');
        listHtml += `
            <div>
                <div class="audio-category" onclick="this.classList.toggle('expanded')">${cat}</div>
                <div class="audio-sublist">${subItems}</div>
            </div>
        `;
    }

    over.innerHTML = `
        <div class="close-minus" onclick="closeAudioLibrary()" ontouchstart="closeAudioLibrary()">–</div>
        <div class="audio-library-wrapper">
            <div class="audio-left-col">
                ${listHtml}
            </div>
            <div class="audio-right-col" id="audio-player-container">
                <!-- Player UI will load here -->
            </div>
        </div>
    `;
    
    document.body.appendChild(over);
};

window.playAudioTrack = function(fileId) {
    const safeAudioData = (audioData && audioData.length > 0) ? audioData : [];
    const track = safeAudioData.find(t => t.file === fileId);
    if (!track) return;
    
    if (globalAudio) {
        globalAudio.pause();
        globalAudio = null;
    }

    const container = document.getElementById('audio-player-container');
    if (!container) return;
    
    globalAudio = new Audio(getSafeImg(track.url));
    
    // Highlight active track
    document.querySelectorAll('.audio-track-link').forEach(el => el.classList.remove('active-track'));
    const activeLink = document.getElementById(`audio-link-${fileId}`);
    if (activeLink) activeLink.classList.add('active-track');
    
    const shareUrl = window.location.origin + window.location.pathname + "?audio=" + fileId;

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
    `;

    // Render the play/pause and share buttons exactly inside the filter bar
    filterBar.innerHTML = `
        <div class="magazine-audio-btn" id="library-audio-btn" onclick="toggleLibraryAudio('${track.url}')">play</div>
        <button class="magazine-audio-btn" onclick="navigator.clipboard.writeText('${shareUrl}'); this.innerText='copied!'; setTimeout(()=>this.innerText='share', 2000)">share</button>
    `;
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
        btn.innerText = 'play';
    }
};

window.closeAudioLibrary = function() {
    document.body.classList.remove('spread-open');
    document.body.classList.remove('audio-library-open');
    const over = document.getElementById('unfold-overlay');
    if (over) over.remove();
    if (globalAudio) {
        globalAudio.pause();
        globalAudio = null;
    }
    
    // Rebuild the tag bar that was overwritten by the audio controls!
    const filterBar = document.getElementById('filter-bar');
    if (filterBar) {
        filterBar.innerHTML = '';
        generateDynamicTags();
    }
    
    // Restore ARCHIVE header and filter tags
    const colArch = document.getElementById('col-archive');
    if (colArch) { colArch.style.opacity = '1'; colArch.style.pointerEvents = 'auto'; }
    filterBar.style.opacity = '1';
    filterBar.style.pointerEvents = 'auto';
    
    // In case there is a URL param, remove it without reloading
    if (window.history.pushState) {
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({path:newUrl}, '', newUrl);
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
