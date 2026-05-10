const URL_PROJECTS = 'https://script.google.com/macros/s/AKfycby3AgRD49QItpR6M3oKG0id58QCZN0a7zQbrm91Z1ZmjwvhBwJzLNI3xBuANUzsWaiVfA/exec';
const URL_CALENDAR = 'https://script.google.com/macros/s/AKfycbz5THEJ7sno1qcFbPaA0FWmtcXy3kEj4nbGGThGvHb9zRjWox57VDQghuOgdiFCbTfIIw/exec';
const URL_MAGAZINE = 'https://script.google.com/macros/s/AKfycbyxSddhc-ntCVewfsAFXLcvStqnEN14VAJ-UtMuUxYt1zttxh8C39YelbeY5-pGsvZ6mg/exec';

const pile = document.getElementById('project-pile');
const filterBar = document.getElementById('filter-bar');

let archiveData = [], calendarData = [], magazineData = [];
let isLoaded = false, isWaitingToStart = true;

function getSafeImg(url) {
    const id = url.match(/id=([^&]+)/);
    return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w1200` : url;
}

// TOGGLE MENU LOGIC
window.toggleMenu = function(menuId, event) {
    const menu = document.getElementById('menu-' + menuId);
    const toggleBtn = event.target;
    const isOpen = menu.classList.contains('open');
    
    // Close all menus & reset plusses
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.menu-toggle').forEach(t => t.innerText = '+');
    
    // Open target if it wasn't already open
    if (!isOpen) {
        menu.classList.add('open');
        toggleBtn.innerText = '–'; // En dash for a cleaner minus
    }
};

window.checkPasscode = function(e) {
    if (e.target.value === '1665') {
        const overlay = document.getElementById('passcode-overlay');
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
            if (isLoaded) liftFog();
            else isWaitingToStart = true;
        }, 500);
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
        
        if (!document.getElementById('passcode-overlay')) {
            liftFog();
        }
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
        const matchTag = tag === 'all' ? 'All' : tag;
        btn.onclick = () => filterProjects(matchTag, btn);
        filterBar.appendChild(btn);
    });
}

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
            wrapper.className = 'card-wrapper';
            wrapper.appendChild(createCard(p, true));
            pile.appendChild(wrapper);
        } else {
            const wrapper = document.createElement('div');
            wrapper.className = 'card-wrapper';
            wrapper.style.position = 'absolute';
            wrapper.style.width = '65%'; 
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
    const pad = Math.floor(Math.random() * 10) + 20; 
    card.style.padding = `${pad}px`;

    let noteHtml = '';
    if (p.metadata.description) {
        noteHtml = `
            <div class="bookmark-note" onclick="event.stopPropagation(); unfoldProject('${p.id}')">
                <img src="logo.png" class="stamp-logo">
                <div class="note-title">[ NOTE TITLE ]</div>
                <div class="note-text-content">${p.metadata.description}</div>
            </div>`;
    }

    card.innerHTML = `
        <div class="card-inner-frame">
            <img src="${getSafeImg(p.titleImage)}">
        </div>
        ${noteHtml}
        <div class="belly-band">
            <div class="belly-text">${p.metadata.name} — ${p.metadata.author} — ${p.metadata.year}</div>
            <img src="expand.png" class="belly-expand" onclick="event.stopPropagation(); unfoldProject('${p.id}')">
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

function filterProjects(tag, clickedBtn) {
    const existing = document.getElementById('unfold-overlay');
    if (existing) {
        document.body.classList.remove('spread-open');
        existing.remove();
    }
    
    if (clickedBtn) {
        document.querySelectorAll('.tag-filter').forEach(btn => btn.classList.remove('active-tag'));
        clickedBtn.classList.add('active-tag');
    }
    
    if (tag.toLowerCase() === 'all') {
        renderPile(archiveData, false); 
    } else {
        renderPile(archiveData.filter(p => p.metadata.tags.some(t => t.toLowerCase() === tag.toLowerCase())), true);
    }
}

function unfoldProject(id) {
    const p = archiveData.find(proj => proj.id === id);
    const existing = document.getElementById('unfold-overlay');
    if (existing) existing.remove();

    document.body.classList.add('spread-open');

    const over = document.createElement('div');
    over.id = 'unfold-overlay';
    
    let html = `
        <img src="expand.png" class="close-unfold" onclick="document.body.classList.remove('spread-open'); this.parentElement.remove()">
        
        <div style="margin-bottom: 100px; display: flex; gap: 40px; align-items: stretch; width: 100%; margin-top: 40px;">
            <div style="width: 50%;">
                <div class="card-wrapper" style="width: 100%;">
                    <div class="paper-card" style="padding: 25px; cursor: default;">
                        <div class="card-inner-frame">
                            <img src="${getSafeImg(p.titleImage)}" style="width:100%; display:block;">
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="width: 25%; display: flex; flex-direction: column; justify-content: space-between;">
                ${p.metadata.description ? `
                <div class="bookmark-note spread-note">
                    <img src="logo.png" class="stamp-logo">
                    <div class="note-title">[ NOTE TITLE ]</div>
                    <div class="note-text-content">${p.metadata.description}</div>
                </div>` : '<div></div>'}
                
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <span style="font-size:1.8rem; font-weight:bold; text-transform: lowercase;">${p.metadata.name}</span>
                    <span style="text-transform: lowercase;">${p.metadata.author} — ${p.metadata.year}</span>
                </div>
            </div>
            <div style="width: 25%;"></div>
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
    over.scrollTo({ top: 0, behavior: 'smooth' });
}

window.openMagazine = function() {
    if (magazineData.length === 0) return;
    magCurrentPage = 0;
    
    document.body.classList.add('spread-open');
    
    const over = document.createElement('div');
    over.id = 'magazine-reader-overlay';
    document.body.appendChild(over);
    updateMagazineView();
};

function updateMagazineView() {
    const over = document.getElementById('magazine-reader-overlay');
    if (!over) return;
    const magImages = magazineData[0].images;
    const totalLeaves = Math.ceil(magImages.length / 2);

    let leavesHtml = '';
    for (let i = 0; i < totalLeaves; i++) {
        const frontImg = magImages[i * 2];
        const backImg = magImages[i * 2 + 1];
        
        const isFlipped = i < magCurrentPage ? 'flipped' : '';
        const zIndex = i < magCurrentPage ? i : totalLeaves - i;

        leavesHtml += `
            <div class="book-leaf ${isFlipped}" style="z-index: ${zIndex};" onclick="flipMag(${i})">
                <div class="page-front">
                    ${frontImg ? `<img src="${getSafeImg(frontImg)}">` : ''}
                </div>
                <div class="page-back">
                    ${backImg ? `<img src="${getSafeImg(backImg)}">` : ''}
                </div>
            </div>
        `;
    }

    over.innerHTML = `
        <img src="expand.png" class="close-unfold" onclick="document.body.classList.remove('spread-open'); this.parentElement.remove()">
        <div class="magazine-scene">${leavesHtml}</div>
        <div class="reader-controls">
            ${magCurrentPage > 0 ? `<span class="highlight-link" onclick="magCurrentPage--; updateMagazineView()">prev</span>` : '<span></span>'}
            ${magCurrentPage < totalLeaves ? `<span class="highlight-link" onclick="magCurrentPage++; updateMagazineView()">next</span>` : '<span></span>'}
        </div>
    `;
}

window.flipMag = function(leafIndex) {
    if (leafIndex === magCurrentPage) { magCurrentPage++; }
    else if (leafIndex === magCurrentPage - 1) { magCurrentPage--; }
    updateMagazineView();
}

init();
