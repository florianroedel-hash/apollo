// ============================================================================
// MOBILE ADAPTATION LOGIC
// ============================================================================
const mobileWrapper = document.getElementById('dashboard-wrapper');
const mobileCols = [
    document.getElementById('col-apollo'),
    document.getElementById('col-archive'),
    document.getElementById('col-magazine')
];


function updateMobileTitles() {
    if (window.innerWidth > 900) {
        // Reset styles for desktop
        mobileCols.forEach(col => {
            if(col) {
                col.style.opacity = '';
                col.style.transform = '';
                col.style.pointerEvents = '';
            }
        });
        return;
    }

    // In grid-mode, titles are driven by transform-based slide index, not scrollLeft
    if (document.body.classList.contains('grid-mode')) return;

    const scrollLeft = mobileWrapper.scrollLeft;
    const w = window.innerWidth;

    mobileCols.forEach((col, i) => {
        if (!col) return;
        const centerPos = i * w;
        const dist = scrollLeft - centerPos;
        const ratio = Math.min(1, Math.abs(dist) / w);

        const scaleX = Math.max(0, 1 - ratio);
        const opacity = Math.max(0, 1 - (ratio * 1.5));

        col.style.transform = `translateX(${-dist}px) scaleX(${scaleX})`;
        col.style.opacity = opacity;
        col.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
        
        // Hide filter bar if not on center slide
        const filterBar = document.getElementById('filter-bar');
        if (filterBar && !document.body.classList.contains('spread-open') && !document.body.classList.contains('magazine-open')) {
            const ratioCenter = Math.abs(scrollLeft - w) / w;
            filterBar.style.opacity = Math.max(0, 1 - (ratioCenter * 2));
            filterBar.style.pointerEvents = ratioCenter < 0.5 ? 'auto' : 'none';
            if (ratioCenter >= 0.5) filterBar.classList.add('disabled-dial');
            else filterBar.classList.remove('disabled-dial');
        }
        
        // Remove menu-open if scrolled away
        if (ratio > 0.5) col.classList.remove('menu-open');
    });
}

window.updateMobileTitles = updateMobileTitles;

mobileWrapper.addEventListener('scroll', updateMobileTitles);
window.addEventListener('resize', updateMobileTitles);

// Initialize mobile view
window.addEventListener('load', () => {
    if (window.innerWidth <= 900) {
        // Scroll exactly to the center column (Archive) on load
        setTimeout(() => {
            mobileWrapper.scrollLeft = window.innerWidth;
            updateMobileTitles();
        }, 100);
    }
});


window.handleMobileTap = function(e, id, wrapper, fromBelly) {
    e.stopPropagation();
    if (window.innerWidth > 900 || document.body.classList.contains('grid-mode')) {
        unfoldProject(id);
        return;
    }

    // Belly-band tap: always open spread immediately, no enlarge step
    if (fromBelly) {
        if (window._activeMobilePostIt && window._activeMobilePostIt !== wrapper) {
            window._activeMobilePostIt.style.transform = window._activeMobilePostIt.dataset.origTransform || '';
            window._activeMobilePostIt.style.zIndex = window._activeMobilePostIt.dataset.origZIndex || '';
        }
        window._activeMobilePostIt = null;
        unfoldProject(id);
        return;
    }

    // Post-it / card tap: first tap enlarges, second opens spread
    if (window._activeMobilePostIt === wrapper) {
        unfoldProject(id);
    } else {
        if (window._activeMobilePostIt) {
            window._activeMobilePostIt.style.transform = window._activeMobilePostIt.dataset.origTransform || '';
            window._activeMobilePostIt.style.zIndex = window._activeMobilePostIt.dataset.origZIndex || '';
        }
        
        window._activeMobilePostIt = wrapper;
        wrapper.dataset.origTransform = wrapper.style.transform || '';
        wrapper.dataset.origZIndex = wrapper.style.zIndex || '';
        
        wrapper.style.transform = wrapper.dataset.origTransform + ' scale(1.1)';
        wrapper.style.zIndex = '999';
        
        // 2-second swipe lock
        mobileWrapper.style.overflowX = 'hidden';
        setTimeout(() => {
            if (mobileWrapper.style.overflowX === 'hidden') {
                mobileWrapper.style.overflowX = 'auto';
            }
        }, 2000);
    }
};

// --- Mobile Tag Filter Swipe Logic ---
let _tagScrollTimeout;
let _tagActionTimeout;
let _prevScrollLeft = 0; // track direction
if (filterBar) {
    // Enable tag dial actions when the user physically touches or clicks/drags the dial
    filterBar.addEventListener('touchstart', () => {
        window._blockTagDialActions = false;
    }, { passive: true });
    filterBar.addEventListener('mousedown', () => {
        window._blockTagDialActions = false;
    });

    filterBar.addEventListener('scroll', () => {
        if (window.innerWidth > 900) return;

        const currentScrollLeft = filterBar.scrollLeft;
        const scrollingRight = currentScrollLeft >= _prevScrollLeft;
        _prevScrollLeft = currentScrollLeft;

        // --- Spread Thumbnail mode ---
        if (filterBar._spreadThumbActive) {
            if (window._ignoreFilterBarScroll && Date.now() < window._ignoreFilterBarScroll) return;

            const thumbs = Array.from(filterBar.querySelectorAll('.spread-thumb-item'));
            const centerLine = filterBar.getBoundingClientRect().width / 2;
            let closest = null, minDiff = Infinity;
            thumbs.forEach(t => {
                const r = t.getBoundingClientRect();
                const tc = r.left - filterBar.getBoundingClientRect().left + r.width / 2;
                const d = Math.abs(tc - centerLine);
                if (d < minDiff) { minDiff = d; closest = t; }
                t.classList.remove('active-swipe-tag');
            });
            if (closest) {
                if (parseInt(closest.dataset.slideIndex, 10) !== 0) {
                    closest.classList.add('active-swipe-tag');
                }
                clearTimeout(_tagScrollTimeout);
                _tagScrollTimeout = setTimeout(() => {
                    const targetIdx = parseInt(closest.dataset.slideIndex, 10);
                    const gallery = document.querySelector('.mobile-swipe-gallery');
                    if (gallery) {
                        const slide = gallery.children[targetIdx];
                        if (slide) {
                            window._ignoreGalleryScroll = Date.now() + 500;
                            gallery.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
                            
                            // Spring back to Image 1 if we triggered the post-it!
                            if (targetIdx === 0 && thumbs.length > 1) {
                                setTimeout(() => {
                                    const imgThumb = thumbs[1];
                                    const tc = imgThumb.offsetLeft + imgThumb.offsetWidth / 2;
                                    const centerL = filterBar.offsetWidth / 2;
                                    window._ignoreFilterBarScroll = Date.now() + 1500;
                                    filterBar.scrollTo({ left: tc - centerL, behavior: 'smooth' });
                                }, 300);
                            }
                        }
                    }
                }, 50);
            }
            return;
        }

        // --- Magazine dial mode ---
        if (filterBar._magDialActive) {
            if (window.resetMagDialIdleTimeout) window.resetMagDialIdleTimeout();
            if (window._ignoreFilterBarScroll && Date.now() < window._ignoreFilterBarScroll) return;
            const magTags = Array.from(filterBar.children);
            const centerLine = filterBar.getBoundingClientRect().width / 2;
            let closest = null, minDiff = Infinity;
            magTags.forEach(t => {
                const r = t.getBoundingClientRect();
                const tc = r.left - filterBar.getBoundingClientRect().left + r.width / 2;
                const d = Math.abs(tc - centerLine);
                if (d < minDiff) { minDiff = d; closest = t; }
                t.classList.remove('active-swipe-tag');
            });
            if (!closest) return;
            closest.classList.add('active-swipe-tag');

            clearTimeout(_tagScrollTimeout);
            _tagScrollTimeout = setTimeout(() => {
                if (!closest) return;
                if (window._blockMagDialActions) return; 
                
                const page = parseInt(closest.dataset.page, 10);
                if (!isNaN(page)) { 
                    const feed = document.querySelector('.mobile-magazine-feed');
                    if (feed) {
                        const rows = feed.querySelectorAll('.mag-page-row');
                        if (rows[page]) {
                            window._ignoreFeedScrollTimeout = true; // prevent dial bouncing
                            rows[page].scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setTimeout(() => { window._ignoreFeedScrollTimeout = false; }, 1200);
                        }
                    }
                }
            }, 80);
            return; // don't fall through to archive tag logic
        }

        // --- Archive tag dial (normal mode) ---
        const tags = Array.from(filterBar.children);
        
        // Find the center tag
        const centerLine = filterBar.getBoundingClientRect().width / 2;
        let closestTag = null;
        let minDiff = Infinity;
        
        tags.forEach(tag => {
            const rect = tag.getBoundingClientRect();
            const tagCenter = rect.left - filterBar.getBoundingClientRect().left + rect.width / 2;
            const diff = Math.abs(tagCenter - centerLine);
            if (diff < minDiff) {
                minDiff = diff;
                closestTag = tag;
            }
            tag.classList.remove('active-swipe-tag');
        });
        
        if (closestTag) {
            const tagText = closestTag.textContent.toLowerCase().trim();

            // "filters" is invisible — bridge over it based on swipe direction
            if (tagText === 'filters') {
                if (scrollingRight) {
                    // Swiping right (all → tags): expand and jump to first tag
                    const firstDynamic = filterBar.querySelector('.dynamic-tag-item');
                    if (firstDynamic) {
                        filterBar.classList.remove('tags-collapsed');
                        filterBar.classList.add('tags-expanded');
                        requestAnimationFrame(() => {
                            const rect = firstDynamic.getBoundingClientRect();
                            const barRect = filterBar.getBoundingClientRect();
                            const offset = rect.left - barRect.left + rect.width / 2 - centerLine;
                            filterBar.scrollBy({ left: offset, behavior: 'smooth' });
                        });
                    }
                } else {
                    // Swiping left (tags → all): collapse and jump straight to "all"
                    filterBar.classList.remove('tags-expanded');
                    filterBar.classList.add('tags-collapsed');
                    const allBtn = document.getElementById('filter-bar-all-btn');
                    if (allBtn) {
                        requestAnimationFrame(() => {
                            const rect = allBtn.getBoundingClientRect();
                            const barRect = filterBar.getBoundingClientRect();
                            const offset = rect.left - barRect.left + rect.width / 2 - centerLine;
                            filterBar.scrollBy({ left: offset, behavior: 'smooth' });
                        });
                    }
                }
                return; // never settle on filters
            }

            closestTag.classList.add('active-swipe-tag');
            
            // Toggle dynamic tags visibility based on which static tag is active
            if (tagText === 'all' || tagText === 'search') {
                if (filterBar.classList.contains('tags-expanded')) {
                    filterBar.classList.remove('tags-expanded');
                    filterBar.classList.add('tags-collapsed');
                }
            }
            
            // Auto-close search overlay if dialling away from 'search'
            if (tagText !== 'search') {
                const searchOverlay = document.getElementById('search-overlay');
                if (searchOverlay) {
                    searchOverlay.remove();
                    document.removeEventListener('keydown', window._searchEscHandler);
                    document.body.classList.remove('search-open');
                }
            }
        }
        
        // Fire action ~80ms after scroll stops — no extra cooldown
        clearTimeout(_tagScrollTimeout);
        clearTimeout(_tagActionTimeout);
        
        _tagScrollTimeout = setTimeout(() => {
            if (!closestTag) return;
            const tagText = closestTag.textContent.toLowerCase().trim();
            if (tagText === 'filters') return; // already handled above
            if (window._blockTagDialActions) return;
            
            if (closestTag.textContent !== window._lastFilteredTag) {
                window._lastFilteredTag = closestTag.textContent;
                if (tagText === 'search') {
                    openSearchOverlay();
                } else if (tagText === 'all') {
                    exitGridMode();
                } else {
                    filterProjects(closestTag.textContent, closestTag);
                }
            }
        }, 80);
    });
}
