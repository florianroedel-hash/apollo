// IMPORTANT: You only need ONE URL now. Paste the URL for your Master Control Center script here!
const URL_MASTER = 'https://script.google.com/macros/s/AKfycbx4nDabR1zvlbIAyQCZ0FIg4PjAM_MmNVIWQNcVvxcvGHu_cDvKBnp29nqV7KRrL2Ee/exec';

const pile = document.getElementById('project-pile');
const filterBar = document.getElementById('filter-bar');

let archiveData = [], calendarData = [], magazineData = [], historyData = [], audioData = [];
let isLoaded = false, isWaitingToStart = true, magCurrentPage = 0;

// ---- Stable viewport height fix ----
// Prevents address-bar show/hide from compressing/expanding the layout.
// Sets --vh once from window.innerHeight (which excludes the browser chrome on most phones),
// then only updates on genuine orientation changes — never on address-bar toggles.
(function setStableVH() {
    const set = () => document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
    set();
    window.addEventListener('orientationchange', () => setTimeout(set, 300));
})();

function getSafeImg(url) {
    const id = url.match(/id=([^&]+)/);
    return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w1200` : url;
}

function getHDImageUrl(url) {
    if (!url) return '';
    const id = url.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
    return id ? `https://drive.google.com/uc?export=view&id=${id[1]}` : url;
}

window.copyProjectUrl = function(id, btn) {
    const url = window.location.origin + window.location.pathname + '?project=' + id;
    
    const el = document.createElement('textarea');
    el.value = url;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    
    el.select();
    el.setSelectionRange(0, 99999);
    
    let success = false;
    try {
        success = document.execCommand('copy');
    } catch(err) {
        success = false;
    }
    
    document.body.removeChild(el);
    
    if (success) {
        btn.innerText = 'copied!';
    } else {
        btn.innerText = 'failed';
        prompt("Automatic copy blocked by browser. You can manually copy the link here:", url);
    }
    setTimeout(() => { btn.innerText = 'share'; }, 2000);
};

function getNoteGridHtml(p) {
    const isEvent = p.metadata && p.metadata.tags && p.metadata.tags.includes('Event');
    
    let lbl2 = "Course", val2 = (p.metadata && p.metadata.course) || "Studio Alpha";
    let lbl3 = "Track", val3 = (p.metadata && p.metadata.track) || "Laurea Magistrale";
    let lbl4 = "Prof", val4 = (p.metadata && p.metadata.author) || "Dr. Smith";
    
    if (isEvent) {
        lbl2 = "Date"; val2 = (p.metadata && p.metadata.dateOverride) || (p.metadata && p.metadata.name) || "TBA";
        lbl3 = "Event"; val3 = (p.metadata && p.metadata.course) || "Special";
        lbl4 = "Note"; val4 = (p.metadata && p.metadata.author) || "Apollo";
    }
    
    return `
        <div>Year</div><div>${(p.metadata && p.metadata.year) || '2024'}</div>
        <div>${lbl2}</div><div>${val2}</div>
        <div>${lbl3}</div><div>${val3}</div>
        <div>${lbl4}</div><div>${val4}</div>
    `;
}

// ---------------------------------------------------------------------------
// DROPDOWN FONT SCALING
// ---------------------------------------------------------------------------
function calibrateDropdownFont() {
    requestAnimationFrame(() => {
        const titleEls = document.querySelectorAll('.big-header-title');
        const dropdownMenus = document.querySelectorAll('.dropdown-menu');
        dropdownMenus.forEach(m => {
            m.style.opacity = '1';
            m.style.pointerEvents = 'none';
        });

        let baseFontRem = 1.2; 
        let minRatio = 1;

        document.querySelectorAll('.header-col').forEach(col => {
            const titleEl = col.querySelector('.big-header-title');
            const dropMenu = col.querySelector('.dropdown-menu');
            if (!titleEl || !dropMenu) return;
            const titleW = titleEl.getBoundingClientRect().width;
            const dropW = dropMenu.scrollWidth;
            if (dropW > 0 && titleW > 0) {
                const ratio = titleW / dropW;
                if (ratio < minRatio) minRatio = ratio;
            }
        });

        const finalFontRem = baseFontRem * minRatio;
        const finalPadRem = 0.6 * minRatio;
        const finalGapRem = 0.4 * minRatio;
        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.gap = `${finalGapRem}rem`);
        document.querySelectorAll('.dropdown-menu .highlight-link').forEach(link => {
            link.style.fontSize = `${finalFontRem}rem`;
            link.style.padding = `${finalPadRem/2}rem ${finalPadRem}rem`;
        });

        dropdownMenus.forEach(m => {
            m.style.opacity = '';
            m.style.pointerEvents = '';
        });
    });
}

window.toggleMenu = function(id, wrapper, event) {
    if(event.target.tagName === 'A') return; 
    event.stopPropagation(); 
    
    const col = document.getElementById('col-' + id);
    const isOpen = col.classList.contains('menu-open');
    const btn = wrapper.querySelector('.menu-toggle');
    
    document.querySelectorAll('.header-col').forEach(c => c.classList.remove('menu-open'));
    document.querySelectorAll('.menu-toggle').forEach(t => t.innerText = '+');
    
    if (!isOpen) {
        col.classList.add('menu-open');
        btn.innerText = '–';
    }
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('.title-wrapper')) {
        document.querySelectorAll('.header-col').forEach(c => c.classList.remove('menu-open'));
        document.querySelectorAll('.menu-toggle').forEach(t => t.innerText = '+');
    }
});

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

    over.innerHTML = `
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

        matches = matches.slice(0, 5);

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

function liftFog() {
    document.body.classList.remove('focus-state');
    document.body.classList.add('active-state');
    renderDashboard();
    calibrateDropdownFont();
}

function renderDashboard() {
    renderPile(archiveData, false);
    renderCalendar(calendarData);
    renderMagazineCover(magazineData);
}

function renderCalendar(data) {
    if (data.length > 0 && data[0]) {
        const calTxt = document.getElementById('calendar-text');
        calTxt.innerHTML = '';

        if (data[0].events && data[0].events.length > 0) {
            let html = '';
            let now = new Date();
            now.setHours(0,0,0,0);
            let nowTime = now.getTime();
            let lastWasPast = false;

            data[0].events.forEach((evt, idx) => {
                if (evt.isPast && !lastWasPast) {
                    // Inject separator before the first past event
                    html += `
                    <div class="calendar-event-group calendar-separator" style="margin: 2rem 0;">
                        <div class="cal-row">
                            <div class="cal-date"></div>
                            <div class="cal-details separator-details" style="display: flex; align-items: center; justify-content: center; opacity: 0.8; gap: 1rem; width: 100%;">
                                <div style="flex-grow: 1; border-top: 1px dashed black;"></div>
                                <div style="font-size: 0.8em; letter-spacing: 0.5px;">DISCOVER PAST EVENTS</div>
                                <div style="flex-grow: 1; border-top: 1px dashed black;"></div>
                            </div>
                        </div>
                    </div>`;
                    lastWasPast = true;
                }

                let lines = evt.text.split('<br>');
                let dateHtml = lines.shift() || ''; 
                
                // Details: First line is normal, remaining lines are wrapped in smaller font
                let detailsHtml = '';
                if (lines.length > 0) {
                    detailsHtml = lines.shift();
                    if (lines.length > 0) {
                        detailsHtml += `<br><div style="font-size: 0.9em; margin-top: 0.2rem;">${lines.join('<br>')}</div>`;
                    }
                }

                let idAttr = '';
                if (evt.timestamp) {
                    let daysDiff = Math.ceil((evt.timestamp - nowTime) / (1000*60*60*24));
                    let countdownHtml = '';
                    if (daysDiff === 0) {
                        countdownHtml = `<div style="font-size: 0.6em; margin-top: 0.3rem;">today!</div>`;
                        idAttr = `id="today-event"`;
                    } else if (daysDiff > 0) {
                        countdownHtml = `<div style="font-size: 0.6em; margin-top: 0.3rem;">in ${daysDiff} days</div>`;
                    }
                    if (countdownHtml) {
                        dateHtml = `<div style="display: inline-block; text-align: right;">${dateHtml}${countdownHtml}</div>`;
                    }
                }

                let interactiveClass = '';
                let clickAction = '';
                let plusIcon = '';
                let imgPayload = '';
                
                let minisHtml = '';
                
                if (evt.isPast && evt.spreadData) {
                    interactiveClass = 'has-invite is-past';
                    clickAction = `onclick="unfoldCalendarEvent(${idx})"`;
                    
                    let allImages = [];
                    if (evt.spreadData.titleImage) allImages.push(evt.spreadData.titleImage);
                    if (evt.spreadData.images) allImages = allImages.concat(evt.spreadData.images);
                    let maxImages = Math.min(5, allImages.length);
                    for(let k=0; k<maxImages; k++) {
                        let idMatch = allImages[k].match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
                        if(idMatch) {
                           minisHtml += `<img src="https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=h100" style="height: 1.1em; width: auto; object-fit: cover; border-radius: 2px;">`;
                        }
                    }
                    plusIcon = `<div style="margin-top: 12px;"><span class="invite-indicator" style="display: inline-flex; align-items: center; gap: 4px;">[ ${minisHtml} <span>+</span> ]</span></div>`;
                } else if (evt.isPast) {
                    interactiveClass = 'is-past';
                } else if (evt.imgId) {
                    interactiveClass = 'has-invite';
                    clickAction = `onclick="this.querySelector('.calendar-inline-img').classList.toggle('expanded')"`;
                    
                    minisHtml = `<img src="https://drive.google.com/thumbnail?id=${evt.imgId}&sz=h100" style="height: 1.1em; width: auto; object-fit: cover; border-radius: 2px;">`;
                    plusIcon = `<div style="margin-top: 12px;"><span class="invite-indicator" style="display: inline-flex; align-items: center; gap: 4px;">[ ${minisHtml} <span>+</span> ]</span></div>`;
                    
                    imgPayload = `
                    <div class="calendar-inline-img">
                         ${evt.imgId ? `
                        <img src="https://drive.google.com/thumbnail?id=${evt.imgId}&sz=w1200" alt="Calendar Event Image">
                    ` : ''}</div>`;
                }

                html += `
                <div class="calendar-event-group">
                    <div class="calendar-event-item ${interactiveClass}" ${clickAction} ${idAttr}>
                        <div class="cal-row">
                            <div class="cal-date">${dateHtml}</div>
                            <div class="cal-details">
                                ${detailsHtml}
                                ${plusIcon}
                                ${imgPayload}
                            </div>
                        </div>
                    </div>
                </div>`;
            });
            calTxt.innerHTML = html;
            
            // Scroll today's event to center
            setTimeout(() => {
                const todayEvent = document.getElementById('today-event');
                if (todayEvent) {
                    todayEvent.scrollIntoView({ block: 'center' });
                }
            }, 100);
        }

        if (data[0].marquee) {
            const track = document.getElementById('marquee-track');
            const spacer = " &nbsp;&nbsp; // &nbsp;&nbsp; ";
            const fullText = data[0].marquee + spacer;
            track.innerHTML = `<span>${fullText.repeat(8)}</span><span>${fullText.repeat(8)}</span>`;
        }
    }
}

window.unfoldCalendarEvent = function(idx) {
    const evt = calendarData[0].events[idx];
    if (!evt || !evt.spreadData) return;
    unfoldProject(evt.spreadData.id);
};

function renderMagazineCover(data) {
    const mag = document.getElementById('magazine-cover-container');
    if (data.length > 0) {
        mag.innerHTML = `
            <div style="position: relative; display: inline-block; max-width: 100%; max-height: 100%;">
                <img src="${getSafeImg(data[0].images[0])}" alt="Apollo Magazine Cover" style="display: block; max-height: 60vh; width: auto; max-width: 100%; object-fit: contain; margin: 0 auto;">
                <div class="vac-stamp">DO NOT OPEN</div>
                <div class="vac-weld"></div>
            </div>
            <div class="vac-release">ARCHIVAL MASTER // RELEASE DATE: SEP 2026</div>
            <div class="vac-barcode"></div>
        `;
    }
}

// ---------------------------------------------------------------------------
// CARD SIZE MATH
// ---------------------------------------------------------------------------
function getRemPx() {
    return parseFloat(getComputedStyle(document.documentElement).fontSize);
}

function sizeCard(img, card, isGrid) {
    const R = img.naturalWidth / img.naturalHeight;
    if (!R || isNaN(R)) return;

    // Grid size 500 (increased), chaotic stack 1455 (+15%)
    const targetArea = isGrid ? 500 : 1455;
    const randomScale = isGrid ? (0.95 + Math.random() * 0.05) : 1.0;

    let hRem = Math.sqrt(targetArea / R) * randomScale;
    let wRem = Math.sqrt(targetArea * R) * randomScale;

    // Cap horizontal width on mobile so it doesn't overflow wildly
    if (window.innerWidth <= 900) {
        const maxMobileWidthRem = (window.innerWidth / getRemPx()) * 1.35; // Allow minor overflow due to scaling
        if (wRem > maxMobileWidthRem) {
            const scaleDown = maxMobileWidthRem / wRem;
            wRem *= scaleDown;
            hRem *= scaleDown;
        }
    }

    img.style.width = `${wRem}rem`;
    img.style.height = `${hRem}rem`;

    const shortestSide = Math.min(wRem, hRem);
    const framePad = shortestSide * 0.055;
    card.style.padding = `${framePad}rem`;

    // Dynamic SVG mask to center holes precisely in the frame padding
    const holeCx = framePad / 2;
    const holeR = framePad * 0.22;
    const svgMask = `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cmask id='holes'%3E%3Crect width='100%25' height='100%25' fill='white'/%3E%3Ccircle cx='${holeCx}rem' cy='10%25' r='${holeR}rem' fill='black'/%3E%3Ccircle cx='${holeCx}rem' cy='30%25' r='${holeR}rem' fill='black'/%3E%3Ccircle cx='${holeCx}rem' cy='50%25' r='${holeR}rem' fill='black'/%3E%3Ccircle cx='${holeCx}rem' cy='70%25' r='${holeR}rem' fill='black'/%3E%3Ccircle cx='${holeCx}rem' cy='90%25' r='${holeR}rem' fill='black'/%3E%3C/mask%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='black' mask='url(%23holes)'/%3E%3C/svg%3E")`;
    const bg = card.querySelector('.paper-card-bg');
    if (bg) {
        bg.style.maskImage = svgMask;
        bg.style.webkitMaskImage = svgMask;
    }

    const noteEl = card.querySelector('.bookmark-note');
    if (noteEl) {
        const noteWidth = shortestSide * 0.45;
        noteEl.style.width = `${noteWidth}rem`;
        noteEl.style.minWidth = `${noteWidth}rem`;
        const noteFontSize = shortestSide * 0.025; 
        noteEl.style.fontSize = `${noteFontSize}rem`;
    }

    const band = card.querySelector('.belly-band');
    if (band) {
        band.style.padding = `${shortestSide * 0.16}rem ${shortestSide * 0.04}rem`;
        const tape = band.querySelector('.belly-tape');
        if (tape) {
            const tapeSize = shortestSide * 0.12; 
            tape.style.width = `${tapeSize}rem`;
            tape.style.height = `${tapeSize}rem`;
            tape.style.left = `calc(43% - ${tapeSize / 2}rem)`;
        }
    }
}

function renderPile(data, isGrid = false) {
    pile.innerHTML = '';
    document.body.classList.toggle('grid-mode', isGrid);
    data.forEach((p, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'card-wrapper';
        if (!isGrid) {
            wrapper.style.position = 'absolute';
            wrapper.style.width = '80%'; 
            wrapper.style.zIndex = data.length - i;
            wrapper.style.transform = `rotate(${Math.random() * 6 - 3}deg)`;
            wrapper.onclick = () => shuffleToBack(wrapper);
        }
        wrapper.appendChild(createCard(p, isGrid));
        pile.appendChild(wrapper);
    });
}

function createCard(p, isGrid) {
    const card = document.createElement('div');
    card.className = 'paper-card';
    
    let note = p.metadata.description ? `
        <div class="bookmark-note" onclick="handleMobileTap(event, '${p.id}', this.closest('.card-wrapper'))">
            <img src="logo.png" class="stamp-logo">
            <div class="note-ref-code">[ REF: ARC-${p.id.substring(0,6).toUpperCase()} ]</div>
            <div class="note-divider"></div>
            <div class="note-title">${p.metadata.name}</div>
            <div class="note-divider"></div>
            <div class="note-meta-grid">
                ${getNoteGridHtml(p)}
            </div>
            <div class="note-divider"></div>
            <div class="note-text-content">${p.metadata.description}</div>
        </div>` : '';
        
    card.innerHTML = `
        <div class="paper-card-bg"></div>
        <div class="card-inner-frame"></div>
        ${note}
        <div class="belly-band" onclick="handleMobileTap(event, '${p.id}', this.closest('.card-wrapper'))">
            <div class="belly-seam"></div>
            <div class="belly-tape" style="background-color: #e8e4d9"></div>
        </div>`;

    const img = document.createElement('img');
    img.alt = p.metadata.name || 'Project';
    img.src = getSafeImg(p.titleImage);
    
    img.onload = () => sizeCard(img, card, isGrid);
    if (img.complete && img.naturalWidth) sizeCard(img, card, isGrid);
    
    card.querySelector('.card-inner-frame').appendChild(img);
    return card;
}

function shuffleToBack(w) {
    w.style.pointerEvents = 'none';
    w.style.transform = 'translate(60%, -20%) rotate(20deg)';
    w.style.opacity = '0';
    setTimeout(() => {
        pile.append(w);
        let cards = Array.from(pile.querySelectorAll('.card-wrapper'));
        let len = cards.length;
        cards.forEach((el, idx) => el.style.zIndex = len - idx);
        w.style.opacity = '1';
        w.style.transform = `rotate(${Math.random() * 6 - 3}deg)`;
        w.style.pointerEvents = 'auto';
    }, 600);
}

function filterProjects(tag, btn) {
    window._blockTagDialActions = true;
    setTimeout(() => { window._blockTagDialActions = false; }, 500); // Auto-unlock tag dial actions after reflow
    const over = document.getElementById('unfold-overlay');
    if (over) { document.body.classList.remove('spread-open'); over.remove(); }
    document.querySelectorAll('.tag-filter').forEach(b => b.classList.remove('active-tag'));
    btn.classList.add('active-tag');
    
    // Force scroll to top immediately and after DOM/layout updates settle
    window.scrollTo(0, 0);
    setTimeout(() => window.scrollTo(0, 0), 50);
    setTimeout(() => window.scrollTo(0, 0), 150);
    
    renderPile(tag === 'All' ? archiveData : archiveData.filter(p => p.metadata.tags.some(t => t.toLowerCase() === tag.toLowerCase())), tag !== 'All');
}


window.openLightbox = function(index, event) {
    if (event) event.stopPropagation();
    const gallery = window.currentLightboxGallery;
    if (!gallery || !gallery[index]) return;
    
    let box = document.getElementById('spread-lightbox');
    const isNew = !box;
    if (isNew) {
        box = document.createElement('div');
        box.id = 'spread-lightbox';
        document.body.appendChild(box);
        
        box._keyHandler = (e) => {
            if (e.key === 'Escape') window.closeLightbox();
            else if (e.key === 'ArrowLeft') window.prevSlide(e);
            else if (e.key === 'ArrowRight') window.nextSlide(e);
        };
        document.addEventListener('keydown', box._keyHandler);
    }
    
    const item = gallery[index];
    const safeSrc = getSafeImg(item.src);
    const desc = item.desc;
    const showArrows = gallery.length > 1;
    
    box.innerHTML = `
        <div class="close-minus" style="position: absolute; top: 3.5rem; right: 4rem; color: white; z-index: 1000005;" onclick="window.closeLightbox(event)" ontouchstart="window.closeLightbox(event)">–</div>
        ${showArrows ? '<div class="lightbox-nav lightbox-prev" onclick="prevSlide(event)">&#10094;</div>' : ''}
        <img src="${safeSrc}" alt="Detail View" onclick="event.stopPropagation()">
        ${desc ? `<div class="lightbox-caption" onclick="event.stopPropagation()">${desc}</div>` : ''}
        ${showArrows ? '<div class="lightbox-nav lightbox-next" onclick="nextSlide(event)">&#10095;</div>' : ''}
    `;
    
    box.onclick = window.closeLightbox;
    window.currentLightboxIndex = index;
    
    if (isNew) {
        requestAnimationFrame(() => {
            box.style.opacity = '1';
        });
    }
};

window.closeLightbox = function(event) {
    if (event) event.stopPropagation();
    const box = document.getElementById('spread-lightbox');
    if (box) {
        if (box._keyHandler) document.removeEventListener('keydown', box._keyHandler);
        box.style.opacity = '0';
        setTimeout(() => box.remove(), 300);
    }
};

window.prevSlide = function(event) {
    if (event) event.stopPropagation();
    const gallery = window.currentLightboxGallery;
    if (!gallery) return;
    let idx = window.currentLightboxIndex - 1;
    if (idx < 0) idx = gallery.length - 1;
    window.openLightbox(idx, event);
};

window.nextSlide = function(event) {
    if (event) event.stopPropagation();
    const gallery = window.currentLightboxGallery;
    if (!gallery) return;
    let idx = window.currentLightboxIndex + 1;
    if (idx >= gallery.length) idx = 0;
    window.openLightbox(idx, event);
};

window.openPostitLightbox = function(event) {
    if (event) event.stopPropagation();
    const p = window.currentPostitData;
    if (!p) return;
    
    const htmlContent = `
        <img src="logo.png" class="stamp-logo">
        <div class="note-ref-code">[ REF: ARC-${p.id.substring(0,6).toUpperCase()} ]</div>
        <div class="note-divider"></div>
        <div class="note-title">${p.metadata.name}</div>
        <div class="note-divider"></div>
        <div class="note-meta-grid">
            ${getNoteGridHtml(p)}
        </div>
        <div class="note-divider"></div>
        <div class="note-text-content" style="display: block; -webkit-line-clamp: unset; overflow: visible;">${p.metadata.description || ''}</div>
    `;

    // Measure exact post-it height dynamically
    const dummy = document.createElement('div');
    dummy.style.visibility = 'hidden';
    dummy.style.position = 'absolute';
    dummy.style.width = '272px';
    dummy.className = 'bookmark-note spread-note';
    dummy.innerHTML = htmlContent;
    document.body.appendChild(dummy);
    let nativeHeight = dummy.offsetHeight;
    document.body.removeChild(dummy);
    if (!nativeHeight || nativeHeight < 100) nativeHeight = 400;

    const box = document.createElement('div');
    box.id = 'spread-lightbox';
    
    // Calculate scale factor to make it fill the screen just like the images do (85vh max)
    let vh = window.innerHeight;
    let vw = window.innerWidth;
    let scaleH = (vh * 0.85) / nativeHeight;
    let scaleW = (vw * 0.90) / 272;
    let optimalScale = Math.min(scaleH, scaleW, 4); // Cap at 4x to prevent extreme zooming
    
    // Use the existing lightbox styles, but center the post-it content and scale it up to fullscreen
    box.innerHTML = `
        <div style="transform: scale(${optimalScale}); transform-origin: center; cursor: default;" onclick="event.stopPropagation()">
            <div class="bookmark-note spread-note" style="margin:0; width:272px; min-width:unset; transform:none;">
                ${htmlContent}
            </div>
        </div>
    `;
    box.onclick = () => {
        box.style.opacity = '0';
        setTimeout(() => box.remove(), 300);
    };
    document.body.appendChild(box);
    requestAnimationFrame(() => {
        box.style.opacity = '1';
    });
};

function initSpreadCanvas(containerId, contentId, contentWidth, contentHeight) {
    const container = document.getElementById(containerId);
    const content = document.getElementById(contentId);
    if (!container || !content) return;

    let scale = 1;
    let tx = 0, ty = 0;
    let isDragging = false;
    let startX = 0, startY = 0;

    // Pan via drag
    container.addEventListener('mousedown', e => {
        isDragging = true;
        startX = e.clientX - tx;
        startY = e.clientY - ty;
    });
    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        tx = e.clientX - startX;
        ty = e.clientY - startY;
        content.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    });
    window.addEventListener('mouseup', () => isDragging = false);

    // Zoom via wheel
    container.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomIntensity = 0.002;
        const wheel = e.deltaY < 0 ? 1 : -1;
        const zoom = Math.exp(wheel * zoomIntensity * 30); // Smooth zoom factor
        
        // Calculate pointer position relative to content to zoom into pointer
        const rect = container.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;

        // Calculate offset difference
        const dx = (pointerX - tx) * (zoom - 1);
        const dy = (pointerY - ty) * (zoom - 1);

        tx -= dx;
        ty -= dy;
        scale *= zoom;
        
        // Constrain scale
        scale = Math.min(Math.max(scale, 0.1), 5);
        content.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }, { passive: false });
    
    // Initial centering
    setTimeout(() => {
        const cRect = container.getBoundingClientRect();
        const scaleFitX = (cRect.width - 160) / contentWidth;
        const scaleFitY = (cRect.height - 300) / contentHeight;
        const initialScale = Math.min(scaleFitX, scaleFitY, 1);
        
        scale = initialScale;
        tx = (cRect.width - (contentWidth * scale)) / 2;
        ty = (cRect.height - (contentHeight * scale)) / 2;
        content.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }, 50);
}

function unfoldProject(id) {
    window.history.pushState({ projectId: id }, '', '?project=' + id);
    let p = archiveData.find(proj => proj.id === id);
    if (!p) {
        // Fallback to searching calendar data
        for (let i = 0; i < calendarData[0].events.length; i++) {
            if (calendarData[0].events[i].spreadData && calendarData[0].events[i].spreadData.id === id) {
                p = calendarData[0].events[i].spreadData;
                break;
            }
        }
    }
    if (!p) return;

    document.body.classList.add('spread-open');
    filterBar.style.opacity = '0';
    filterBar.style.pointerEvents = 'none';
    const over = document.createElement('div');
    over.id = 'unfold-overlay';
    over.classList.add('glass-overlay');
    
    window._spreadEscHandler = (e) => {
        if (e.key === 'Escape') {
            if (document.getElementById('spread-lightbox')) return; // Let lightbox handle its own Escape
            document.body.classList.remove('spread-open');
            filterBar.style.opacity='1';
            filterBar.style.pointerEvents='auto';
            const ov = document.getElementById('unfold-overlay');
            if(ov) ov.remove();
            document.removeEventListener('keydown', window._spreadEscHandler);
            window.history.pushState({}, '', window.location.pathname);
            if (window.cameFromSearch) {
                window.cameFromSearch = false;
                document.body.classList.add('search-open');
                document.addEventListener('keydown', window._searchEscHandler);
            }
        }
    };
    document.addEventListener('keydown', window._spreadEscHandler);
    
    window.closeMobileSpread = function(btn) {
        document.body.classList.remove('spread-open');
        const fb = document.getElementById('filter-bar');
        if(fb){ fb.style.opacity='1'; fb.style.pointerEvents='auto'; }
        
        // Find the overlay wrapper and remove it
        let overlay = btn.closest('#unfold-overlay') || btn.parentElement;
        if(overlay) overlay.remove();
        
        document.removeEventListener('keydown', window._spreadEscHandler);
        window.history.pushState({}, '', window.location.pathname);
        if(window.cameFromSearch){ 
            window.cameFromSearch=false; 
            document.body.classList.add('search-open'); 
            document.addEventListener('keydown', window._searchEscHandler); 
        }
    };

    // Initialize Spread Loader
    isSpreadLoading = true;
    spreadDataReady = false;
    loadingProgress = 100;
    loadingColorIndex = 0;
    over.innerHTML = `
        <div class="close-minus" onclick="if(window.closeMobileSpread) window.closeMobileSpread(this); else { document.body.classList.remove('spread-open'); const fb = document.getElementById('filter-bar'); if(fb){ fb.style.opacity='1'; fb.style.pointerEvents='auto'; } this.parentElement.remove(); document.removeEventListener('keydown', window._spreadEscHandler); window.history.pushState({}, '', window.location.pathname); if(window.cameFromSearch){ window.cameFromSearch=false; document.body.classList.add('search-open'); document.addEventListener('keydown', window._searchEscHandler); } }" ontouchstart="if(window.closeMobileSpread) window.closeMobileSpread(this); else { document.body.classList.remove('spread-open'); const fb = document.getElementById('filter-bar'); if(fb){ fb.style.opacity='1'; fb.style.pointerEvents='auto'; } this.parentElement.remove(); document.removeEventListener('keydown', window._spreadEscHandler); window.history.pushState({}, '', window.location.pathname); if(window.cameFromSearch){ window.cameFromSearch=false; document.body.classList.add('search-open'); document.addEventListener('keydown', window._searchEscHandler); } }">–</div>
        
        <div style="position: absolute; top: 8rem; bottom: 4rem; left: 4rem; right: 4rem; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <div id="spread-loading" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
                <div style="position: relative; width: 22rem; display: inline-block;">
                    <img src="apollologonextended.png" style="width: 100%; display: block; filter: brightness(0) invert(1) drop-shadow(-1px -1px 2px rgba(0,0,0,0.5)); opacity: 0.9;" alt="Loading Base">
                    <div class="loading-fill-layer" style="position: absolute; inset: 0; background-color: #B24F44; -webkit-mask-image: url('apollologonextended.png'); -webkit-mask-size: 100% 100%; -webkit-mask-repeat: no-repeat; clip-path: inset(0 100% 0 0);"></div>
                </div>
            </div>
        </div>
        <div class="right-col-canvas" id="canvas-container" style="opacity: 0; transition: opacity 0.5s;">
            <div class="spread-canvas-content" id="canvas-content" style="position: relative;"></div>
        </div>
        <!-- SHARE BUTTON COMPLETELY REMOVED -->
    `;
    document.body.appendChild(over);

    // Kick off animation loop now that the element is in the DOM
    animateLoadingLogo();

    // Measure exact post-it height dynamically to prevent physics bounding box overflow
    const dummy = document.createElement('div');
    dummy.style.visibility = 'hidden';
    dummy.style.position = 'absolute';
    dummy.style.width = '272px';
    dummy.className = 'bookmark-note spread-note';
    dummy.innerHTML = `
        <img src="logo.png" class="stamp-logo">
        <div class="note-ref-code">[ REF: ARC-${p.id.substring(0,6).toUpperCase()} ]</div>
        <div class="note-divider"></div>
        <div class="note-title">${p.metadata.name}</div>
        <div class="note-divider"></div>
        <div class="note-meta-grid">
            ${getNoteGridHtml(p)}
        </div>
        <div class="note-divider"></div>
        <div class="note-text-content" style="display: block; -webkit-line-clamp: unset; overflow: visible;">${p.metadata.description || ''}</div>
    `;
    document.body.appendChild(dummy);
    let exactPostitHeight = dummy.offsetHeight;
    document.body.removeChild(dummy);
    if (!exactPostitHeight || exactPostitHeight < 100) exactPostitHeight = 400;

    // Collect all items
    const allItems = [
        { type: 'postit', p: p },
        { type: 'image', src: p.titleImage, name: "cover drawing", desc: 'cover drawing' }
    ];
    (p.images || []).forEach((img, i) => {
        let name = "drawing " + (i+1);
        if(img && img.title) name = img.title;
        else if (typeof img === 'string' && img.includes('drive.google.com')) {
            name = "drawing " + (i+1);
        } else if (typeof img === 'string') {
            const parts = img.split('/');
            name = parts[parts.length-1].split('.')[0].replace(/[-_]/g, ' ');
        }
        allItems.push({ type: 'image', src: img, name: name, desc: name });
    });

    // 1. Preload images
    Promise.all(allItems.map(item => {
        if (item.type === 'postit') {
            item.width = 272; // 17rem approx width
            item.height = exactPostitHeight; // Measured exact height
            return Promise.resolve();
        } else {
            return new Promise(resolve => {
                const img = new Image();
                img.src = getSafeImg(item.src);
                img.onload = () => { item.width = img.naturalWidth; item.height = img.naturalHeight; resolve(); };
                img.onerror = () => { item.width = 300; item.height = 300; resolve(); };
            });
        }
    })).then(() => {
        
        // 2. Statistical Analysis & Scaling Rules
        const normalItems = allItems.filter(i => i.type !== 'postit');
        const areas = normalItems.map(i => i.width * i.height).sort((a,b) => a-b);
        const medianArea = areas[Math.floor(areas.length / 2)] || 100000;
        
        normalItems.forEach(item => {
            let targetArea = medianArea * 0.55; // Shrink drawings significantly to give them more room to breathe
            const ar = item.width / item.height;
            const initialScale = Math.sqrt(medianArea / (item.width * item.height));
            
            // Outlier Handling
            if (ar > 1.8 || ar < 0.6 || initialScale < 0.85) {
                targetArea *= 2; 
            }
            
            item.targetWidth = Math.sqrt(targetArea * ar);
            item.targetHeight = item.targetWidth / ar;
            item.rotation = 0;
        });

        // Calculate median target height of images to scale the post-it correctly
        const targetHeights = normalItems.map(i => i.targetHeight).sort((a,b) => a-b);
        const medianTargetHeight = targetHeights[Math.floor(targetHeights.length / 2)] || 400;

        const postitItem = allItems.find(i => i.type === 'postit');
        if (postitItem) {
            // Scale it to 75% of the median vertical edge, using its exact native height.
            postitItem.scaleFactor = Math.max(0.5, (medianTargetHeight / exactPostitHeight) * 0.75);
            
            // Keep physics bounding box matching the scaled visual size
            postitItem.targetWidth = 272 * postitItem.scaleFactor;
            postitItem.targetHeight = exactPostitHeight * postitItem.scaleFactor; 
            postitItem.rotation = 0;
        }

        // 3. Initialize items in a rough grid
        let cols = Math.ceil(Math.sqrt(allItems.length));
        let startX = 0, startY = 0, maxH = 0;
        allItems.forEach((item, i) => {
            if (i > 0 && i % cols === 0) { 
                startX = 0; 
                startY += maxH + 60; 
                maxH = 0; 
            }
            item.x = startX; 
            item.y = startY;
            startX += item.targetWidth + 60;
            maxH = Math.max(maxH, item.targetHeight);
        });
        
        // Center initial cluster roughly at 0,0
        let cx = allItems.reduce((sum, i) => sum + i.x, 0) / allItems.length;
        let cy = allItems.reduce((sum, i) => sum + i.y, 0) / allItems.length;
        allItems.forEach(item => { 
            item.x -= cx; 
            item.y -= cy; 
            item.vx = 0; 
            item.vy = 0; 
        });

        // Calculate dynamic gravity based on project size
        // Normal gravity is 0.003. For projects over 10 items, gravity weakens linearly
        // so massive projects don't crush their centers.
        let gravity = 0.003 * Math.min(1, 10 / allItems.length);

        // 4. Force-Directed Simulation (Relaxation Loop)
        for (let step = 0; step < 150; step++) {
            // Center attraction
            allItems.forEach(item => {
                item.vx -= item.x * gravity;
                item.vy -= item.y * gravity;
            });
            
            // Repulsion
            for (let i = 0; i < allItems.length; i++) {
                for (let j = i + 1; j < allItems.length; j++) {
                    let a = allItems[i], b = allItems[j];
                    let dx = a.x - b.x;
                    let dy = a.y - b.y;
                    
                    if (dx === 0 && dy === 0) { dx = Math.random(); dy = Math.random(); }
                    
                    // Maintain hard minimum gap (no overlap allowed, increased spacing)
                    let w = (a.targetWidth + b.targetWidth) / 2 + 140; // 140px gap minimum
                    let h = (a.targetHeight + b.targetHeight) / 2 + 140;
                    
                    if (Math.abs(dx) < w && Math.abs(dy) < h) {
                        let overlapX = w - Math.abs(dx);
                        let overlapY = h - Math.abs(dy);
                        if (overlapX < overlapY) {
                            let push = overlapX * 0.15 * Math.sign(dx);
                            a.vx += push; b.vx -= push;
                        } else {
                            let push = overlapY * 0.15 * Math.sign(dy);
                            a.vy += push; b.vy -= push;
                        }
                    }
                }
            }
            // Integration & Friction
            allItems.forEach(item => {
                item.x += item.vx; 
                item.y += item.vy;
                item.vx *= 0.6; 
                item.vy *= 0.6; 
            });
        }
        
        // Explicitly align the Post-It's bottom edge to the Cover Image's bottom edge
        if (allItems.length > 1 && allItems[0].type === 'postit' && allItems[1].type === 'image') {
            let postit = allItems[0];
            let cover = allItems[1];
            
            // The user wants to align with the bottom of the card ITSELF, not the text caption below it.
            let coverVisualBottom = cover.y + cover.targetHeight/2;
            
            // Set post-it y so its bottom exactly matches the cover's image bottom.
            // We subtract 12px to compensate for the visual weight of the post-it's 0.8rem drop shadow!
            postit.y = coverVisualBottom - postit.targetHeight/2 - 12;
        }

        spreadDataReady = true; // Signal the animation loop that it can stop when it reaches 0%

        // Wait for the logo loading animation to complete its current loop
        const checkDone = setInterval(() => {
            if (loadingProgress <= 0) {
                clearInterval(checkDone);
                isSpreadLoading = false; 
                spreadDataReady = false;

                // 5. Calculate final bounding box and render
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                allItems.forEach(item => {
                    minX = Math.min(minX, item.x - item.targetWidth/2);
                    minY = Math.min(minY, item.y - item.targetHeight/2);
                    maxX = Math.max(maxX, item.x + item.targetWidth/2);
                    maxY = Math.max(maxY, item.y + item.targetHeight/2);
                });

                let contentWidth = maxX - minX;
                let contentHeight = maxY - minY;
                let html = '';
                
                window.currentLightboxGallery = allItems.filter(i => i.type === 'image');
                
                if (window.innerWidth <= 900) {
                    const postitItem = allItems.find(i => i.type === 'postit');
                    const imageItems = window.currentLightboxGallery;

                    html += '<div class="mobile-project-layout" style="display: flex; flex-direction: column; width: 100vw; height: 100svh; overflow: hidden;">';
                    
                    // Add a mobile-specific close minus button that is guaranteed to be on top of the layout!
                    html += '<div class="close-minus" style="position: absolute; top: 3.5rem; right: 4rem; z-index: 1000000; color: black;" onclick="window.closeMobileSpread(this)" ontouchstart="window.closeMobileSpread(this)">–</div>';

                    // Top Gallery (Swipeable)
                    html += '<div class="mobile-swipe-gallery" style="flex: 1; display: flex; overflow-x: auto; scroll-snap-type: x mandatory; align-items: center; padding-top: 10rem;">';
                    imageItems.forEach((item, idx) => {
                        const isWide = item.width > item.height * 1.2;
                        const widthStyle = isWide ? 'width: 150vw;' : 'width: 100vw;';
                        html += `
                        <div class="mobile-gallery-box" style="flex-shrink: 0; scroll-snap-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; ${widthStyle}">
                            <div class="mobile-img-container" style="width: 100%; height: 50%; ${isWide ? 'overflow-x: auto; overflow-y: hidden;' : ''} display: flex; align-items: center; justify-content: center;">
                                <img src="${getSafeImg(item.src)}" alt="${item.name}" style="${isWide ? 'height: 100%; width: max-content; max-width: none;' : 'width: 90%; height: 100%; object-fit: contain;'}" onclick="event.stopPropagation(); openLightbox(${idx})">
                            </div>
                            <div class="mobile-img-title" style="margin-top: 1rem; font-family: monospace; font-size: 1.2rem; font-weight: bold;">${item.name}</div>
                        </div>`;
                    });
                    html += '</div>';

                    // Bottom Post-it and Share Button
                    if (postitItem) {
                        window.currentPostitData = postitItem.p;
                        html += `
                        <div class="mobile-postit-wrapper" style="width: 100vw; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 10;">
                            <div class="bookmark-note" style="position: relative; width: 90%; max-width: 400px; transform: none; box-shadow: none; padding: 1.5rem; max-height: 30vh; display: flex; flex-direction: column; margin-bottom: 1rem;">
                                <div style="overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; touch-action: pan-y; z-index: 1; width: 100%; font-size: clamp(0.7rem, 2.5vw, 1rem); word-break: break-word;">
                                    <img src="logo.png" class="stamp-logo">
                                    <div class="note-ref-code">[ REF: ARC-${postitItem.p.id.substring(0,6).toUpperCase()} ]</div>
                                    <div class="note-divider"></div>
                                    <div class="note-title" style="word-break: break-word; hyphens: auto;">${postitItem.p.metadata.name}</div>
                                    <div class="note-divider"></div>
                                    <div class="note-meta-grid" style="width: 100%; overflow: hidden;">${getNoteGridHtml(postitItem.p)}</div>
                                    <div class="note-divider"></div>
                                    <div class="note-text-content" style="word-break: break-word;">${postitItem.p.metadata.description || ''}</div>
                                </div>
                            </div>
                            <button class="tag-filter highlight-link" style="cursor: pointer; background: transparent; border: none; font-family: inherit; font-size: 1rem; color: #000; text-transform: lowercase; font-weight: bold;" onclick="window.copyProjectUrl('${postitItem.p.id}', this)">share</button>
                        </div>`;
                    }
                    html += '</div>';

                    const content = document.getElementById('canvas-content');
                    if(content) {
                        content.style.width = '100vw';
                        content.style.height = '100svh';
                        content.style.overflow = 'hidden';
                        content.innerHTML = html;
                    }

                    const loadingMsg = document.getElementById('spread-loading');
                    if(loadingMsg) loadingMsg.remove();
                    document.getElementById('canvas-container').style.opacity = '1';
                    
                    // Do NOT init physics engine
                } else {
                    allItems.forEach(item => {
                        let left = (item.x - item.targetWidth/2) - minX;
                        let top = (item.y - item.targetHeight/2) - minY;
                        let style = `position: absolute; left: ${left}px; top: ${top}px; width: ${item.targetWidth}px; height: ${item.targetHeight}px; transform: rotate(${item.rotation}deg); display: flex; flex-direction: column; align-items: center;`;
                        
                        if (item.type === 'postit') {
                            window.currentPostitData = item.p;
                            html += `
                            <div style="${style}">
                                <div class="bookmark-note spread-note" style="position: absolute !important; bottom: 0 !important; margin:0; width:272px; min-width:unset; transform: scale(${item.scaleFactor}); transform-origin: bottom center; cursor: pointer; transition: transform 0.2s;" onclick="openPostitLightbox(event)">
                                    <img src="logo.png" class="stamp-logo">
                                    <div class="note-ref-code">[ REF: ARC-${item.p.id.substring(0,6).toUpperCase()} ]</div>
                                    <div class="note-divider"></div>
                                    <div class="note-title">${item.p.metadata.name}</div>
                                    <div class="note-divider"></div>
                                    <div class="note-meta-grid">
                                        ${getNoteGridHtml(item.p)}
                                    </div>
                                    <div class="note-divider"></div>
                                    <div class="note-text-content" style="display: block; -webkit-line-clamp: unset; overflow: visible;">${item.p.metadata.description || ''}</div>
                                </div>
                            </div>`;
                        } else {
                            const imgIndex = window.currentLightboxGallery.findIndex(g => g.src === item.src);
                            html += `
                            <div style="${style}">
                                <div class="unfold-grid-item" style="width:100%; height:auto;">
                                    <img src="${getSafeImg(item.src)}" alt="${item.name}" onclick="openLightbox(${imgIndex}, event)" style="position: relative; z-index: 1; width: 100%; max-height:none; height:auto; object-fit: contain; display: block;">
                                </div>
                                <div style="width: 100%; text-align: center; font-size: 0.6rem; margin-top: 1.5rem; opacity: 0.8; font-weight: bold; text-transform: lowercase; font-family: monospace; color: black; text-shadow: 0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.8);">${item.name}</div>
                            </div>`;
                        }
                    });

                    const content = document.getElementById('canvas-content');
                    if(!content) return;
                    content.style.width = `${contentWidth}px`;
                    content.style.height = `${contentHeight}px`;
                    content.innerHTML = html;

                    const loadingMsg = document.getElementById('spread-loading');
                    if(loadingMsg) loadingMsg.remove();
                    
                    document.getElementById('canvas-container').style.opacity = '1';
                    
                    initSpreadCanvas('canvas-container', 'canvas-content', contentWidth, contentHeight);
                }
            }
        }, 30);
    });
}

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
        <div class="close-minus" onclick="document.body.classList.remove('spread-open'); this.parentElement.remove(); document.getElementById('col-archive').style.opacity = '1'; const mq=document.querySelector('.marquee-wrapper'); if(mq) mq.style.opacity='1'; const fb=document.getElementById('filter-bar'); if(fb){ fb.style.opacity=''; fb.style.pointerEvents=''; }" ontouchstart="document.body.classList.remove('spread-open'); this.parentElement.remove(); document.getElementById('col-archive').style.opacity = '1'; const mq=document.querySelector('.marquee-wrapper'); if(mq) mq.style.opacity='1'; const fb=document.getElementById('filter-bar'); if(fb){ fb.style.opacity=''; fb.style.pointerEvents=''; }">–</div>
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

init();

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
        if (filterBar && !document.body.classList.contains('spread-open')) {
            const ratioCenter = Math.abs(scrollLeft - w) / w;
            filterBar.style.opacity = Math.max(0, 1 - (ratioCenter * 2));
            filterBar.style.pointerEvents = ratioCenter < 0.5 ? 'auto' : 'none';
        }
        
        // Remove menu-open if scrolled away
        if (ratio > 0.5) col.classList.remove('menu-open');
    });
}

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


window.handleMobileTap = function(e, id, wrapper) {
    e.stopPropagation();
    if (window.innerWidth > 900 || document.body.classList.contains('grid-mode')) {
        unfoldProject(id);
        return;
    }
    
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

        // --- Magazine dial mode ---
        if (filterBar._magDialActive) {
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
            const txt = closest.textContent.toLowerCase().trim();

            // "chapters" bridge — skip it directionally like "filters"
            if (txt === 'chapters') {
                if (scrollingRight) {
                    // Expand chapter items, jump to first
                    filterBar.classList.remove('mag-chapters-collapsed');
                    filterBar.classList.add('mag-chapters-expanded');
                    const first = filterBar.querySelector('.mag-chapter-item');
                    if (first) requestAnimationFrame(() => {
                        const r = first.getBoundingClientRect();
                        const br = filterBar.getBoundingClientRect();
                        filterBar.scrollBy({ left: r.left - br.left + r.width / 2 - centerLine, behavior: 'smooth' });
                    });
                } else {
                    // Collapse and jump to "cover"
                    filterBar.classList.remove('mag-chapters-expanded');
                    filterBar.classList.add('mag-chapters-collapsed');
                    const coverBtn = document.getElementById('mag-dial-cover-btn');
                    if (coverBtn) requestAnimationFrame(() => {
                        const r = coverBtn.getBoundingClientRect();
                        const br = filterBar.getBoundingClientRect();
                        filterBar.scrollBy({ left: r.left - br.left + r.width / 2 - centerLine, behavior: 'smooth' });
                    });
                }
                return;
            }

            closest.classList.add('active-swipe-tag');

            // Collapse chapters when scrolling back to cover
            if (txt === 'cover') {
                if (filterBar.classList.contains('mag-chapters-expanded')) {
                    filterBar.classList.remove('mag-chapters-expanded');
                    filterBar.classList.add('mag-chapters-collapsed');
                }
            }

            clearTimeout(_tagScrollTimeout);
            _tagScrollTimeout = setTimeout(() => {
                if (!closest) return;
                if (window._blockMagDialActions) return; // block actions during open animation
                const t2 = closest.textContent.toLowerCase().trim();
                if (t2 === 'chapters') return;
                if (t2 === 'cover') {
                    window.closeMagazine();
                } else {
                    // It's a chapter item — navigate
                    const page = parseInt(closest.dataset.page, 10);
                    if (!isNaN(page)) { magCurrentPage = page; updateMagazineView(); }
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
