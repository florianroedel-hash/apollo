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
                let stackImagesHtml = '';
                
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
                    
                    let maxStackImgs = Math.min(2, allImages.length);
                    for(let k=0; k<maxStackImgs; k++) {
                        let idMatch = allImages[k].match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
                        if (idMatch) {
                            stackImagesHtml += `<img class="calendar-stack-piece-img" src="https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w800">`;
                        }
                    }
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
                    
                    stackImagesHtml += `<img class="calendar-stack-piece-img" src="https://drive.google.com/thumbnail?id=${evt.imgId}&sz=w800">`;
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
                    ${stackImagesHtml}
                </div>`;
            });
            calTxt.innerHTML = html;
            
            // Scroll today's event to center (Mobile mainly, but also helps initial desktop state before stacking)
            setTimeout(() => {
                const todayEvent = document.getElementById('today-event');
                if (todayEvent) {
                    const scrollContainer = todayEvent.closest('.left-col-scroll, .calendar-text-content') || todayEvent.parentElement;
                    if (scrollContainer) {
                        scrollContainer.scrollTop = todayEvent.offsetTop - (scrollContainer.clientHeight / 2) + (todayEvent.clientHeight / 2);
                    } else {
                        todayEvent.scrollIntoView({ block: 'center' });
                    }
                }
            }, 100);
            
            // Initialize Desktop Chaotic Stack
            setTimeout(initChaoticCalendarStack, 150);
        }

        // Dynamic Marquee Logic
        const marqueeWrapper = document.querySelector('.marquee-wrapper');
        const track = document.getElementById('marquee-track');
        let activeMessages = [];

        if (data[0].marquees && Array.isArray(data[0].marquees)) {
            const now = new Date();
            const timeStr = String(now.getHours()).padStart(2,'0') + ":" + String(now.getMinutes()).padStart(2,'0');
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const todayName = days[now.getDay()];
            const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            data[0].marquees.forEach(m => {
                let isActive = true;

                // 1. Date Check
                if (m.startDate) {
                    let startD = new Date(m.startDate);
                    startD.setHours(0,0,0,0);
                    if (todayDate < startD) isActive = false;
                }
                if (isActive && m.endDate) {
                    let endD = new Date(m.endDate);
                    endD.setHours(0,0,0,0);
                    if (todayDate > endD) isActive = false;
                }

                // 2. Day Check (e.g. "Monday, Wednesday")
                if (isActive && m.dayOfWeek) {
                    if (!m.dayOfWeek.toLowerCase().includes(todayName.toLowerCase())) isActive = false;
                }

                // 3. Time Check
                let sTime = m.startTime;
                let eTime = m.endTime;
                
                // Extract HH:MM if it's an ISO Date string from Google Sheets
                if (sTime && sTime.includes('T')) {
                    let d = new Date(sTime);
                    sTime = String(d.getHours()).padStart(2,'0') + ":" + String(d.getMinutes()).padStart(2,'0');
                }
                if (eTime && eTime.includes('T')) {
                    let d = new Date(eTime);
                    eTime = String(d.getHours()).padStart(2,'0') + ":" + String(d.getMinutes()).padStart(2,'0');
                }

                if (isActive && sTime && eTime) {
                    if (sTime > eTime) { // Overnight logic
                        if (timeStr < sTime && timeStr > eTime) isActive = false;
                    } else { // Standard logic
                        if (timeStr < sTime || timeStr > eTime) isActive = false;
                    }
                } else if (isActive && sTime) {
                    if (timeStr < sTime) isActive = false;
                } else if (isActive && eTime) {
                    if (timeStr > eTime) isActive = false;
                }

                if (isActive && m.message) {
                    activeMessages.push(m.message);
                }
            });
        } else if (data[0].marquee) {
            // Legacy support
            activeMessages.push(data[0].marquee);
        }

        if (activeMessages.length > 0) {
            if (marqueeWrapper) marqueeWrapper.style.display = '';
            const spacer = " &nbsp;&nbsp; // &nbsp;&nbsp; ";
            const fullText = activeMessages.join(spacer) + spacer;
            const repeats = fullText.length > 200 ? 4 : 8;
            if (track) track.innerHTML = `<span>${fullText.repeat(repeats)}</span><span>${fullText.repeat(repeats)}</span>`;
        } else {
            if (marqueeWrapper) marqueeWrapper.style.display = 'none';
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
        const latestIssueIndex = data.length - 1;
        mag.innerHTML = `
            <div style="position: relative; display: inline-block; max-width: 100%; max-height: 100%; cursor: pointer;" onclick="event.stopPropagation(); openMagazine(${latestIssueIndex})">
                <img src="${getSafeImg(data[latestIssueIndex].images[0])}" alt="Magazine Cover">
                <div class="vac-stamp">DO NOT OPEN</div>
                <div class="vac-weld"></div>
            </div>
            <div class="vac-release">ARCHIVAL MASTER // RELEASE DATE: SEP 2026</div>
            <div class="vac-barcode"></div>
        `;
        
        // Remove old chaotic stack container if it exists
        const oldStack = document.getElementById('magazine-tube-pile');
        if (oldStack) oldStack.remove();
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
    document.body.classList.remove('magazine-grid');
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

function renderMagazineGrid() {
    pile.innerHTML = '';
    document.body.classList.add('grid-mode', 'magazine-grid');
    
    magazineData.forEach((issue, index) => {
        const spiralMag = createSpiralMagazine(issue, index);
        pile.appendChild(spiralMag);
    });
}

function createCard(p, isGrid) {
    const card = document.createElement('div');
    card.className = 'paper-card';
    
    let note = p.metadata.description ? `
        <div class="bookmark-note" onclick="handleMobileTap(event, '${p.id}', this.closest('.card-wrapper'))">
            <img src="assets/images/logo.png" class="stamp-logo">
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
        <div class="belly-band" onclick="handleMobileTap(event, '${p.id}', this.closest('.card-wrapper'), true)">
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
    
    if (tag.toLowerCase() === 'magazine') {
        renderMagazineGrid();
    } else {
        renderPile(tag === 'All' ? archiveData : archiveData.filter(p => p.metadata.tags.some(t => t.toLowerCase() === tag.toLowerCase())), tag !== 'All');
    }
}

// ---------------------------------------------------------------------------
// CHAOTIC CALENDAR STACK (DESKTOP)
// ---------------------------------------------------------------------------
let calendarLeaveTimeout = null;

function initChaoticCalendarStack() {
    if (window.innerWidth <= 900) return;

    const calTxt = document.getElementById('calendar-text');
    if (!calTxt) return;
    
    // Ensure offsetParent context is correct
    calTxt.style.position = 'relative';

    const groups = Array.from(calTxt.querySelectorAll('.calendar-event-group'));
    if (groups.length === 0) return;

    function applyStack() {
        if (window.innerWidth <= 900) {
            calTxt.classList.remove('is-stacked');
            calTxt.querySelectorAll('.calendar-event-item, .calendar-stack-piece-img').forEach(el => el.style.transform = '');
            return;
        }

        calTxt.classList.add('is-stacked');

        // We pull items to the current visible center so it doesn't matter where it is scrolled
        const containerHeight = calTxt.clientHeight;
        const containerCenterVisibleY = calTxt.scrollTop + (containerHeight / 2);

        let zIdxCounter = 100;
        let todayEventGroup = null;
        let nextUpGroup = null;
        
        groups.forEach((group) => {
            if (group.classList.contains('calendar-separator')) {
                group.style.opacity = '0';
                group.style.pointerEvents = 'none';
                return;
            }

            group.style.zIndex = zIdxCounter--;

            const groupCenterY = group.offsetTop + (group.clientHeight / 2);
            
            // The text card piece
            const card = group.querySelector('.calendar-event-item');
            if (card) {
                // Scatter vertically +/- 12% of the container height
                const scatterY = (Math.random() * 0.24 - 0.12) * containerHeight;
                const ty = containerCenterVisibleY - groupCenterY + scatterY;

                const rot = Math.random() * 8 - 4; 
                const tx = Math.random() * 40 - 20; 
                card.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
                
                if (card.id === 'today-event') {
                    todayEventGroup = group;
                }
                
                if (!nextUpGroup && !card.classList.contains('is-past')) {
                    nextUpGroup = group;
                }
            }

            // The image pieces
            const imgs = group.querySelectorAll('.calendar-stack-piece-img');
            imgs.forEach(img => {
                const scatterY = (Math.random() * 0.24 - 0.12) * containerHeight;
                const ty = containerCenterVisibleY - groupCenterY + scatterY;

                const rot = Math.random() * 16 - 8; 
                const tx = Math.random() * 60 - 30; 
                img.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rot}deg)`;
            });
        });

        // Ensure "today" (the closest event) is strictly on top
        const topGroup = todayEventGroup || nextUpGroup || (groups.length > 0 ? groups[0] : null);
        
        if (topGroup) {
            topGroup.style.zIndex = '999';
        }
    }

    // Apply initially
    applyStack();

    calTxt.onmouseenter = () => {
        if (window.innerWidth <= 900) return;
        clearTimeout(calendarLeaveTimeout);
        calTxt.classList.remove('is-stacked');
        // Let CSS transition back to normal flow
        calTxt.querySelectorAll('.calendar-event-item, .calendar-stack-piece-img').forEach(el => {
            el.style.transform = '';
        });
        calTxt.querySelectorAll('.calendar-separator').forEach(el => {
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
        });
    };

    calTxt.onmouseleave = () => {
        if (window.innerWidth <= 900) return;
        clearTimeout(calendarLeaveTimeout);
        calendarLeaveTimeout = setTimeout(() => {
            applyStack();
        }, 300); // reduced from 1000ms
    };

    // Re-apply on window resize to ensure correct centering
    window.addEventListener('resize', () => {
        if (calTxt.classList.contains('is-stacked')) {
            applyStack();
        } else if (window.innerWidth <= 900) {
            calTxt.classList.remove('is-stacked');
            calTxt.querySelectorAll('.calendar-event-item, .calendar-stack-piece-img').forEach(el => el.style.transform = '');
        }
    });
}
