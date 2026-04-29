// Replace with your Google Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycby3AgRD49QItpR6M3oKG0id58QCZN0a7zQbrm91Z1ZmjwvhBwJzLNI3xBuANUzsWaiVfA/exec'; 

const pile = document.getElementById('project-pile');
const logoContainer = document.getElementById('logo-container');
let archiveData = [];

function getSafeImg(url) {
    const id = url.match(/id=([^&]+)/);
    return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w1200` : url;
}

async function init() {
    try {
        const res = await fetch(API_URL, { redirect: 'follow' });
        archiveData = await res.json();
        renderPile(archiveData, false);
    } catch (e) { console.error("Connection error"); }
}

function renderPile(data, isGrid = false) {
    pile.innerHTML = '';
    document.body.classList.toggle('grid-mode', isGrid);

    data.forEach((p, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = isGrid ? 'grid-cell-wrapper' : '';

        if (isGrid) {
            // MINI-STACK: Title + up to 2 others peeking (Sketch 0.54)
            const stackImages = [p.titleImage, ...p.images].slice(0, 3);
            stackImages.reverse().forEach((imgUrl, index) => {
                const card = createCard(p, imgUrl, true, index);
                wrapper.appendChild(card);
            });
            pile.appendChild(wrapper);
        } else {
            // LANDING STACK: Click-through random pile
            const card = createCard(p, p.titleImage, false, 0);
            card.style.zIndex = data.length - i;
            pile.appendChild(card);
        }
    });
}

function createCard(project, imgUrl, isGrid, layerIndex) {
    const card = document.createElement('div');
    card.className = 'paper-card';

    // RANDOM PASSE-PARTOUT (White border dimension change)
    const padding = Math.floor(Math.random() * 20) + 10; 
    card.style.padding = `${padding}px`;

    const rot = Math.random() * 8 - 4;
    const sX = Math.random() * 12 - 6;
    const sY = Math.random() * 12 - 6;

    if (isGrid) {
        card.style.position = 'absolute';
        card.style.width = '100%';
        const layerOffset = (2 - layerIndex) * 5; 
        card.style.transform = `rotate(${rot}deg) translate(${sX + layerOffset}px, ${sY + layerOffset}px)`;
        card.style.zIndex = layerIndex;
    } else {
        card.style.position = 'absolute';
        card.style.width = (350 + Math.random() * 50) + 'px';
        card.style.transform = `rotate(${rot}deg)`;
        card.onclick = (e) => shuffleToBack(e.currentTarget);
    }

    const isTopLayer = isGrid ? (layerIndex === 2) : true;
    card.innerHTML = `
        <div class="card-inner-frame"><img src="${getSafeImg(imgUrl)}" style="width:100%; display:block;"></div>
        ${isTopLayer ? `
            <div style="margin-top:10px; text-transform:lowercase; font-size:11px;">
                <span class="highlight-link" style="font-weight:bold;">${project.metadata.name}</span><br>
                <span class="highlight-link">${project.metadata.author}</span> — <span class="highlight-link">${project.metadata.year}</span>
                <img src="expand.png" style="width:25px; float:right; cursor:pointer;" onclick="event.stopPropagation(); unfoldProject('${project.id}')">
            </div>
        ` : ''}
    `;
    return card;
}

function unfoldProject(id) {
    const p = archiveData.find(proj => proj.id === id);
    const overlay = document.createElement('div');
    overlay.id = 'unfold-overlay';

    let html = `
        <div onclick="this.parentElement.remove()" style="position:fixed; top:140px; left:40px; cursor:pointer; font-weight:bold; background:rgba(139,0,0,0.4); padding:2px 8px; z-index:10000;">[ close ]</div>
        <div class="unfold-header">
            <div class="unfold-title-frame"><img src="${getSafeImg(p.titleImage)}" style="width:100%;"></div>
            <div style="display:flex; flex-direction:column; gap:5px;">
                <span class="highlight-link" style="font-weight:bold; font-size:1.5rem;">${p.metadata.name}</span>
                <span class="highlight-link">${p.metadata.author}</span>
                <span class="highlight-link">${p.metadata.year}</span>
                <span class="highlight-link" style="opacity:0.6; margin-top:10px;">${p.metadata.tags.join(', ')}</span>
            </div>
        </div>
        <div class="unfold-grid">
    `;

    p.images.forEach(url => {
        const rot = Math.random() * 6 - 3;
        const sX = Math.random() * 20 - 10;
        const sY = Math.random() * 20 - 10;
        html += `<div class="unfold-grid-item" style="transform: rotate(${rot}deg) translate(${sX}px, ${sY}px);"><img src="${getSafeImg(url)}" style="width:100%;"></div>`;
    });

    html += `</div>`;
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
}

function shuffleToBack(card) {
    card.style.transform = 'translateX(140%) rotate(20deg)';
    card.style.opacity = '0';
    setTimeout(() => {
        const cards = document.querySelectorAll('.paper-card');
        const minZ = Math.min(...Array.from(cards).map(c => parseInt(c.style.zIndex || 0)));
        card.style.zIndex = minZ - 1;
        card.style.opacity = '1';
        card.style.transform = `rotate(${Math.random() * 8 - 4}deg)`;
    }, 600);
}

function filterProjects(tag) {
    if (tag === 'All') renderPile(archiveData, false);
    else renderPile(archiveData.filter(p => p.metadata.tags.includes(tag)), true);
}

logoContainer.onclick = () => {
    document.body.classList.toggle('active-state');
    document.body.classList.toggle('focus-state');
};

init();
