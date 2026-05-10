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

window.toggleMenu = function(id) {
    const col = document.getElementById('col-' + id);
    col.classList.toggle('menu-open');
};

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

function renderCalendar(data) {
    const cal = document.getElementById('calendar-content');
    if (data.length > 0) {
        cal.innerHTML = `${data[0].image ? `<img src="${getSafeImg(data[0].image)}">` : ''}${data[0].text ? `<div>${data[0].text}</div>` : ''}`;
    }
}

function renderMagazineCover(data) {
    const mag = document.getElementById('magazine-cover-container');
    if (data.length > 0) mag.innerHTML = `<img src="${getSafeImg(data[0].images[0])}">`;
}

function renderPile(data, isGrid = false) {
    pile.innerHTML = '';
    document.body.classList.toggle('grid-mode', isGrid);
    data.forEach((p, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'card-wrapper';
        if (!isGrid) {
            wrapper.style.position = 'absolute';
            wrapper.style.width = '65%';
            /* THE FIX: Maximum pixel width protects against screen-stretching */
            wrapper.style.maxWidth = '450px'; 
            wrapper.style.left = '50%';
            wrapper.style.top = '50%';
            wrapper.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 6 - 3}deg)`;
            wrapper.style.zIndex = data.length - i;
            wrapper.onclick = () => shuffleToBack(wrapper);
        }
        wrapper.appendChild(createCard(p));
        pile.appendChild(wrapper);
    });
}

function createCard(p) {
    const card = document.createElement('div');
    card.className = 'paper-card';
    const pad = Math.floor(Math.random() * 10) + 20; 
    card.style.padding = `${pad}px`;
    let note = p.metadata.description ? `
        <div class="bookmark-note" onclick="event.stopPropagation(); unfoldProject('${p.id}')">
            <img src="logo.png" class="stamp-logo">
            <div class="note-title">[ NOTE TITLE ]</div>
            <div class="note-text-content">${p.metadata.description}</div>
        </div>` : '';
    card.innerHTML = `
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
    w.style.transform = 'translate(100%, -50%) rotate(20deg)';
    w.style.opacity = '0';
    setTimeout(() => {
        pile.prepend(w);
        Array.from(pile.querySelectorAll('.card-wrapper')).forEach((el, idx) => el.style.zIndex = idx);
        w.style.opacity = '1';
        w.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 6 - 3}deg)`;
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

function unfoldProject(id) {
    const p = archiveData.find(proj => proj.id === id);
    document.body.classList.add('spread-open');
    const over = document.createElement('div');
    over.id = 'unfold-overlay';
    let gridItems = p.images.map(img => `<div class="unfold-grid-item" style="padding:20px; transform:rotate(${Math.random() * 2 - 1}deg);"><img src="${getSafeImg(img)}" style="width:100%;"></div>`).join('');
    over.innerHTML = `
        <div class="close-minus" onclick="document.body.classList.remove('spread-open'); this.parentElement.remove()">–</div>
        <div style="margin-bottom:100px; display:flex; gap:40px; align-items:stretch; width:100%; margin-top:40px;">
            <div style="width:50%;"><div class="card-wrapper"><div class="paper-card" style="padding:25px; cursor:default;"><img src="${getSafeImg(p.titleImage)}" style="width:100%;"></div></div></div>
            <div style="width:25%; display:flex; flex-direction:column; justify-content:space-between;">
                <div class="bookmark-note spread-note"><img src="logo.png" class="stamp-logo"><div class="note-title">[ NOTE TITLE ]</div><div class="note-text-content">${p.metadata.description}</div></div>
                <div style="display:flex; flex-direction:column; gap:8px;"><span style="font-size:1.8rem; font-weight:bold;">${p.metadata.name}</span><span>${p.metadata.author} — ${p.metadata.year}</span></div>
            </div>
            <div style="width:25%;"></div>
        </div>
        <div class="unfold-grid">${gridItems}</div>`;
    document.body.appendChild(over);
    over.scrollTo({ top: 0, behavior: 'smooth' });
}

window.openMagazine = function() {
    document.body.classList.add('spread-open');
    const over = document.createElement('div');
    over.id = 'magazine-reader-overlay';
    document.body.appendChild(over);
    updateMagazineView();
};

function updateMagazineView() {
    const over = document.getElementById('magazine-reader-overlay');
    const mag = magazineData[0].images;
    const leaves = Math.ceil(mag.length / 2);
    let html = '';
    for (let i = 0; i < leaves; i++) {
        html += `<div class="book-leaf ${i < magCurrentPage ? 'flipped' : ''}" style="z-index:${i < magCurrentPage ? i : leaves - i}" onclick="magCurrentPage = (magCurrentPage == ${i} ? ${i+1} : ${i}); updateMagazineView()">
            <div class="page-front">${mag[i*2] ? `<img src="${getSafeImg(mag[i*2])}">` : ''}</div>
            <div class="page-back">${mag[i*2+1] ? `<img src="${getSafeImg(mag[i*2+1])}">` : ''}</div>
        </div>`;
    }
    over.innerHTML = `<div class="close-minus" onclick="document.body.classList.remove('spread-open'); this.parentElement.remove()">–</div><div class="magazine-scene">${html}</div>`;
}

init();
