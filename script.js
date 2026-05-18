const URL_PROJECTS = 'https://script.google.com/macros/s/AKfycby3AgRD49QItpR6M3oKG0id58QCZN0a7zQbrm91Z1ZmjwvhBwJzLNI3xBuANUzsWaiVfA/exec';
const URL_CALENDAR = 'https://script.google.com/macros/s/AKfycbz5THEJ7sno1qcFbPaA0FWmtcXy3kEj4nbGGThGvHb9zRjWox57VDQghuOgdiFCbTfIIw/exec';
const URL_MAGAZINE = 'https://script.google.com/macros/s/AKfycbyxSddhc-ntCVewfsAFXLcvStqnEN14VAJ-UtMuUxYt1zttxh8C39YelbeY5-pGsvZ6mg/exec';

const pile = document.getElementById('project-pile');
const filterBar = document.getElementById('filter-bar');

let archiveData = [], calendarData = [], magazineData = [];
let isLoaded = false, isWaitingToStart = true, magCurrentPage = 0;

function getSafeImg(url) {
    const id = url.match(/id=([^&]+)/);
    return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w1200` : url;
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

window.checkPasscode = function(e) {
    if (e.target.value === '1665') {
        const overlay = document.getElementById('passcode-overlay');
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.remove(); if (isLoaded) liftFog(); }, 500);
    }
};

async function init() {
    try {
        const [resProj, resCal, resMag] = await Promise.all([
            fetch(URL_PROJECTS, { redirect: 'follow' }),
            fetch(URL_CALENDAR, { redirect: 'follow' }),
            fetch(URL_MAGAZINE, { redirect: 'follow' })
        ]);
        archiveData = await resProj.json();
        calendarData = await resCal.json();
        magazineData = await resMag.json();
        generateDynamicTags();
        isLoaded = true;
        if (!document.getElementById('passcode-overlay')) liftFog();
    } catch (e) { isLoaded = true; }
}

function generateDynamicTags() {
    let tags = new Set(["All"]);
    archiveData.forEach(p => p.metadata.tags.forEach(t => tags.add(t.trim().toLowerCase())));
    filterBar.innerHTML = '';
    tags.forEach(tag => {
        const btn = document.createElement('span');
        btn.className = 'tag-filter highlight-link';
        if(tag === 'all') btn.classList.add('active-tag');
        btn.innerText = tag;
        btn.onclick = () => filterProjects(tag === 'all' ? 'All' : tag, btn);
        filterBar.appendChild(btn);
    });
}

function liftFog() {
    document.body.classList.remove('focus-state');
    document.body.classList.add('active-state');
    renderDashboard();
}

function renderDashboard() {
    renderPile(archiveData, false);
    renderCalendar(calendarData);
    renderMagazineCover(magazineData);
}

/* FIX: [+] icon dropped to a new line inside the calendar details */
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
                
                // Wrapped in a block div with top-margin so it drops below the text naturally
                let plusIcon = evt.imgId ? `<div style="margin-top: 12px;"><span class="invite-indicator">[+]</span></div>` : '';
                
                let imgPayload = evt.imgId ? `
                    <div class="calendar-inline-img">
                        <img src="https://drive.google.com/thumbnail?id=${evt.imgId}&sz=w1200">
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
            <img src="${getSafeImg(data[0].images[0])}">
            <div class="vac-stamp">DO NOT OPEN</div>
            <div class="vac-release">ARCHIVAL MASTER // RELEASE DATE: SEP 2026</div>
            <div class="vac-barcode"></div>
        `;
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
        wrapper.appendChild(createCard(p));
        pile.appendChild(wrapper);
    });
}

function createCard(p) {
    const card = document.createElement('div');
    card.className = 'paper-card';
    card.style.padding = `${Math.floor(Math.random() * 10) + 20}px`; 
    
    let note = p.metadata.description ? `
        <div class="bookmark-note" onclick="event.stopPropagation(); unfoldProject('${p.id}')">
            <img src="logo.png" class="stamp-logo">
            <div class="note-title">[ NOTE TITLE ]</div>
            <div class="note-text-content">${p.metadata.description}</div>
        </div>` : '';
        
    card.innerHTML = `
        <div class="paper-card-bg"></div>
        <div class="card-inner-frame"><img src="${getSafeImg(p.titleImage)}"></div>
        ${note}
        <div class="belly-band">
            <div class="belly-text">${p.metadata.name} — ${p.metadata.author} — ${p.metadata.year}</div>
            <div class="belly-plus" onclick="event.stopPropagation(); unfoldProject('${p.id}')">+</div>
        </div>`;
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
    renderPile(tag === 'All' ? archiveData : archiveData.filter(p => p.metadata.tags.some(t => t.toLowerCase() === tag.toLowerCase())), tag !== 'All');
}

window.openLightbox = function(src, event) {
    event.stopPropagation();
    const box = document.createElement('div');
    box.id = 'spread-lightbox';
    box.innerHTML = `<img src="${src}">`;
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
    const over = document.createElement('div');
    over.id = 'unfold-overlay';
    
    let gridItems = p.images.map(img => `
        <div style="display:flex; justify-content:flex-start;">
            <div class="unfold-grid-item">
                <img src="${getSafeImg(img)}" onclick="openLightbox('${getSafeImg(img)}', event)">
            </div>
        </div>`).join('');
    
    over.innerHTML = `
        <div class="close-minus" onclick="document.body.classList.remove('spread-open'); this.parentElement.remove()">–</div>
        
        <div class="spread-layout">
            
            <div class="spread-title-block">
                <span style="font-size:1.8rem; font-weight:bold; line-height: 1.1; margin-bottom: 5px;">${p.metadata.name}</span>
                <span>${p.metadata.author} — ${p.metadata.year}</span>
            </div>

            <div class="spread-col left-col-scroll">
                
                <div class="card-wrapper" style="transform: none !important; margin-bottom: 40px; display: flex; justify-content: flex-start; align-self: flex-start;">
                    <div class="paper-card" style="padding:25px; cursor:default; width: max-content; max-width: 100%;">
                        <div class="paper-card-bg"></div>
                        <div class="card-inner-frame">
                            <img src="${getSafeImg(p.titleImage)}" style="max-width: 100%; height: auto; object-fit: contain; cursor: zoom-in;" onclick="openLightbox('${getSafeImg(p.titleImage)}', event)">
                        </div>
                    </div>
                </div>

                <div class="bookmark-note spread-note" style="width: 12vw; height: auto; margin-bottom: 40px;">
                    <img src="logo.png" class="stamp-logo">
                    <div class="note-title">[ NOTE TITLE ]</div>
                    <div class="note-text-content" style="display: block; -webkit-line-clamp: unset; overflow: visible;">${p.metadata.description || ''}</div>
                </div>
                
            </div>

            <div class="spread-col right-col-scroll">
                <div class="unfold-gallery-grid">
                    ${gridItems}
                </div>
            </div>

        </div>
    `;
    
    document.body.appendChild(over);
}

window.openMagazine = function() {
    if (magazineData.length === 0) return;
    magCurrentPage = 0;
    document.body.classList.add('magazine-open');
    const over = document.createElement('div');
    over.id = 'magazine-reader-overlay';
    document.body.appendChild(over);
    updateMagazineView();
};

function updateMagazineView() {
    const over = document.getElementById('magazine-reader-overlay');
    if (!over) return;
    const mag = magazineData[0].images;
    const leaves = Math.ceil(mag.length / 2);
    let html = '';
    for (let i = 0; i < leaves; i++) {
        html += `<div class="book-leaf ${i < magCurrentPage ? 'flipped' : ''}" style="z-index:${i < magCurrentPage ? i : leaves - i}" onclick="magCurrentPage = (magCurrentPage == ${i} ? ${i+1} : ${i}); updateMagazineView()">
            <div class="page-front">${mag[i*2] ? `<img src="${getSafeImg(mag[i*2])}">` : ''}</div>
            <div class="page-back">${mag[i*2+1] ? `<img src="${getSafeImg(mag[i*2+1])}">` : ''}</div>
        </div>`;
    }
    over.innerHTML = `<div class="close-minus" onclick="document.body.classList.remove('magazine-open'); this.parentElement.remove()">–</div><div class="magazine-scene">${html}</div>`;
}

init();
