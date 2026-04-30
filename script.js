const URL_PROJECTS = 'https://script.google.com/macros/s/AKfycby3AgRD49QItpR6M3oKG0id58QCZN0a7zQbrm91Z1ZmjwvhBwJzLNI3xBuANUzsWaiVfA/exec';
const URL_CALENDAR = 'https://script.google.com/macros/s/AKfycbz5THEJ7sno1qcFbPaA0FWmtcXy3kEj4nbGGThGvHb9zRjWox57VDQghuOgdiFCbTfIIw/exec';
const URL_MAGAZINE = 'https://script.google.com/macros/s/AKfycbyxSddhc-ntCVewfsAFXLcvStqnEN14VAJ-UtMuUxYt1zttxh8C39YelbeY5-pGsvZ6mg/exec';

const pile = document.getElementById('project-pile');
const logoImg = document.getElementById('main-logo');

let archiveData = [], calendarData = [], magazineData = [];
let isLoaded = false, isWaitingToStart = false;
let magCurrentPage = 0; // Tracks magazine flipbook state

function getSafeImg(url) {
    const id = url.match(/id=([^&]+)/);
    return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w1200` : url;
}

// FETCH ALL 3 DATA SOURCES AT ONCE
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
        
        isLoaded = true;
        
        if (!isWaitingToStart) {
            renderDashboard();
        }
    } catch (e) { 
        console.error("Data fetch error", e); 
        isLoaded = true; 
    }
}

// LOGO & LOADING LOGIC
window.startArchive = function() {
    if (!document.body.classList.contains('focus-state')) return;
    if (isLoaded) { liftFog(); } 
    else { isWaitingToStart = true; logoImg.classList.add('spinning'); }
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

// RENDER ALL THREE ZONES
function renderDashboard() {
    renderPile(archiveData, false);
    renderCalendar(calendarData);
    renderMagazineCover(magazineData);
}

function renderCalendar(data) {
    const calContainer = document.getElementById('calendar-content');
    // Assuming data[0] has an image and text
    if (data.length > 0) {
        let html = '';
        if (data[0].titleImage || data[0].image) html += `<img src="${getSafeImg(data[0].titleImage || data[0].image)}">`;
        if (data[0].text || data[0].metadata?.description) html += `<div>${data[0].text || data[0].metadata?.description}</div>`;
        calContainer.innerHTML = html;
    }
}

function renderMagazineCover(data) {
    const magContainer = document.getElementById('magazine-cover-container');
    // Extracts cover from the first item
    if (data.length > 0) {
        magContainer.innerHTML = `<img src="${getSafeImg(data[0].titleImage || data[0].images[0])}">`;
    }
}

// PROJECT PILE LOGIC (Updated for Dashboard context)
function renderPile(data, isGrid = false) {
    pile.innerHTML = '';
    document.body.classList.toggle('grid-mode', isGrid);

    data.forEach((p, i) => {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';

        if (isGrid) {
            const stack = [p.titleImage, ...p.images].slice(0, 3).reverse();
            stack.forEach((img, idx) => { wrapper.appendChild(createCard(p, img, true, idx)); });
            pile.appendChild(wrapper);
        } else {
            const card = createCard(p, p.titleImage, false, i);
            card.style.zIndex = data.length - i;
            pile.appendChild(card);
        }
    });
}

function createCard(p, imgUrl, isGrid, layer) {
    const card = document.createElement('div');
    card.className = 'paper-card';
    const pad = Math.floor(Math.random() * 15) + 15;
    card.style.padding = `${pad}px`;
    const rot = Math.random() * 6 - 3;

    if (isGrid) {
        card.style.position = 'absolute';
        card.style.width = '100%';
        const off = (2 - layer) * 5;
        card.style.transform = `rotate(${rot}deg) translate(${off}px, ${off}px)`;
        card.style.zIndex = layer;
    } else {
        card.style.position = 'absolute';
        card.style.width = '350px';
        card.style.left = '50%';
        card.style.top = '100px'; 
        card.style.transform = `translate(-50%, 0) rotate(${rot}deg)`;
        card.onclick = () => shuffleToBack(card);
    }

    if (!isGrid || layer === 2) {
        card.innerHTML = `
            <div class="card-inner-frame"><img src="${getSafeImg(imgUrl)}"></div>
            <div style="font-size:11px; text-transform:lowercase; margin-top:10px;">
                <span class="highlight-link" style="font-weight:bold;">${p.metadata.name}</span><br>
                <span class="highlight-link">${p.metadata.author} — ${p.metadata.year}</span>
                <img src="expand.png" style="width:45px; float:right; cursor:pointer;" onclick="event.stopPropagation(); unfoldProject('${p.id}')">
            </div>
        `;
    } else { card.innerHTML = `<div class="card-inner-frame"><img src="${getSafeImg(imgUrl)}"></div>`; }
    return card;
}

function shuffleToBack(card) {
    card.style.pointerEvents = 'none'; 
    card.style.transform = 'translate(100%, 0) rotate(20deg)';
    card.style.opacity = '0';
    setTimeout(() => {
        pile.prepend(card); 
        const cards = Array.from(pile.querySelectorAll('.paper-card'));
        cards.forEach((c, idx) => { c.style.zIndex = idx; });
        card.style.opacity = '1';
        card.style.transform = `translate(-50%, 0) rotate(${Math.random() * 6 - 3}deg)`;
        card.style.pointerEvents = 'auto';
    }, 600);
}

// MAGAZINE READING MODE (Flat Slide)
window.openMagazine = function() {
    if (magazineData.length === 0) return;
    magCurrentPage = 0; // Reset to cover
    
    const over = document.createElement('div');
    over.id = 'magazine-reader-overlay';
    document.body.appendChild(over);
    updateMagazineView();
};

function updateMagazineView() {
    const over = document.getElementById('magazine-reader-overlay');
    if (!over) return;
    
    // Flatten magazine images assuming data[0] contains them
    const magImages = magazineData[0].images || [magazineData[0].titleImage];
    
    let spreadHtml = `<div class="spread-container">`;
    
    if (magCurrentPage === 0) {
        // Cover page only
        spreadHtml += `<img class="spread-page" src="${getSafeImg(magImages[0])}">`;
    } else {
        // Flat spread (Left & Right pages)
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

// FILTER & SPREAD
function filterProjects(tag) {
    const existing = document.getElementById('unfold-overlay');
    if (existing) existing.remove();
    if (tag === 'All') renderPile(archiveData, false); 
    else renderPile(archiveData.filter(p => p.metadata.tags.includes(tag)), true); 
}

function unfoldProject(id) {
    const p = archiveData.find(proj => proj.id === id);
    const existing = document.getElementById('unfold-overlay');
    if (existing) existing.remove();

    const over = document.createElement('div');
    over.id = 'unfold-overlay';
    let html = `
        <img src="expand.png" class="close-unfold" onclick="this.parentElement.remove()">
        <div class="unfold-header">
            <img src="${getSafeImg(p.titleImage)}" class="unfold-title-pic">
            <div style="display:flex; flex-direction:column; gap:8px; padding-bottom:20px;">
                <span class="highlight-link" style="font-size:1.8rem; font-weight:bold;">${p.metadata.name}</span>
                <span class="highlight-link">${p.metadata.author}</span>
                <span class="highlight-link">${p.metadata.year}</span>
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

init();
