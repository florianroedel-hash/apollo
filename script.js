const URL_PROJECTS = 'https://script.google.com/macros/s/AKfycby3AgRD49QItpR6M3oKG0id58QCZN0a7zQbrm91Z1ZmjwvhBwJzLNI3xBuANUzsWaiVfA/exec';
const URL_CALENDAR = 'https://script.google.com/macros/s/AKfycbz5THEJ7sno1qcFbPaA0FWmtcXy3kEj4nbGGThGvHb9zRjWox57VDQghuOgdiFCbTfIIw/exec';
const URL_MAGAZINE = 'https://script.google.com/macros/s/AKfycbyxSddhc-ntCVewfsAFXLcvStqnEN14VAJ-UtMuUxYt1zttxh8C39YelbeY5-pGsvZ6mg/exec';
const URL_HISTORY = 'INSERT_YOUR_NEW_HISTORY_URL_HERE';
// We'll need a URL for audio eventually
// const URL_AUDIO = 'INSERT_AUDIO_URL_HERE';

const pile = document.getElementById('project-pile');
const filterBar = document.getElementById('filter-bar');

let archiveData = [], calendarData = [], magazineData = [], historyData = [];
let isLoaded = false, isWaitingToStart = true, magCurrentPage = 0;

function getSafeImg(url) {
    const id = url.match(/id=([^&]+)/);
    return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w1200` : url;
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

let loadingAngle = 0;
let loadingAnimReq = null;

function animateLoadingLogo() {
    const logo = document.getElementById('loading-spinner-logo');
    if (!logo) return;
    
    if (isLoaded && loadingAngle > 0 && loadingAngle % 360 < 3) {
        logo.style.transform = `rotate(${Math.round(loadingAngle / 360) * 360}deg)`;
        const overlay = document.getElementById('passcode-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.remove(); liftFog(); }, 500);
        }
        return;
    }
    
    loadingAngle += 3;
    logo.style.transform = `rotate(${loadingAngle}deg)`;
    loadingAnimReq = requestAnimationFrame(animateLoadingLogo);
}

window.checkPasscode = function(e) {
    if (e.target.value === '1665') {
        const box = e.target.closest('.passcode-box') || document.querySelector('.passcode-box');
        if (box) box.style.display = 'none';
        
        const spinner = document.getElementById('loading-spinner-wrapper');
        if (spinner) spinner.style.display = 'flex';
        
        animateLoadingLogo();
    }
};

async function init() {
    try {
        const [resProj, resCal, resMag, resHist] = await Promise.all([
            fetch(URL_PROJECTS, { redirect: 'follow' }),
            fetch(URL_CALENDAR, { redirect: 'follow' }),
            fetch(URL_MAGAZINE, { redirect: 'follow' }),
            fetch(URL_HISTORY, { redirect: 'follow' }).catch(() => null)
        ]);
        archiveData = await resProj.json();
        calendarData = await resCal.json();
        magazineData = await resMag.json();
        if (resHist && resHist.ok) historyData = await resHist.json().catch(() => []);
        generateDynamicTags();
        isLoaded = true;
        if (!document.getElementById('passcode-overlay')) liftFog();
    } catch (e) { isLoaded = true; }

    // Deep linking for Audio Library
    const urlParams = new URLSearchParams(window.location.search);
    const audioParam = urlParams.get('audio');
    if (audioParam) {
        // We lift fog immediately if passcode is not there
        // If there's an audio param, open it right away
        setTimeout(() => {
            if (isLoaded) {
                openAudioLibrary();
                playAudioTrack(audioParam);
            }
        }, 600); // Give dashboard time to render
    }
}

function generateDynamicTags() {
    let tags = new Set();
    archiveData.forEach(p => p.metadata.tags.forEach(t => tags.add(t.trim().toLowerCase())));
    filterBar.innerHTML = '';
    tags.forEach(tag => {
        const btn = document.createElement('span');
        btn.className = 'tag-filter highlight-link';
        btn.innerText = tag;
        btn.onclick = () => filterProjects(tag, btn);
        filterBar.appendChild(btn);
    });
}

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
            data[0].events.forEach(evt => {
                let lines = evt.text.split('<br>');
                let dateHtml = lines.shift() || ''; 
                let detailsHtml = lines.join('<br>') || ''; 

                let interactiveClass = evt.imgId ? 'has-invite' : '';
                let clickAction = evt.imgId ? `onclick="this.querySelector('.calendar-inline-img').classList.toggle('expanded')"` : '';
                
                let plusIcon = evt.imgId ? `<div style="margin-top: 12px;"><span class="invite-indicator">[+]</span></div>` : '';
                
                let imgPayload = evt.imgId ? `
                    <div class="calendar-inline-img">
                        <img src="https://drive.google.com/thumbnail?id=${evt.imgId}&sz=w1200" alt="Calendar Event Image">
                    </div>` : '';

                html += `
                <div class="calendar-event-group">
                    <div class="calendar-event-item ${interactiveClass}" ${clickAction}>
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
        }

        if (data[0].marquee) {
            const track = document.getElementById('marquee-track');
            const spacer = " &nbsp;&nbsp; // &nbsp;&nbsp; ";
            const fullText = data[0].marquee + spacer;
            track.innerHTML = `<span>${fullText.repeat(8)}</span><span>${fullText.repeat(8)}</span>`;
        }
    }
}

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

    const hRem = Math.sqrt(targetArea / R) * randomScale;
    const wRem = Math.sqrt(targetArea * R) * randomScale;

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
        <div class="bookmark-note" onclick="event.stopPropagation(); unfoldProject('${p.id}')">
            <img src="logo.png" class="stamp-logo">
            <div class="note-ref-code">[ REF: ARC-${p.id.substring(0,6).toUpperCase()} ]</div>
            <div class="note-divider"></div>
            <div class="note-title">${p.metadata.name}</div>
            <div class="note-divider"></div>
            <div class="note-meta-grid">
                <div>Year</div><div>${p.metadata.year || '2024'}</div>
                <div>Course</div><div>Studio Alpha</div>
                <div>Track</div><div>Laurea Magistrale</div>
                <div>Prof</div><div>${p.metadata.author || 'Dr. Smith'}</div>
            </div>
            <div class="note-divider"></div>
            <div class="note-text-content">${p.metadata.description}</div>
        </div>` : '';
        
    card.innerHTML = `
        <div class="paper-card-bg"></div>
        <div class="card-inner-frame"></div>
        ${note}
        <div class="belly-band" onclick="event.stopPropagation(); unfoldProject('${p.id}')">
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
        pile.prepend(w);
        Array.from(pile.querySelectorAll('.card-wrapper')).forEach((el, idx) => el.style.zIndex = idx);
        w.style.opacity = '1';
        w.style.transform = `rotate(${Math.random() * 6 - 3}deg)`;
        w.style.pointerEvents = 'auto';
    }, 600);
}

function filterProjects(tag, btn) {
    const over = document.getElementById('unfold-overlay');
    if (over) { document.body.classList.remove('spread-open'); over.remove(); }
    document.querySelectorAll('.tag-filter').forEach(b => b.classList.remove('active-tag'));
    btn.classList.add('active-tag');
    window.scrollTo(0, 0);
    renderPile(tag === 'All' ? archiveData : archiveData.filter(p => p.metadata.tags.some(t => t.toLowerCase() === tag.toLowerCase())), tag !== 'All');
}

window.openLightbox = function(src, event) {
    event.stopPropagation();
    const box = document.createElement('div');
    box.id = 'spread-lightbox';
    box.innerHTML = `<img src="${src}" alt="Detail View">`;
    box.onclick = () => {
        box.style.opacity = '0';
        setTimeout(() => box.remove(), 300);
    };
    document.body.appendChild(box);
    requestAnimationFrame(() => {
        box.style.opacity = '1';
    });
};

function unfoldProject(id) {
    const p = archiveData.find(proj => proj.id === id);
    document.body.classList.add('spread-open');
    filterBar.style.opacity = '0';
    filterBar.style.pointerEvents = 'none';
    const over = document.createElement('div');
    over.id = 'unfold-overlay';
    
    over.innerHTML = `
        <div class="close-minus" onclick="document.body.classList.remove('spread-open'); filterBar.style.opacity='1'; filterBar.style.pointerEvents='auto'; this.parentElement.remove()">–</div>
        
        <div class="spread-layout">
            
            <div class="spread-col left-col-scroll">
                
                <div class="bookmark-note spread-note">
                    <img src="logo.png" class="stamp-logo">
                    <div class="note-ref-code">[ REF: ARC-${p.id.substring(0,6).toUpperCase()} ]</div>
                    <div class="note-divider"></div>
                    <div class="note-title">${p.metadata.name}</div>
                    <div class="note-divider"></div>
                    <div class="note-meta-grid">
                        <div>Year</div><div>${p.metadata.year || '2024'}</div>
                        <div>Course</div><div>Studio Alpha</div>
                        <div>Track</div><div>Laurea Magistrale</div>
                        <div>Prof</div><div>${p.metadata.author || 'Dr. Smith'}</div>
                    </div>
                    <div class="note-divider"></div>
                    <div class="note-text-content" style="display: block; -webkit-line-clamp: unset; overflow: visible;">${p.metadata.description || ''}</div>
                </div>
                
            </div>

            <div class="spread-col right-col-scroll">
                <div class="unfold-gallery-grid" style="padding-top: 4rem;">
                    <div style="display:flex; flex-direction: column; width: fit-content;">
                        <div class="unfold-grid-item">
                            <img src="${getSafeImg(p.titleImage)}" alt="cover drawing" onclick="openLightbox('${getSafeImg(p.titleImage)}', event)" style="position: relative; z-index: 1;">
                        </div>
                        <div style="width: 100%; text-align: left; font-size: 0.8rem; margin-top: 1rem; opacity: 0.6; font-weight: bold; text-transform: lowercase;">cover drawing</div>
                    </div>
                    ${(p.images || []).map((img, i) => {
                        let name = "drawing " + (i+1);
                        if(img && img.title) name = img.title;
                        else if (typeof img === 'string') {
                            const parts = img.split('/');
                            name = parts[parts.length-1].split('.')[0].replace(/[-_]/g, ' ');
                        }
                        return `
                        <div style="display:flex; flex-direction: column; width: fit-content;">
                            <div class="unfold-grid-item">
                                <img src="${getSafeImg(img)}" alt="${name}" onclick="openLightbox('${getSafeImg(img)}', event)" style="position: relative; z-index: 1;">
                            </div>
                            <div style="width: 100%; text-align: left; font-size: 0.8rem; margin-top: 1rem; opacity: 0.6; font-weight: bold; text-transform: lowercase;">${name}</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>

        </div>
    `;
    
    document.body.appendChild(over);
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
    
    // Restore filter bar
    filterBar.style.opacity = '1';
    filterBar.style.pointerEvents = 'auto';
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

    let html = '';
    for (let i = 0; i < leaves; i++) {
        html += `<div class="book-leaf ${i < magCurrentPage ? 'flipped' : ''}" style="z-index:${i < magCurrentPage ? i : 1000 - i}" onclick="magCurrentPage = (magCurrentPage == ${i} ? ${i+1} : ${i}); updateMagazineView()">
            <div class="page-front">${mag[i*2] ? `<img src="${getSafeImg(mag[i*2])}" alt="Magazine Page" style="background: #e0e0e0;">` : ''}</div>
            <div class="page-back">${mag[i*2+1] ? `<img src="${getSafeImg(mag[i*2+1])}" alt="Magazine Page" style="background: #e0e0e0;">` : ''}</div>
        </div>`;
    }
    
    let chaptersData = (magazineData[0].chapters && magazineData[0].chapters.length > 0)
        ? magazineData[0].chapters
        : [
            { name: "01 editorial", page: 0 },
            { name: "02 features", page: 1 },
            { name: "03 interviews", page: 2 },
            { name: "04 essays", page: 3 },
            { name: "05 archive", page: 4 }
        ];
    let chaptersHtml = chaptersData.map(ch => `
        <span class="highlight-link ${magCurrentPage === ch.page ? 'active-tag' : ''}" onclick="event.stopPropagation(); magCurrentPage = ${ch.page}; updateMagazineView()">${ch.name}</span>
    `).join('');
    
    // Always show audio button in testing, normally check: if (currentPageData && currentPageData.audioUrl)
    let audioBtnHtml = `<div class="magazine-audio-btn" onclick="event.stopPropagation(); toggleMagazineAudio()">${magAudioState}</div>`;
    
    over.innerHTML = `
        <div class="close-minus" onclick="closeMagazine()">–</div>
        <h1 class="big-header-title" style="position: fixed; top: 4rem; left: 50%; transform: translateX(-50%); margin: 0; color: black; z-index: 100003; pointer-events: none;">APOLLO MAGAZINE</h1>
        <div class="magazine-scene">${html}</div>
        <div class="magazine-footer">
            <div class="magazine-chapters">${chaptersHtml}</div>
        </div>
    `;

    filterBar.style.opacity = '0';
    filterBar.style.pointerEvents = 'none';
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
        <div class="close-minus" onclick="document.body.classList.remove('spread-open'); this.parentElement.remove(); document.getElementById('col-archive').style.opacity = '1'; const mq=document.querySelector('.marquee-wrapper'); if(mq) mq.style.opacity='1';">–</div>
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
// Dummy structure until API is ready:
const dummyAudioLibrary = [
    { title: "magazine_article1", file: "magazine_article1", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", desc: "Short description of this track. Eventually pulled from a Google Doc." },
    { title: "magazine_interview", file: "magazine_interview", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", desc: "Short description of this interview track." },
    { title: "exhibition_opening", file: "exhibition_opening", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", desc: "Opening speech from the 2024 exhibition." },
    { title: "exhibition_ambient", file: "exhibition_ambient", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", desc: "Ambient soundscape." }
];

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
    
    // Group dummy data by prefix (before the first underscore)
    const grouped = {};
    dummyAudioLibrary.forEach(item => {
        const parts = item.title.split('_');
        const category = parts[0];
        const subname = parts.slice(1).join('_') || item.title;
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push({ ...item, subname });
    });

    let listHtml = '';
    for (const cat in grouped) {
        let subItems = grouped[cat].map(item => `
            <div class="audio-track-link" id="audio-link-${item.file}" onclick="playAudioTrack('${item.file}')">${item.subname}</div>
        `).join('');
        listHtml += `
            <div>
                <div class="audio-category" onclick="this.classList.toggle('expanded')">${cat}</div>
                <div class="audio-sublist">${subItems}</div>
            </div>
        `;
    }

    over.innerHTML = `
        <div class="close-minus" onclick="closeAudioLibrary()">–</div>
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
    const track = dummyAudioLibrary.find(t => t.file === fileId);
    if (!track) return;
    
    if (globalAudio) {
        globalAudio.pause();
        globalAudio = null;
    }

    const container = document.getElementById('audio-player-container');
    if (!container) return;
    
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
                <div>Year</div><div>2024</div>
                <div>Category</div><div>Archive</div>
                <div>Type</div><div>Audio</div>
                <div>Format</div><div>MP3</div>
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
    
    // Restore ARCHIVE header and filter tags
    const colArch = document.getElementById('col-archive');
    if (colArch) { colArch.style.opacity = '1'; colArch.style.pointerEvents = 'auto'; }
    filterBar.style.opacity = '1';
    filterBar.style.pointerEvents = 'auto';
    generateDynamicTags();
    
    // In case there is a URL param, remove it without reloading
    if (window.history.pushState) {
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({path:newUrl}, '', newUrl);
    }
};

init();

window.exitGridMode = function() {
    document.body.classList.remove('grid-mode');
    document.querySelectorAll('.tag-filter').forEach(b => b.classList.remove('active-tag'));
    window.scrollTo(0, 0);
    renderPile(archiveData, false);
};
