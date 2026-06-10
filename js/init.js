let loadingProgress = 100; // Starts with 100% clipped from the right (empty)
let loadingAnimReq = null;
let isSpreadLoading = false;
let spreadDataReady = false;
let loadingColorIndex = 0;
const loadingColors = ['#B24F44', '#A6BBD1', '#F1EED7']; // Red, Blue, Cream

function animateLoadingLogo() {
    const fillLayers = document.querySelectorAll('.loading-fill-layer');
    if (fillLayers.length === 0) return;
    
    // Determine if the current active loading phase is finished loading its data
    let isCurrentPhaseReady = isSpreadLoading ? spreadDataReady : isLoaded;
    
    if (isCurrentPhaseReady && loadingProgress <= 0) {
        loadingProgress = 0;
        fillLayers.forEach(l => l.style.clipPath = `inset(0 0% 0 0)`);
        
        if (!isSpreadLoading) {
            const overlay = document.getElementById('passcode-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.remove(); liftFog(); }, 500);
            }
        }
        return; // Pause the animation loop at 0% so the UI handlers can pick it up
    }
    
    // Loop animation if data is NOT ready yet
    if (loadingProgress <= 0 && !isCurrentPhaseReady) {
        loadingProgress = 100;
        loadingColorIndex = (loadingColorIndex + 1) % loadingColors.length;
        fillLayers.forEach(l => l.style.backgroundColor = loadingColors[loadingColorIndex]);
    }
    
    // Fill up smoothly from left to right (slowed down)
    loadingProgress -= 0.6; 
    if (loadingProgress < 0 && isCurrentPhaseReady) loadingProgress = 0;
    
    fillLayers.forEach(l => l.style.clipPath = `inset(0 ${Math.max(0, loadingProgress)}% 0 0)`);
    loadingAnimReq = requestAnimationFrame(animateLoadingLogo);
}



async function init() {
    animateLoadingLogo();
    try {
        const res = await fetch(URL_MASTER, { redirect: 'follow' });
        const masterData = await res.json();
        
        // The master script sends { archive, calendar, magazine, history, audio }
        archiveData = masterData.archive || [];
        calendarData = masterData.calendar || [];
        magazineData = masterData.magazine || [];
        historyData = masterData.history || [];
        audioData = masterData.audio || [];
    } catch (e) {
        console.error("Master API Error:", e);
    }

    // Always attempt to generate tags and lift fog to prevent loading screen freeze
    try {
        generateDynamicTags();
    } catch (err) {
        console.error("Error generating tags:", err);
    }
    isLoaded = true;
    if (!document.getElementById('passcode-overlay')) liftFog();

    // Deep linking for Audio Library and Projects
    const urlParams = new URLSearchParams(window.location.search);
    const audioParam = urlParams.get('audio');
    const projectParam = urlParams.get('project');
    
    if (audioParam) {
        setTimeout(() => {
            if (isLoaded) {
                openAudioLibrary();
                playAudioTrack(audioParam);
            }
        }, 600);
    } else if (projectParam) {
        setTimeout(() => {
            if (isLoaded) {
                unfoldProject(projectParam);
            }
        }, 600);
    }
}

function generateDynamicTags() {
    let tags = new Set();
    if (Array.isArray(archiveData)) {
        archiveData.forEach(p => {
            if (p && p.metadata && Array.isArray(p.metadata.tags)) {
                p.metadata.tags.forEach(t => {
                    if (t) tags.add(t.trim().toLowerCase());
                });
            }
        });
    }
    filterBar.innerHTML = '';
    
    // Add Search Button
    const searchBtn = document.createElement('span');
    searchBtn.id = 'filter-bar-search-btn';
    searchBtn.className = 'tag-filter highlight-link';
    searchBtn.innerText = 'search';
    searchBtn.onclick = () => openSearchOverlay();
    filterBar.appendChild(searchBtn);

    // Add All Button (Returns to chaotic stack)
    const allBtn = document.createElement('span');
    allBtn.id = 'filter-bar-all-btn';
    allBtn.className = 'tag-filter highlight-link';
    allBtn.innerText = 'all';
    allBtn.onclick = () => {
        exitGridMode();
        if (window.innerWidth <= 900) {
            const centerLine = filterBar.getBoundingClientRect().width / 2;
            const rect = allBtn.getBoundingClientRect();
            const btnCenter = rect.left - filterBar.getBoundingClientRect().left + rect.width / 2;
            filterBar.scrollBy({ left: btnCenter - centerLine, behavior: 'smooth' });
        }
    };
    filterBar.appendChild(allBtn);

    // Add Filters Button (Mobile trigger, desktop hover target)
    const filtersBtn = document.createElement('span');
    filtersBtn.id = 'filter-bar-filters-btn';
    filtersBtn.className = 'tag-filter highlight-link filters-toggle-btn';
    filtersBtn.innerText = 'filters';
    filtersBtn.onclick = () => {
        if (window.innerWidth <= 900) {
            const centerLine = filterBar.getBoundingClientRect().width / 2;
            const rect = filtersBtn.getBoundingClientRect();
            const btnCenter = rect.left - filterBar.getBoundingClientRect().left + rect.width / 2;
            filterBar.scrollBy({ left: btnCenter - centerLine, behavior: 'smooth' });
        }
    };
    filterBar.appendChild(filtersBtn);

    // Add Dynamic Tags
    tags.forEach(tag => {
        const btn = document.createElement('span');
        btn.className = 'tag-filter highlight-link dynamic-tag-item';
        btn.innerText = tag;
        btn.onclick = () => {
            const overlay = document.getElementById('search-overlay');
            if (overlay) {
                overlay.remove();
                document.removeEventListener('keydown', window._searchEscHandler);
                document.body.classList.remove('search-open');
            }
            filterProjects(tag, btn);
            if (window.innerWidth <= 900) {
                const centerLine = filterBar.getBoundingClientRect().width / 2;
                const rect = btn.getBoundingClientRect();
                const btnCenter = rect.left - filterBar.getBoundingClientRect().left + rect.width / 2;
                filterBar.scrollBy({ left: btnCenter - centerLine, behavior: 'smooth' });
            }
        };
        filterBar.appendChild(btn);
    });

    // Initialize state & Bind hover listeners
    if (window.innerWidth <= 900) {
        filterBar.classList.add('tags-collapsed');
        filterBar.classList.remove('tags-expanded');
    } else {
        let hoverTimeout = null;
        
        filtersBtn.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimeout);
            filterBar.classList.add('hover-expanded');
        });
        
        filterBar.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimeout);
        });
        
        filterBar.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
                filterBar.classList.remove('hover-expanded');
            }, 300);
        });
    }

    // Auto-scroll to "all" on load if on mobile
    if (window.innerWidth <= 900) {
        setTimeout(() => {
            try {
                if (filterBar && allBtn) {
                    const centerLine = filterBar.getBoundingClientRect().width / 2;
                    const allRect = allBtn.getBoundingClientRect();
                    const allCenter = allRect.left - filterBar.getBoundingClientRect().left + allRect.width / 2;
                    filterBar.scrollBy({ left: allCenter - centerLine, behavior: 'instant' });
                    filterBar.dispatchEvent(new Event('scroll'));
                }
            } catch (e) {
                console.error('Auto-scroll failed', e);
            }
        }, 50);
    }
}




function liftFog() {
    document.body.classList.remove('focus-state');
    document.body.classList.add('active-state');
    renderDashboard();
    calibrateDropdownFont();
    if (typeof window.checkMobileTutorial === 'function') window.checkMobileTutorial();
}

window.addEventListener('DOMContentLoaded', init);
