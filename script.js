const API_URL = 'https://script.google.com/macros/s/AKfycby3AgRD49QItpR6M3oKG0id58QCZN0a7zQbrm91Z1ZmjwvhBwJzLNI3xBuANUzsWaiVfA/exec';
const pile = document.getElementById('project-pile');
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
    } catch (e) { console.error("Archive fetch error"); }
}

// LIFT THE FOG
window.startArchive = function() {
    if (document.body.classList.contains('focus-state')) {
        document.body.classList.remove('focus-state');
        document.body.classList.add('active-state');
        renderPile(archiveData, false); // Initialize messy stack
    }
};

function renderPile(data, isGrid = false) {
    pile.innerHTML = '';
    document.body.classList.toggle('grid-mode', isGrid);

    data.forEach((p, i) => {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';

        if (isGrid) {
            const stack = [p.titleImage, ...p.images].slice(0, 3).reverse();
            stack.forEach((img, idx) => {
                const card = createCard(p, img, true, idx);
                wrapper.appendChild(card);
            });
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
    
    // Dynamic Passe-Partout
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
                <img src="expand.png" style="width:35px; float:right; cursor:pointer;" onclick="event.stopPropagation(); unfoldProject('${p.id}')">
            </div>
        `;
    } else {
        card.innerHTML = `<div class="card-inner-frame"><img src="${getSafeImg(imgUrl)}"></div>`;
    }
    return card;
}

// TRULY ENDLESS SHUFFLE FIX
function shuffleToBack(card) {
    card.style.pointerEvents = 'none'; // Prevents breaking it with fast clicks
    card.style.transform = 'translate(100%, 0) rotate(20deg)';
    card.style.opacity = '0';
    
    setTimeout(() => {
        pile.prepend(card); // Physically moves it to the back of the HTML stack
        
        // Re-calculate all z-indexes so it never hits negative numbers
        const cards = Array.from(pile.querySelectorAll('.paper-card'));
        cards.forEach((c, idx) => { c.style.zIndex = idx; });
        
        card.style.opacity = '1';
        card.style.transform = `translate(-50%, 0) rotate(${Math.random() * 6 - 3}deg)`;
        card.style.pointerEvents = 'auto';
    }, 600);
}

function unfoldProject(id) {
    const p = archiveData.find(proj => proj.id === id);
    
    // Check if one is already open, if so close it
    const existing = document.getElementById('unfold-overlay');
    if (existing) existing.remove();

    const over = document.createElement('div');
    over.id = 'unfold-overlay';

    let html = `
        <div class="close-unfold highlight-link" onclick="this.parentElement.remove()">[ close ]</div>
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
        const pad = Math.floor(Math.random() * 15) + 15;
        // The align-items: start in CSS fixes the huge white bar
        html += `<div style="padding:${pad}px; background:white; transform:rotate(${rot}deg); box-shadow:0 5px 15px rgba(0,0,0,0.05);"><img src="${getSafeImg(img)}" style="width:100%; display:block;"></div>`;
    });

    html += `</div>`;
    over.innerHTML = html;
    document.body.appendChild(over);
    
    // Scroll to the top of the page smoothly when opened
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function filterProjects(tag) {
    if (tag === 'All') renderPile(archiveData, false); 
    else renderPile(archiveData.filter(p => p.metadata.tags.includes(tag)), true); 
}

init();
