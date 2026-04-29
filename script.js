const API_URL = 'https://script.google.com/macros/s/AKfycbw9AJb8akuwVCffFT6oUDwxoXfirjSmJ4YeN3lo7uzSKe-uavjDHIIZFT2TjxcaqjEU/exec';
const pile = document.getElementById('project-pile');
const logoContainer = document.getElementById('logo-container');
let archiveData = [];

function getSafeImg(url) {
    const id = url.match(/id=([^&]+)/);
    return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w1200` : url;
}

async function init() {
    try {
        const res = await fetch(API_URL, { method: 'GET', redirect: 'follow' });
        archiveData = await res.json();
        if (archiveData.error) {
            console.error("Script Crash:", archiveData.error);
            return;
        }
        renderPile(archiveData);
    } catch (e) {
        console.error("Connection error");
    }
}

function renderPile(data, isGrid = false) {
    pile.innerHTML = '';
    
    if (isGrid) {
        document.body.classList.add('grid-mode');
    } else {
        document.body.classList.remove('grid-mode');
    }

    data.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = 'paper-card';
        
        if (!isGrid) {
            card.style.position = 'absolute';
            card.style.zIndex = data.length - i;
            card.style.transform = `rotate(${Math.random() * 4 - 2}deg)`;
            card.onclick = () => shuffleToBack(card);
        }

        card.innerHTML = `
            <img src="${getSafeImg(p.titleImage)}" style="width:100%; pointer-events:none;">
            <div class="metadata-block" style="margin-top:10px; font-size:12px; text-transform:uppercase;">
                <strong>${p.metadata.name}</strong><br>
                ${p.metadata.author} — ${p.metadata.year}
            </div>
            <button class="view-btn" style="margin-top:15px; width:100%; padding:10px; cursor:pointer; background:white; border:1px solid #000; font-family:inherit; font-weight:bold;">VIEW PROJECT</button>
        `;
        
        // Fix for Unfold Functionality
        const btn = card.querySelector('.view-btn');
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stops the card from shuffling when clicking button
            unfoldProject(p.id);
        });

        pile.appendChild(card);
    });
}

function unfoldProject(id) {
    const p = archiveData.find(proj => proj.id === id);
    const overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed; inset:0; background:white; z-index:9999; overflow-y:auto; padding:80px 20px;";
    
    let html = `<div onclick="this.parentElement.remove()" style="position:fixed; top:40px; left:40px; cursor:pointer; font-weight:bold; background:#ccff00; padding:5px 10px;">[ CLOSE ]</div>`;
    html += `<div style="max-width:1000px; margin: 0 auto;">`;
    
    const allImgs = [p.titleImage, ...p.images];
    allImgs.forEach(url => {
        html += `<img src="${getSafeImg(url)}" style="width:100%; margin-bottom:50px; display:block;">`;
    });
    html += `</div>`;
    
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
}

function filterProjects(tag) {
    if (tag === 'All') {
        renderPile(archiveData, false);
    } else {
        const filtered = archiveData.filter(p => p.metadata.tags && p.metadata.tags.includes(tag));
        renderPile(filtered, true);
    }
}

function shuffleToBack(card) {
    card.style.transform = 'translateX(130%) rotate(20deg)';
    card.style.opacity = '0';
    setTimeout(() => {
        const cards = document.querySelectorAll('.paper-card');
        const minZ = Math.min(...Array.from(cards).map(c => parseInt(c.style.zIndex || 0)));
        card.style.zIndex = minZ - 1;
        card.style.opacity = '1';
        card.style.transform = `rotate(${Math.random() * 4 - 2}deg)`;
    }, 600);
}

logoContainer.onclick = () => {
    const active = document.body.classList.toggle('active-state');
    document.body.classList.toggle('focus-state');
    document.getElementById('side-menu').classList.toggle('hidden', !active);
    if (!active) renderPile(archiveData, false);
};

init();
