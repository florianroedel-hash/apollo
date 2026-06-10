// ---------------------------------------------------------------------------
// MAGAZINE
// ---------------------------------------------------------------------------
let magAudio = null;
let magAudioState = 'audio';

window.openMagazine = function() {
    if (magazineData.length === 0) return;
    magCurrentPage = 0;
    magAudioState = 'audio';
    if (magAudio) { magAudio.pause(); magAudio = null; }
    
    document.body.classList.add('magazine-open');
    const over = document.createElement('div');
    over.id = 'magazine-reader-overlay';
    document.body.appendChild(over);
    
    window._magEscHandler = (e) => {
        if (e.key === 'Escape') window.closeMagazine();
    };
    document.addEventListener('keydown', window._magEscHandler);
    
    updateMagazineView();
};

window.closeMagazine = function() {
    document.body.classList.remove('magazine-open');
    const over = document.getElementById('magazine-reader-overlay');
    if (over) over.remove();
    if (magAudio) {
        magAudio.pause();
        magAudio = null;
    }
    magAudioState = 'audio';
    
    if (window._magEscHandler) document.removeEventListener('keydown', window._magEscHandler);
    
    // Restore filter bar
    if (window.innerWidth <= 900) {
        // Rebuild the archive tag dial (it was replaced by the magazine dial)
        filterBar._magDialActive = false;
        filterBar.classList.remove('mag-chapters-collapsed', 'mag-chapters-expanded');
        generateDynamicTags();
    } else {
        filterBar.style.opacity = '1';
        filterBar.style.pointerEvents = 'auto';
    }
};

window.toggleMagazineAudio = function() {
    if (!magAudio) {
        magAudio = new Audio();
        const pages = magazineData[0].pages || [];
        const currentPageData = pages[magCurrentPage];
        // Use dummy track if no actual URL
        let trackUrl = (currentPageData && currentPageData.audioUrl)
            ? getSafeImg(currentPageData.audioUrl)
            : "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
        magAudio.src = trackUrl;
        magAudio.loop = true;
    }
    
    if (magAudioState === 'audio' || magAudioState === 'resume') {
        magAudio.play().catch(e => console.log("Audio play failed:", e));
        magAudioState = 'pause';
    } else if (magAudioState === 'pause') {
        magAudio.pause();
        magAudioState = 'resume';
    }
    
    const btn = document.querySelector('.magazine-audio-btn');
    if (btn) btn.innerText = magAudioState;
};

function updateMagazineView() {
    const over = document.getElementById('magazine-reader-overlay');
    if (!over) return;
    const mag = magazineData[0].images;
    const leaves = Math.ceil(mag.length / 2);
    
    if (magAudio) { magAudio.pause(); magAudio = null; magAudioState = 'audio'; }

    // Only use real chapter data — no fallback. If none, dial shows just "cover".
    let chaptersData = (magazineData[0].chapters && magazineData[0].chapters.length > 0)
        ? magazineData[0].chapters
        : [];

    let html = '';
    const isMobile = window.innerWidth <= 900;

    if (isMobile) {
        window._magSpreadView = window._magSpreadView || false;
        html += '<div class="mobile-magazine-feed" style="width: 100vw; height: 100svh; overflow-y: auto; padding-top: 5rem; padding-bottom: 8rem; z-index: 10;">';

        if (window._magSpreadView) {
            html += '<div style="display: flex; flex-direction: column; align-items: center; gap: 2rem;">';
            for (let i = 0; i < leaves; i++) {
                html += '<div style="display: flex; width: 95vw; justify-content: center;">';
                if (mag[i*2]) html += `<img src="${getSafeImg(mag[i*2])}" style="width: 50%; height: auto;">`;
                if (mag[i*2+1]) html += `<img src="${getSafeImg(mag[i*2+1])}" style="width: 50%; height: auto;">`;
                html += '</div>';
            }
            html += '</div>';
        } else {
            html += '<div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">';
            mag.forEach(imgUrl => {
                if(imgUrl) html += `<img src="${getSafeImg(imgUrl)}" style="width: 90vw; height: auto;">`;
            });
            html += '</div>';
        }
        html += '</div>';

        // No minus button, no static footer on mobile — dial replaces filterBar
        over.innerHTML = `<div class="magazine-scene">${html}</div>`;

        // Build the magazine swipe dial inside the filterBar
        buildMagazineDial(chaptersData);

    } else {
        // Desktop: book-flip view with minus and chapter footer
        for (let i = 0; i < leaves; i++) {
            html += `<div class="book-leaf ${i < magCurrentPage ? 'flipped' : ''}" style="z-index:${i < magCurrentPage ? i : 1000 - i}" onclick="magCurrentPage = (magCurrentPage == ${i} ? ${i+1} : ${i}); updateMagazineView()">
                <div class="page-front">${mag[i*2] ? `<img src="${getSafeImg(mag[i*2])}" alt="Magazine Page" style="background: #e0e0e0;">` : ''}</div>
                <div class="page-back">${mag[i*2+1] ? `<img src="${getSafeImg(mag[i*2+1])}" alt="Magazine Page" style="background: #e0e0e0;">` : ''}</div>
            </div>`;
        }

        let chaptersHtml = chaptersData.map(ch => `
            <span class="highlight-link ${magCurrentPage === ch.page ? 'active-tag' : ''}" onclick="event.stopPropagation(); magCurrentPage = ${ch.page}; updateMagazineView()">${ch.name}</span>
        `).join('');

        let audioBtnHtml = `<div class="magazine-audio-btn" onclick="event.stopPropagation(); toggleMagazineAudio()">${magAudioState}</div>`;

        over.innerHTML = `
            <div class="close-minus" onclick="closeMagazine()" ontouchstart="closeMagazine()">–</div>
            <div class="magazine-scene">${html}</div>
            <div class="magazine-footer">
                <div class="magazine-chapters">${chaptersHtml}</div>
            </div>
        `;

        filterBar.style.opacity = '0';
        filterBar.style.pointerEvents = 'none';
    }
}

// Build the swipe dial in the filterBar for the mobile magazine view
function buildMagazineDial(chaptersData) {
    filterBar.innerHTML = '';
    filterBar.classList.remove('tags-collapsed', 'tags-expanded', 'hover-expanded');

    // "cover" — snapping here closes magazine
    const coverBtn = document.createElement('span');
    coverBtn.id = 'mag-dial-cover-btn';
    coverBtn.className = 'tag-filter highlight-link';
    coverBtn.innerText = 'cover';
    coverBtn.onclick = () => {
        const cl = filterBar.getBoundingClientRect().width / 2;
        const r = coverBtn.getBoundingClientRect();
        filterBar.scrollBy({ left: r.left - filterBar.getBoundingClientRect().left + r.width / 2 - cl, behavior: 'smooth' });
    };
    filterBar.appendChild(coverBtn);

    // "chapters" bridge — only add if there are real chapters
    if (chaptersData.length > 0) {
        const chaptersBtn = document.createElement('span');
        chaptersBtn.id = 'mag-dial-chapters-btn';
        chaptersBtn.className = 'tag-filter highlight-link mag-chapters-toggle';
        chaptersBtn.innerText = 'chapters';
        filterBar.appendChild(chaptersBtn);

        // Individual chapter items (collapsed by default)
        chaptersData.forEach((ch) => {
            const btn = document.createElement('span');
            btn.className = 'tag-filter highlight-link mag-chapter-item';
            btn.dataset.page = ch.page;
            btn.innerText = ch.name;
            btn.onclick = () => {
                magCurrentPage = ch.page;
                updateMagazineView();
            };
            filterBar.appendChild(btn);
        });
    }

    // Start collapsed; mark active BEFORE any scroll events fire
    filterBar.classList.add('mag-chapters-collapsed');
    filterBar._magDialActive = true;

    // Block actions for 800ms so the initial auto-scroll to "cover"
    // doesn't immediately trigger closeMagazine()
    window._blockMagDialActions = true;
    setTimeout(() => { window._blockMagDialActions = false; }, 800);

    // Scroll to "cover" silently — no dispatchEvent (that was the bug)
    setTimeout(() => {
        const cl = filterBar.getBoundingClientRect().width / 2;
        const r = coverBtn.getBoundingClientRect();
        filterBar.scrollBy({ left: r.left - filterBar.getBoundingClientRect().left + r.width / 2 - cl, behavior: 'instant' });
    }, 50);

    // Reveal the dial
    filterBar.style.opacity = '1';
    filterBar.style.pointerEvents = 'auto';
}


