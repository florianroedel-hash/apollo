const API_URL = 'https://script.google.com/macros/s/AKfycbw9AJb8akuwVCffFT6oUDwxoXfirjSmJ4YeN3lo7uzSKe-uavjDHIIZFT2TjxcaqjEU/exec';
const pile = document.getElementById('project-pile');
const logoContainer = document.getElementById('logo-container');
const sideMenu = document.getElementById('side-menu');
let archiveData = [];

// Handle Google Drive image display
function getSafeImg(url) {
    const id = url.match(/id=([^&]+)/);
    return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w1200` : url;
}

async function init() {
    try {
        const res = await fetch(API_URL, { redirect: 'follow' });
        archiveData = await res.json();
        renderPile(archiveData);
    } catch (e) {
        console.error("Archive connection failed.");
    }
}

function renderPile(data, isGrid = false) {
    pile.innerHTML = '';
    const isMobile = window.innerWidth < 768;

    if (isGrid) {
        document.body.classList.add('grid-mode');
        pile.style.cssText = "display:flex; flex-wrap:wrap; justify-content:center; width:100%; height:auto;";
    } else {
        document.body.classList.remove('grid-mode');
        pile.style.cssText = ""; // Reset to default CSS
    }

    data.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = 'paper-card';
        
        if (isGrid) {
            card.style.position = 'relative';
            card.style.margin = isMobile ? '15px' : '30px';
            card.style.width = isMobile ? '85vw' : '320px';
            card.style.transform = `rotate(${Math.random() * 10 - 5}deg)`;
        } else {
            card.style.zIndex = data.length - i;
            card.style.transform = `rotate(${Math.random() * 4 - 2}deg)`;
        }

        card.innerHTML = `
            <img src="${getSafeImg(p.titleImage)}" style="width:100%; pointer-events:none;">
            <div class="metadata-block">
                <strong>${p.metadata.name}</strong><br>
                ${p.metadata.author} — ${p.metadata.year}
            </div>
            <div class="expand-icon" onclick="event.stopPropagation(); unfoldProject('${p.id}')">
                <img src="expand.png" width="22" style="opacity:0.6;">
            </div>
        `;
        
        if (!isGrid) card.onclick = () => shuffleToBack(card);
        pile.appendChild(card);
    });
}

function shuffleToBack(card) {
    card.style.transform = 'translateX(130%) rotate(20deg)';
    card.style.opacity = '0';
    
    setTimeout(() => {
        const cards = document.querySelectorAll('.paper-card');
        const zIndices = Array.from(cards).map(c => parseInt(c.style.zIndex || 0));
        const minZ = Math.min(...zIndices);
        card.style.zIndex = minZ - 1;
        card.style.opacity = '1';
        card.style.transform = `rotate(${Math.random() * 4 - 2}deg)`;
    }, 600);
}

function filterProjects(tag) {
    if (tag === 'All') {
        renderPile(archiveData, false);
    } else {
        const filtered = archiveData.filter(p => p.metadata.tags && p.metadata.tags.includes(tag));
        renderPile(filtered, true);
    }
}

function unfoldProject(id) {
    const p = archiveData.find(proj => proj.id === id);
    const overlay = document.createElement('div');
    overlay.id = 'unfold-overlay';
    
    let html = `<div onclick="this.parentElement.remove()" style="cursor:pointer; font-weight:bold; margin-bottom:50px;">[ CLOSE ]</div>`;
    html += `<div class="unfold-gallery">`;
    [p.titleImage, ...p.images].forEach(url => {
        html += `<img src="${getSafeImg(url)}">`;
    });
    html += `</div>`;
    
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
}

logoContainer.onclick = () => {
    const active = document.body.classList.toggle('active-state');
    document.body.classList.toggle('focus-state');
    sideMenu.classList.toggle('hidden', !active);
    if (!active) renderPile(archiveData, false); // Reset to pile if going back to landing
};

init();
