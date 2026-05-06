const URL_PROJECTS = 'https://script.google.com/macros/s/AKfycby3AgRD49QItpR6M3oKG0id58QCZN0a7zQbrm91Z1ZmjwvhBwJzLNI3xBuANUzsWaiVfA/exec';
const URL_CALENDAR = 'https://script.google.com/macros/s/AKfycbz5THEJ7sno1qcFbPaA0FWmtcXy3kEj4nbGGThGvHb9zRjWox57VDQghuOgdiFCbTfIIw/exec';
const URL_MAGAZINE = 'https://script.google.com/macros/s/AKfycbyxSddhc-ntCVewfsAFXLcvStqnEN14VAJ-UtMuUxYt1zttxh8C39YelbeY5-pGsvZ6mg/exec';

const pile = document.getElementById('project-pile');
const logoImg = document.getElementById('main-logo');
const filterBar = document.getElementById('filter-bar');

let archiveData = [], calendarData = [], magazineData = [];
let isLoaded = false, isWaitingToStart = false, magCurrentPage = 0;

function getSafeImg(url) {
    const id = url.match(/id=([^&]+)/);
    return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w1200` : url;
}

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
        
        if (!isWaitingToStart) renderDashboard();
    } catch (e) { isLoaded = true; }
}

function generateDynamicTags() {
    let tags = new Set(["All"]);
    archiveData.forEach(p => p.metadata.tags.forEach(t => tags.add(t.trim().toLowerCase())));
    
    filterBar.innerHTML = '';
    tags.forEach(tag => {
        const btn = document.createElement('span');
        btn.className = 'tag-filter highlight-link';
        btn.innerText = tag;
        const matchTag = tag === 'all' ? 'All' : tag;
        btn.onclick = () => filterProjects(matchTag);
        filterBar.appendChild(btn);
    });
}

window.startArchive = function() {
    if (!document.body.classList.contains('focus-state')) return;
    if (isLoaded) liftFog(); else { isWaitingToStart = true; logoImg.classList.add('spinning'); }
};

logoImg.addEventListener('animationiteration', () => {
    if (isWaitingToStart && isLoaded) { logoImg.classList.remove('spinning'); liftFog(); }
});

function liftFog() {
    isWaitingToStart = false;
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
    const calContainer = document.getElementById('calendar-content');
    if (data.length > 0) {
        let html = '';
        if (data[0].image) html += `<img src="${getSafeImg(data[0].image)}">`;
        if (data[0].text) html += `<div>${data[0].text}</div>`;
        calContainer.innerHTML = html;
    }
}

function renderMagazineCover(data) {
    const magContainer = document.getElementById('magazine-cover-container');
    if (data.length > 0) magContainer.innerHTML = `<img src="${getSafeImg(data[0].images[0])}">`;
}

function renderPile(data, isGrid = false) {
    pile.innerHTML = '';
    document.body.classList.toggle('grid-mode', isGrid);

    data.forEach((p, i) => {
        const rot = isGrid ? 0 : Math.random() * 6 - 3;
        
        if (isGrid) {
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.appendChild(createCard(p, true));
            pile.appendChild(wrapper);
        } else {
            const wrapper = document.createElement('div');
            wrapper.className = 'card-wrapper';
            wrapper.style.position = 'absolute';
            wrapper.style.width = '350px';
            wrapper.style.left = '50%';
            wrapper.style.top = '50%';
            wrapper.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
            wrapper.style.zIndex = data.length - i;
            wrapper.onclick = () => shuffleToBack(wrapper);
            
            wrapper.appendChild(createCard(p, false));
            pile.appendChild(wrapper);
        }
    });
}

function createCard(p, isGrid) {
    const card = document.createElement('div');
    card.className = 'paper-card';
    const pad = Math.floor(Math.random() * 10) + 15;
    card.style.padding = `${pad}px`;

    let noteHtml = '';
    if (p.metadata.description) {
        noteHtml = `<div class="bookmark-note">${p.metadata.description}</div>`;
    }

    card.innerHTML = `
        <div class="card-inner-frame">
            <img src="${getSafeImg(p.titleImage)}">
        </div>
        ${noteHtml}
        <div class="belly-band">
            <div class="belly-text">
                <span class="highlight-link" style="font-weight:bold;">${p.metadata.name}</span><br>
                <span class="highlight-link">${p.metadata.author} — ${p.metadata.year}</span>
            </div>
            <img src="expand.png" style="width:35px; cursor:pointer;" onclick="event.stopPropagation(); unfoldProject('${p.id}')">
        </div>
    `;
    return card;
}

function shuffleToBack(wrapper) {
    wrapper.style.pointerEvents = 'none'; 
    wrapper.style.transform = 'translate(100%, -50%) rotate(20deg)';
    wrapper.style.opacity = '0';
    setTimeout(() => {
        pile.prepend(wrapper); 
        const wrappers = Array.from(pile.querySelectorAll('.card-wrapper'));
        wrappers.forEach((w, idx) => { w.style.zIndex = idx; });
        wrapper.style.opacity = '1';
        wrapper.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 6 - 3}deg)`;
        wrapper.style.pointerEvents = 'auto';
    }, 600);
}

function filterProjects(tag) {
    const existing = document.getElementById('unfold-overlay');
    if (existing) existing.remove();
    
    if (tag.toLowerCase() === 'all') {
        renderPile(archiveData, false); 
    } else {
        renderPile(archiveData.filter(p => p.metadata.tags.some(t => t.toLowerCase() === tag.toLowerCase())), true);
    }
}

// RESTYLED PROJECT SPREAD (Note next to image, title text below)
function unfoldProject(id) {
    const p = archiveData.find(proj => proj.id === id);
    const existing = document.getElementById('unfold-overlay');
    if (existing) existing.remove();

    const over = document.createElement('div');
    over.id = 'unfold-overlay';
    
    let html = `
        <img src="expand.png" class="close-unfold" onclick="this.parentElement.remove()">
        
        <div style="margin-bottom: 100px; display: flex; flex-direction: column; align-items: flex-start;">
            
            <div style="display: flex; gap: 40px; align-items: flex-start; width: 100%;">
                
                <div style="width: 50%; position: relative;">
                    <img src="${getSafeImg(p.titleImage)}" style="width:100%; display:block; border: 1px solid #eaeaea; box-shadow: 0 5px 20px rgba(0,0,0,0.05);">
                </div>
                
                ${p.metadata.description ? `
                <div class="bookmark-note" style="position: relative; top: 0; right: 0; transform: rotate(2deg);">
                    ${p.metadata.description}
                </div>` : ''}

            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 25px; width: 50%;">
                <span class="highlight-link" style="font-size:1.8rem; font-weight:bold;">${p.metadata.name}</span>
                <span class="highlight-link">${p.metadata.author} — ${p.metadata.year}</span>
            </div>
            
        </div>

        <div class="unfold-grid">
    `;

    p.images.forEach(img => {
        const rot = Math.random() * 2 - 1; 
        html += `<div class="unfold-grid-item" style="padding:20px; transform:rotate(${rot}deg);"><img src="${getSafeImg(img)}" style="width:100%; display:block;"></div>`;
    });

    html += `</div>`;
    over.innerHTML = html;
    document.body.appendChild(over);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.openMagazine = function() {
    if (magazineData.length === 0) return;
    magCurrentPage = 0;
    const over = document.createElement('div');
    over.id = 'magazine-reader-overlay';
    document.body.appendChild(over);
    updateMagazineView();
};

function updateMagazineView() {
    const over = document.getElementById('magazine-reader-overlay');
    if (!over) return;
    const magImages = magazineData[0].images;
    let spreadHtml = `<div class="spread-container">`;
    if (magCurrentPage === 0) { spreadHtml += `<img class="spread-page" src="${getSafeImg(magImages[0])}">`; } 
    else {
        const leftPage = magImages[magCurrentPage * 2 - 1];
        const rightPage = magImages[magCurrentPage * 2];
        if (leftPage) spreadHtml += `<img class="spread-page" src="${getSafeImg(leftPage)}">`;
        if (rightPage) spreadHtml += `<img class="spread-page" src="${getSafeImg(rightPage)}">`;
    }
    spreadHtml += `</div>`;
    const totalSpreads = Math.ceil((magImages.length - 1) / 2);
    over.innerHTML = `
        <img src="expand.png" class="close-unfold" onclick="this.parentElement.remove()">
        ${spreadHtml}
        <div class="reader-controls">
            ${magCurrentPage > 0 ? `<span class="highlight-link" onclick="magCurrentPage--; updateMagazineView()">prev</span>` : '<span></span>'}
            ${magCurrentPage < totalSpreads ? `<span class="highlight-link" onclick="magCurrentPage++; updateMagazineView()">next</span>` : '<span></span>'}
        </div>
    `;
}

init();
