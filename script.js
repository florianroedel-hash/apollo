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
        const res = await fetch(API_URL, { redirect: 'follow' });
        archiveData = await res.json();
        renderPile(archiveData);
    } catch (e) { console.error("Data error"); }
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
        
        // Stacking logic for the "Pile" view only
        if (!isGrid) {
            card.style.position = 'absolute';
            card.style.zIndex = data.length - i;
            card.style.transform = `rotate(${Math.random() * 4 - 2}deg)`;
            card.onclick = () => shuffleToBack(card);
        }

        card.innerHTML = `
            <img src="${getSafeImg(p.titleImage)}" style="width:100%; pointer-events:none;">
            <div class="metadata-block">
                <strong>${p.metadata.name}</strong><br>
                ${p.metadata.author} — ${p.metadata.year}
            </div>
            <div class="expand-icon" style="margin-top:10px; text-align:right;">
                <button style="background:none; border:1px solid #000; cursor:pointer; font-family:inherit;">VIEW PROJECT</button>
            </div>
        `;
        
        // The fix for Unfold: Attach it to the specific button
        const btn = card.querySelector('button');
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents the card from shuffling when clicking View
            unfoldProject(p.id);
        });

        pile.appendChild(card);
    });
}

function unfoldProject(id) {
    const p = archiveData.find(proj => proj.id === id);
    const overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed; inset:0; background:white; z-index:9000; overflow-y:auto; padding:80px 20px;";
    
    let content = `<h2 onclick="this.parentElement.remove()" style="cursor:pointer; position:fixed; top:20px; left:20px;">[ CLOSE ]</h2>`;
    content += `<div style="max-width:1000px; margin: 0 auto;">`;
    [p.titleImage, ...p.images].forEach(url => {
        content += `<img src="${getSafeImg(url)}" style="width:100%; margin-bottom:40px; display:block;">`;
    });
    content += `</div>`;
    
    overlay.innerHTML = content;
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
    card.style.transform = 'translateX(120%) rotate(15deg)';
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

logoContainer.onclick = () => {
    document.body.classList.toggle('active-state');
    document.body.classList.toggle('focus-state');
    document.getElementById('side-menu').classList.toggle('hidden');
};

init();
