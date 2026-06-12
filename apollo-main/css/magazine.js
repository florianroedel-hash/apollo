// ---------------------------------------------------------------------------
// MAGAZINE
// ---------------------------------------------------------------------------
let magAudio = null;
let magAudioState = 'audio';
let currentIssueIndex = -1;

window.openMagazine = function(issueIndex) {
    if (magazineData.length === 0) return;
    
    if (typeof issueIndex !== 'undefined') {
        currentIssueIndex = issueIndex;
    } else {
        currentIssueIndex = magazineData.length - 1; // Default to latest issue
    }
    
    magCurrentPage = 0;
    magAudioState = 'audio';
    if (magAudio) { magAudio.pause(); magAudio = null; }
    
    document.body.classList.add('magazine-open');
    let over = document.getElementById('magazine-reader-overlay');
    if (!over) {
        over = document.createElement('div');
        over.id = 'magazine-reader-overlay';
        document.body.appendChild(over);
    }
    
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
        const pages = magazineData[currentIssueIndex].pages || [];
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
    const mag = magazineData[currentIssueIndex].images || [];
    const leaves = Math.ceil(mag.length / 2);
    
    if (magAudio) { magAudio.pause(); magAudio = null; magAudioState = 'audio'; }

    // Only use real chapter data — no fallback. If none, dial shows just "cover".
    let chaptersData = (magazineData[currentIssueIndex].chapters && magazineData[currentIssueIndex].chapters.length > 0)
        ? magazineData[currentIssueIndex].chapters
        : [];

    let html = '';
    const isMobile = window.innerWidth <= 900;

    if (isMobile) {
        window._magSpreadView = window._magSpreadView || false;
        html += '<div class="mobile-magazine-feed" style="width: 100vw; height: 100svh; overflow-y: auto; z-index: 10; scroll-snap-type: y mandatory;">';

        if (window._magSpreadView) {
            html += '<div style="display: flex; flex-direction: column; align-items: center; gap: 2rem;">';
            for (let i = 0; i < leaves; i++) {
                html += '<div class="mag-page-row" style="display: flex; width: 95vw; justify-content: center; scroll-snap-align: center; transition: opacity 0.5s ease;">';
                if (mag[i*2]) html += `<img src="${getSafeImg(mag[i*2])}" style="width: 50%; height: auto;">`;
                if (mag[i*2+1]) html += `<img src="${getSafeImg(mag[i*2+1])}" style="width: 50%; height: auto;">`;
                html += '</div>';
            }
            html += '</div>';
        } else {
            html += '<div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">';
            mag.forEach(imgUrl => {
                if(imgUrl) html += `<img class="mag-page-row" src="${getSafeImg(imgUrl)}" style="width: 90vw; height: auto; scroll-snap-align: center; transition: opacity 0.5s ease;">`;
            });
            html += '</div>';
        }
        html += '</div>';

        // Mobile: Vertical scrolling feed
        over.innerHTML = `
            <div class="close-minus" onclick="closeMagazine()" ontouchstart="closeMagazine()">–</div>
            ${html}
        `;

        // Build the magazine swipe dial inside the filterBar
        buildMagazineDial(chaptersData);

    } else {
        // Desktop: book-flip view with minus and chapter footer
        for (let i = 0; i < leaves; i++) {
            let offsetStyle = '';
            if (i >= magCurrentPage) {
                // Right side stack: bottom pages offset further right (outwards)
                let rightStackIndex = i - magCurrentPage;
                offsetStyle = `transform: translateX(${rightStackIndex * 3}px);`;
            } else {
                // Left side stack: bottom pages offset further local-left (which translates to global left, outwards)
                let leftStackIndex = (magCurrentPage - 1) - i;
                offsetStyle = `transform: translateX(${-leftStackIndex * 3}px);`;
            }

            html += `<div class="book-leaf ${i < magCurrentPage ? 'flipped' : ''}" style="z-index:${i < magCurrentPage ? i : 1000 - i}" onclick="magCurrentPage = (magCurrentPage == ${i} ? ${i+1} : ${i}); updateMagazineView()">
                <div class="page-front">${mag[i*2] ? `<div class="page-img-wrapper" style="${offsetStyle}"><img src="${getSafeImg(mag[i*2])}" alt="Magazine Page"></div>` : ''}</div>
                <div class="page-back">${mag[i*2+1] ? `<div class="page-img-wrapper" style="${offsetStyle}"><img src="${getSafeImg(mag[i*2+1])}" alt="Magazine Page"></div>` : ''}</div>
            </div>`;
        }

        let chaptersHtml = chaptersData.map((ch, idx) => {
            let nextChPage = (idx < chaptersData.length - 1) ? chaptersData[idx+1].page : Infinity;
            let isActive = magCurrentPage >= ch.page && magCurrentPage < nextChPage;
            return `
                <span class="highlight-link ${isActive ? 'active-tag' : ''}" onclick="event.stopPropagation(); magCurrentPage = ${ch.page}; updateMagazineView()">${ch.name}</span>
            `;
        }).join('');

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
    filterBar.classList.remove('tags-collapsed', 'tags-expanded', 'hover-expanded', 'mag-chapters-collapsed', 'mag-chapters-expanded');

    let chaptersToUse = chaptersData.length > 0 ? chaptersData : [{name: 'cover', page: 0}];

    const mag = magazineData[currentIssueIndex].images || [];
    const leaves = Math.ceil(mag.length / 2);
    const pageCount = window._magSpreadView ? leaves : mag.length;

    let currentChapterId = "0";
    for (let i = 0; i < pageCount; i++) {
        let ch = chaptersToUse.find(c => parseInt(c.page, 10) === i);
        
        const btn = document.createElement('span');
        btn.className = 'tag-filter highlight-link mag-chapter-item';
        btn.dataset.page = i;
        
        if (ch) {
            currentChapterId = i.toString();
            btn.innerText = ch.name;
            btn.dataset.isChapter = "true";
            btn.dataset.chapterId = currentChapterId;
        } else {
            btn.className += ' mag-chapter-dot';
            btn.innerText = '•';
            btn.dataset.isChapter = "false";
            btn.dataset.chapterId = currentChapterId;
        }
        
        if (i === 0) btn.id = 'mag-dial-cover-btn';
        filterBar.appendChild(btn);
    }

    window.updateMagDialDots = function(activePage) {
        const filterBar = document.getElementById('filter-bar');
        if (!filterBar) return;
        const activeBtn = filterBar.children[activePage];
        if (!activeBtn) return;
        const activeChapterId = activeBtn.dataset.chapterId;
        Array.from(filterBar.children).forEach(btn => {
            if (btn.dataset.isChapter === "false") {
                if (btn.dataset.chapterId === activeChapterId) {
                    btn.classList.add('unfolded');
                } else {
                    btn.classList.remove('unfolded');
                }
            }
        });
    };

    filterBar._magDialActive = true;
    window._blockMagDialActions = true;
    setTimeout(() => { window._blockMagDialActions = false; }, 800);

    setTimeout(() => {
        const first = filterBar.firstElementChild;
        if (first) {
            const cl = filterBar.getBoundingClientRect().width / 2;
            const r = first.getBoundingClientRect();
            filterBar.scrollBy({ left: r.left - filterBar.getBoundingClientRect().left + r.width / 2 - cl, behavior: 'instant' });
            first.classList.add('active-swipe-tag');
            window.updateMagDialDots(0);
        }
    }, 50);

    filterBar.style.opacity = '1';
    filterBar.style.pointerEvents = 'auto';

    window.resetMagDialIdleTimeout = function() {
        filterBar.classList.remove('idle-dial');
        const feed = document.querySelector('.mobile-magazine-feed');
        if (feed) feed.classList.remove('idle-dial');
        
        clearTimeout(window._magDialIdleTimeout);
        window._magDialIdleTimeout = setTimeout(() => {
            if (filterBar._magDialActive) {
                filterBar.classList.add('idle-dial');
                if (feed) feed.classList.add('idle-dial');
            }
        }, 1500);
    };
    
    window.resetMagDialIdleTimeout();

    const feed = document.querySelector('.mobile-magazine-feed');
    if (feed) {
        feed.addEventListener('scroll', () => {
            if (window.resetMagDialIdleTimeout) window.resetMagDialIdleTimeout();
            if (window._ignoreFeedScrollTimeout) return;
            
            const rows = feed.querySelectorAll('.mag-page-row');
            let closestRow = null;
            let minRowDiff = Infinity;
            rows.forEach((row) => {
                const rect = row.getBoundingClientRect();
                const diff = Math.abs(rect.top + rect.height/2 - window.innerHeight / 2); 
                if (diff < minRowDiff) {
                    minRowDiff = diff;
                    closestRow = row;
                }
            });
            rows.forEach(r => r.classList.remove('active-page'));
            if (closestRow) closestRow.classList.add('active-page');

            const imgs = feed.querySelectorAll('img');
            let closestPage = 0;
            let minDiff = Infinity;
            imgs.forEach((img, idx) => {
                const rect = img.getBoundingClientRect();
                const diff = Math.abs(rect.top - window.innerHeight / 3); 
                if (diff < minDiff) {
                    minDiff = diff;
                    closestPage = idx;
                }
            });
            
            const activeBtn = filterBar.children[closestPage];
            if (activeBtn && !activeBtn.classList.contains('active-swipe-tag')) {
                const cl = filterBar.getBoundingClientRect().width / 2;
                const r = activeBtn.getBoundingClientRect();
                window._ignoreFilterBarScroll = Date.now() + 500; 
                filterBar.scrollBy({ left: r.left - filterBar.getBoundingClientRect().left + r.width / 2 - cl, behavior: 'smooth' });
                Array.from(filterBar.children).forEach(c => c.classList.remove('active-swipe-tag'));
                activeBtn.classList.add('active-swipe-tag');
                window.updateMagDialDots(closestPage);
            }
        });
    }
}


