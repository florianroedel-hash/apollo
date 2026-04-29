const API_URL = 'https://script.google.com/macros/s/AKfycby3AgRD49QItpR6M3oKG0id58QCZN0a7zQbrm91Z1ZmjwvhBwJzLNI3xBuANUzsWaiVfA/exec';
const pile = document.getElementById('project-pile');
const logo = document.getElementById('main-logo');
let archiveData = [];

function getSafeImg(url) {
    const id = url.match(/id=([^&]+)/);
    return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w1200` : url;
}

async function init() {
    const res = await fetch(API_URL, { redirect: 'follow' });
    archiveData = await res.json();
    renderPile(archiveData, false);
}

// LOGO CLICK: Lift fog and move logo
logo.onclick = () => {
    document.body.classList.remove('focus-state');
    document.body.classList.add('active-state');
    renderPile(archiveData, false);
};

function renderPile(data, isGrid = false) {
    pile.innerHTML = '';
    document.body.classList.toggle('grid-mode', isGrid);

    data.forEach((p, i) => {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';

        // MINI-STACKS for Grid (Sketch 0.54)
        if (isGrid) {
            const stack = [p.titleImage, ...p.images].slice(0, 3).reverse();
            stack.forEach((img, idx) => {
                const card = createCard(p, img, true, idx);
                wrapper.appendChild(card);
            });
            pile.appendChild(wrapper);
        } else {
            // CENTRAL STACK for Landing
            const card = createCard(p, p.titleImage, false, 0);
            card.style.zIndex = data.length - i;
            pile.appendChild(card);
        }
    });
}

function createCard(p, imgUrl, isGrid, layer) {
    const card = document.createElement('div');
    card.className = 'paper-card';
    
    // Passe-partout randomization
    const pad = Math.random() * 15 + 10;
    card.style.padding = `${pad}px`;

    // Rotation/Shifting logic
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
        card.style.top = '50%';
        card.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
        card.onclick = () => shuffleToBack(card);
    }

    if (!isGrid || layer === 2) {
        card.innerHTML = `
            <div class="card-inner-frame"><img src="${getSafeImg(imgUrl)}" style="width:100%;"></div>
            <div style="font-size:11px; text-transform:lowercase; margin-top:10px;">
                <span class="highlight-link" style="font-weight:bold;">${p.metadata.name}</span><br>
                <span class="highlight-link">${p.metadata.author} — ${p.metadata.year}</span>
                <img src="expand.png" style="width:20px; float:right; cursor:pointer;" onclick="event.stopPropagation(); unfoldProject('${p.id}')">
            </div>
        `;
    } else {
        card.innerHTML = `<div class="card-inner-frame"><img src="${getSafeImg(imgUrl)}" style="width:100%;"></div>`;
    }
    return card;
}

function unfoldProject(id) {
    const p = archiveData.find(proj => proj.id === id);
    const over = document.createElement('div');
    over.id = 'unfold-overlay';

    let html = `
        <div onclick="this.parentElement.remove()" style="position:fixed; top:40px; left:40px; cursor:pointer; font-weight:bold; background:rgba(139,0,0,0.4); padding:2px 8px;">[ CLOSE ]</div>
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
        const rot = Math.random() * 4 - 2;
        html += `<div style="border:none; padding:10px; background:white; transform:rotate(${rot}deg); box-shadow:0 5px 15px rgba(0,0,0,0.05);"><img src="${getSafeImg(img)}" style="width:100%;"></div>`;
    });

    html += `</div>`;
    over.innerHTML = html;
    document.body.appendChild(over);
}

function filterProjects(tag) {
    if (tag === 'All') renderPile(archiveData, false);
    else renderPile(archiveData.filter(p => p.metadata.tags.includes(tag)), true);
}

function shuffleToBack(card) {
    card.style.transform = 'translate(100%, -50%) rotate(20deg)';
    card.style.opacity = '0';
    setTimeout(() => {
        const cards = document.querySelectorAll('.paper-card');
        const minZ = Math.min(...Array.from(cards).map(c => parseInt(c.style.zIndex || 0)));
        card.style.zIndex = minZ - 1;
        card.style.opacity = '1';
        card.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 6 - 3}deg)`;
    }, 600);
}

init();
