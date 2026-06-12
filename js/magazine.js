// ---------------------------------------------------------------------------
// MAGAZINE
// ---------------------------------------------------------------------------
let magAudio = null;
let magAudioState = 'listen';
let currentIssueIndex = -1;

window.openMagazine = function(issueIndex, startPage = 0) {
    if (magazineData.length === 0) return;
    
    if (typeof issueIndex !== 'undefined') {
        currentIssueIndex = issueIndex;
    } else {
        currentIssueIndex = magazineData.length - 1; // Default to latest issue
    }
    
    magCurrentPage = startPage;
    magAudioState = 'listen';
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
    // Save state before closing
    if (magazineData[currentIssueIndex] && magCurrentPage !== undefined) {
        magazineData[currentIssueIndex].lastPage = magCurrentPage;
    }
    
    document.body.classList.remove('magazine-open');
    const over = document.getElementById('magazine-reader-overlay');
    if (over) over.remove();
    
    // Completely disable all clicks globally for 400ms to absorb any mobile ghost clicks
    document.body.style.pointerEvents = 'none';
    setTimeout(() => { document.body.style.pointerEvents = ''; }, 400);
    
    if (magAudio) {
        magAudio.pause();
        magAudio = null;
    }
    magAudioState = 'listen';
    
    if (window._magEscHandler) document.removeEventListener('keydown', window._magEscHandler);
    
    // Clear URL query parameters
    const url = new URL(window.location);
    url.searchParams.delete('magazine');
    url.searchParams.delete('page');
    window.history.replaceState({}, '', url);
    
    // Restore filter bar
    if (window.innerWidth <= 900) {
        window._blockTagDialActions = true;
        // Rebuild the archive tag dial (it was replaced by the magazine dial)
        filterBar._magDialActive = false;
        filterBar.classList.remove('mag-chapters-collapsed', 'mag-chapters-expanded');
        generateDynamicTags();
        setTimeout(() => { window._blockTagDialActions = false; }, 500);
    } else {
        filterBar.style.opacity = '1';
        filterBar.style.pointerEvents = 'auto';
    }
    
    // Force recalculation of titles and filterBar opacity for the current slide
    if (typeof updateMobileTitles === 'function') updateMobileTitles();
};

window.toggleMagazineAudio = function(passedTrackUrl) {
    let trackUrl = passedTrackUrl;
    if (!trackUrl || trackUrl === 'undefined') {
        trackUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    }

    if (!trackUrl.startsWith('http') && /^[a-zA-Z0-9_-]{25,40}$/.test(trackUrl)) {
        trackUrl = `https://drive.google.com/uc?export=download&confirm=t&id=\${trackUrl}`;
    } else if (trackUrl.includes('drive.google.com')) {
        const idMatch = trackUrl.match(new RegExp("(?:id=|/d/)([a-zA-Z0-9_-]+)"));
        if (idMatch) {
            trackUrl = `https://drive.google.com/uc?export=download&confirm=t&id=\${idMatch[1]}`;
        }
    }

    if (!magAudio) {
        magAudio = new Audio();
        magAudio.loop = true;
    }

    let currentSrc = magAudio.src || "";
    let isNewTrack = true;
    if (currentSrc === trackUrl || decodeURIComponent(currentSrc) === trackUrl || currentSrc.endsWith(trackUrl)) {
        isNewTrack = false;
    }

    if (isNewTrack) {
        magAudio.src = trackUrl;
        magAudioState = 'listen'; 
    }
    
    if (magAudioState === 'listen' || magAudioState === 'resume') {
        magAudio.play().catch(e => console.log("Audio play failed:", e));
        magAudioState = 'pause';
    } else if (magAudioState === 'pause') {
        magAudio.pause();
        magAudioState = 'resume';
    }
    
    document.querySelectorAll('.mag-listen-btn').forEach(btn => {
        btn.innerText = magAudioState;
    });
};

window.copyMagazineLink = function(btn) {
    const issueId = magazineData[currentIssueIndex].id;
    const url = window.location.origin + window.location.pathname + "?magazine=" + issueId + "&page=" + magCurrentPage;
    navigator.clipboard.writeText(url).then(() => {
        const oldText = btn.innerText;
        btn.innerText = "copied!";
        setTimeout(() => { btn.innerText = oldText; }, 2000);
    });
};

function updateMagazineView() {
    const over = document.getElementById('magazine-reader-overlay');
    if (!over) return;
    const mag = magazineData[currentIssueIndex].images || [];
    const leaves = Math.ceil(mag.length / 2);
    
    if (magAudio) { magAudio.pause(); magAudio = null; magAudioState = 'listen'; }

    // Only use real chapter data — no fallback. If none, dial shows just "cover".
    let chaptersData = (magazineData[currentIssueIndex].chapters && magazineData[currentIssueIndex].chapters.length > 0)
        ? magazineData[currentIssueIndex].chapters
        : [];

    // Update URL silently (Debounced to prevent IPC flooding)
    if (magazineData[currentIssueIndex]) {
        clearTimeout(window._magUrlTimeout);
        window._magUrlTimeout = setTimeout(() => {
            const issueId = magazineData[currentIssueIndex].id || ('Issue_' + (currentIssueIndex + 1));
            const url = new URL(window.location);
            url.searchParams.set('magazine', issueId);
            url.searchParams.set('page', magCurrentPage);
            window.history.replaceState({}, '', url);
        }, 150);
    }

    let html = '';
    const isMobile = window.innerWidth <= 900;

    if (isMobile) {
        window._magSpreadView = window._magSpreadView || false;
        html += '<div class="mobile-magazine-feed" style="width: 100vw; height: 100svh; overflow-y: auto; z-index: 10; scroll-snap-type: y mandatory;">';

        if (window._magSpreadView) {
            let pages = magazineData[currentIssueIndex].pages || [];
            for (let i = 0; i < leaves; i++) {
                let isActive = (i === magCurrentPage) ? 'active-page' : '';
                let mobileAudio = '';
                if ((pages[i*2] && pages[i*2].audioUrl) || (pages[i*2+1] && pages[i*2+1].audioUrl)) {
                    let audioUrl = (pages[i*2] && pages[i*2].audioUrl) ? pages[i*2].audioUrl : pages[i*2+1].audioUrl;
                    mobileAudio = `<div class="magazine-audio-controls" style="position: relative; bottom: 0; left: 0; transform: none; margin-top: 1.5rem; margin-bottom: 2rem; width: 100%;"><div class="magazine-audio-btn mag-listen-btn" onclick="event.stopPropagation(); toggleMagazineAudio('${audioUrl}')">${magAudioState}</div></div>`;
                }
                html += `<div class="mag-page-row ${isActive}" style="display: flex; flex-direction: column; align-items: center; margin: 0 auto 3rem auto; width: 95vw; scroll-snap-align: center; scroll-snap-stop: always; transition: opacity 0.5s ease;">`;
                html += `<div style="display: flex; justify-content: center; width: 100%;">`;
                if (mag[i*2]) html += `<img src="${getSafeImg(mag[i*2])}" style="width: 50%; height: auto;">`;
                if (mag[i*2+1]) html += `<img src="${getSafeImg(mag[i*2+1])}" style="width: 50%; height: auto;">`;
                html += `</div>`;
                html += mobileAudio;
                html += '</div>';
            }
        } else {
            let pages = magazineData[currentIssueIndex].pages || [];
            mag.forEach((imgUrl, idx) => {
                let isActive = (idx === magCurrentPage) ? 'active-page' : '';
                let mobileAudio = '';
                if (pages[idx] && pages[idx].audioUrl) {
                    mobileAudio = `<div class="magazine-audio-controls" style="position: relative; bottom: 0; left: 0; transform: none; margin-top: 1.5rem; margin-bottom: 2rem; width: 100%;"><div class="magazine-audio-btn mag-listen-btn" onclick="event.stopPropagation(); toggleMagazineAudio('${pages[idx].audioUrl}')">${magAudioState}</div></div>`;
                }
                if(imgUrl) {
                    html += `<div class="mag-page-row ${isActive}" style="position: relative; margin: 0 auto 3rem auto; width: 90vw; scroll-snap-align: center; scroll-snap-stop: always; transition: opacity 0.5s ease; display:flex; flex-direction:column; align-items:center;">
                                <img src="${getSafeImg(imgUrl)}" style="display: block; width: 100%; height: auto;">
                                ${mobileAudio}
                             </div>`;
                }
            });
        }
        html += '</div>';

        // Mobile: Vertical scrolling feed
        over.innerHTML = `
            <div class="close-minus" style="z-index: 10000; position: absolute;" onclick="closeMagazine()" ontouchstart="event.preventDefault(); closeMagazine()">–</div>
            ${html}
        `;

        // Build the magazine swipe dial inside the filterBar
        buildMagazineDial(chaptersData);

        setTimeout(() => {
            const feed = document.querySelector('.mobile-magazine-feed');
            if (feed) {
                const rows = feed.querySelectorAll('.mag-page-row');
                if (rows[magCurrentPage]) {
                    rows[magCurrentPage].scrollIntoView({ block: 'center', behavior: 'instant' });
                }
            }
        }, 10);

    } else {
        // Desktop: book-flip view with minus and chapter footer
        let pages = magazineData[currentIssueIndex].pages || [];
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
            
            let isTopRight = (i === magCurrentPage);
            let isTopLeft = (i === magCurrentPage - 1);
            
            let frontShareUrl = window.location.origin + window.location.pathname + "?magazine=" + magazineData[currentIssueIndex].title + "&page=" + (i*2);
            let backShareUrl = window.location.origin + window.location.pathname + "?magazine=" + magazineData[currentIssueIndex].title + "&page=" + (i*2+1);
            
            let frontAudio = (isTopRight && pages[i*2] && pages[i*2].audioUrl) ? `<div class="magazine-audio-controls"><div class="magazine-audio-btn mag-listen-btn" onclick="event.stopPropagation(); toggleMagazineAudio('${pages[i*2].audioUrl}')">${magAudioState}</div><div class="magazine-audio-btn" onclick="event.stopPropagation(); navigator.clipboard.writeText('${frontShareUrl}'); this.innerText='copied ↗'; setTimeout(()=>this.innerText='share ↗', 2000)">share ↗</div></div>` : '';
            let backAudio = (isTopLeft && pages[i*2+1] && pages[i*2+1].audioUrl) ? `<div class="magazine-audio-controls"><div class="magazine-audio-btn mag-listen-btn" onclick="event.stopPropagation(); toggleMagazineAudio('${pages[i*2+1].audioUrl}')">${magAudioState}</div><div class="magazine-audio-btn" onclick="event.stopPropagation(); navigator.clipboard.writeText('${backShareUrl}'); this.innerText='copied ↗'; setTimeout(()=>this.innerText='share ↗', 2000)">share ↗</div></div>` : '';

            html += `<div class="book-leaf ${i < magCurrentPage ? 'flipped' : ''}" style="z-index:${i < magCurrentPage ? i : 1000 - i}">
                <div class="page-front" style="flex-direction: column; justify-content: center; align-items: flex-start;">${mag[i*2] ? `<div class="page-img-wrapper" style="${offsetStyle}"><img src="${getSafeImg(mag[i*2])}" alt="Magazine Page">${frontAudio}</div>` : ''}</div>
                <div class="page-back" style="flex-direction: column; justify-content: center; align-items: flex-end;">${mag[i*2+1] ? `<div class="page-img-wrapper" style="${offsetStyle}"><img src="${getSafeImg(mag[i*2+1])}" alt="Magazine Page">${backAudio}</div>` : ''}</div>
            </div>`;
        }

        let chaptersHtml = chaptersData.map((ch, idx) => {
            let nextChPage = (idx < chaptersData.length - 1) ? chaptersData[idx+1].page : leaves;
            let isActive = magCurrentPage >= ch.page && magCurrentPage < nextChPage;
            
            let html = `<div class="desktop-chapter-group ${isActive ? 'active-group' : ''}">`;
            
            let startImage = ch.page * 2;
            let endImage = nextChPage * 2;
            if (endImage > mag.length) endImage = mag.length;
            
            let isSingleLeaf = (endImage - startImage <= 2);
            
            for (let imgIdx = startImage; imgIdx < endImage; imgIdx++) {
                if (isSingleLeaf && imgIdx !== startImage) continue; // Skip dot for single-leaf chapters
                
                let leafIdx = Math.floor(imgIdx / 2);
                let staggerIdx = imgIdx - startImage; 
                
                if (imgIdx === startImage) {
                    html += `<span class="highlight-link mag-page-item" data-img-idx="${imgIdx}" data-chapter-single="${isSingleLeaf}" onclick="event.stopPropagation(); magCurrentPage = ${leafIdx}; updateMagazineView()">${ch.name}</span>`;
                } else {
                    html += `<span class="mag-chapter-dot mag-page-item" data-img-idx="${imgIdx}" style="--stagger-idx: ${staggerIdx};" onclick="event.stopPropagation(); magCurrentPage = ${leafIdx}; updateMagazineView()"></span>`;
                }
            }
            html += `</div>`;
            return html;
        }).join('');

        if (!window._magSpineTracker) {
            window._magSpineTracker = function(e) {
                if (e && e.clientX !== undefined) window._magLastMouseX = e.clientX;
                if (window.innerWidth <= 900) return;
                
                const clientX = window._magLastMouseX !== undefined ? window._magLastMouseX : window.innerWidth / 2;
                const isLeft = clientX < window.innerWidth / 2;
                let activeImgIdx = (magCurrentPage === 0) ? 0 : (isLeft ? magCurrentPage * 2 - 1 : magCurrentPage * 2);
                
                // Clamp activeImgIdx so brackets don't vanish on the last page if it's odd
                const maxIdx = (magazineData[currentIssueIndex].images || []).length - 1;
                if (activeImgIdx > maxIdx) activeImgIdx = maxIdx;
                
                document.querySelectorAll('.mag-page-item').forEach(el => {
                    let matches = parseInt(el.dataset.imgIdx) === activeImgIdx;
                    if (!matches && el.dataset.chapterSingle === 'true' && parseInt(el.dataset.imgIdx) === activeImgIdx - 1) {
                        matches = true;
                    }
                    
                    if (matches) {
                        el.classList.add('active-tag');
                        if (el.classList.contains('mag-chapter-dot')) el.classList.add('active-swipe-tag');
                    } else {
                        el.classList.remove('active-tag');
                        el.classList.remove('active-swipe-tag');
                    }
                });
            };
            document.addEventListener('mousemove', window._magSpineTracker);
        }

        over.innerHTML = `
            <div class="close-minus" onclick="closeMagazine()" ontouchstart="event.preventDefault(); closeMagazine()">–</div>
            <div class="magazine-scene">${html}</div>
            <div class="magazine-footer">
                <div class="magazine-chapters">${chaptersHtml}</div>
            </div>
        `;
        
        // Immediately trigger the tracker so brackets don't vanish until mouse moves
        if (window._magSpineTracker) window._magSpineTracker();

        over.onclick = function(e) {
            // Ignore clicks on interactive elements
            if (e.target.closest('.magazine-audio-btn, .highlight-link, .close-minus, .mag-chapter-dot')) return;
            
            if (e.clientX < window.innerWidth / 2) {
                if (magCurrentPage > 0) {
                    magCurrentPage--;
                    updateMagazineView();
                }
            } else {
                if (magCurrentPage < leaves) {
                    magCurrentPage++;
                    updateMagazineView();
                }
            }
        };

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

    window.updateMagDialDots = function(activePage, prevPage) {
        const filterBar = document.getElementById('filter-bar');
        if (!filterBar) return;
        const activeBtn = filterBar.children[activePage];
        if (!activeBtn) return;
        const activeChapterId = activeBtn.dataset.chapterId;
        
        const scrollingForward = prevPage !== undefined ? (activePage > prevPage) : true;
        const chapterDots = Array.from(filterBar.children).filter(btn => btn.dataset.chapterId === activeChapterId && btn.dataset.isChapter === "false");
        
        Array.from(filterBar.children).forEach(btn => {
            if (btn.dataset.isChapter === "false") {
                if (btn.dataset.chapterId === activeChapterId) {
                    const idx = chapterDots.indexOf(btn);
                    const staggerIdx = scrollingForward ? idx : (chapterDots.length - 1 - idx);
                    btn.style.transitionDelay = `${staggerIdx * 0.05}s`;
                    btn.classList.add('unfolded');
                } else {
                    btn.style.transitionDelay = '0s';
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
            window.updateMagDialDots(0, undefined);
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
            rows.forEach((row, idx) => {
                row.dataset.idx = idx; // Store index for easier neighboring
                const rect = row.getBoundingClientRect();
                const diff = Math.abs(rect.top + rect.height/2 - window.innerHeight / 2); 
                if (diff < minRowDiff) {
                    minRowDiff = diff;
                    closestRow = row;
                }
            });
            rows.forEach(r => r.classList.remove('active-page', 'prev-page', 'next-page'));
            if (closestRow) {
                closestRow.classList.add('active-page');
                const activeIdx = parseInt(closestRow.dataset.idx, 10);
                if (rows[activeIdx - 1]) rows[activeIdx - 1].classList.add('prev-page');
                if (rows[activeIdx + 1]) rows[activeIdx + 1].classList.add('next-page');
            }

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

            magCurrentPage = closestPage;
            if (magazineData[currentIssueIndex]) {
                clearTimeout(window._magUrlTimeout);
                window._magUrlTimeout = setTimeout(() => {
                    const issueId = magazineData[currentIssueIndex].id || ('Issue_' + (currentIssueIndex + 1));
                    const url = new URL(window.location);
                    url.searchParams.set('magazine', issueId);
                    url.searchParams.set('page', magCurrentPage);
                    window.history.replaceState({}, '', url);
                }, 150);
            }

            // Remove self-ignoring timeout from the feed scroll listener
            const prevPage = window._magLastDialPage;
            
            if (prevPage !== closestPage) {
                window._magLastDialPage = closestPage;
                
                const targetBtn = filterBar.children[closestPage] || filterBar.firstElementChild;
                if (targetBtn) {
                    filterBar.querySelectorAll('span').forEach(b => b.classList.remove('active-swipe-tag'));
                    targetBtn.classList.add('active-swipe-tag');

                    const cl = filterBar.getBoundingClientRect().width / 2;
                    const r = targetBtn.getBoundingClientRect();
                    window._ignoreFilterBarScroll = Date.now() + 500;
                    filterBar.scrollBy({ left: r.left - filterBar.getBoundingClientRect().left + r.width / 2 - cl, behavior: 'smooth' });
                    
                    // Fold/unfold dots based on the current page's chapter
                    window.updateMagDialDots(closestPage, prevPage);
                }
            }
        });
    }
}

