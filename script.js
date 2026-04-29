const API_URL = 'https://script.google.com/macros/s/AKfycbyl6Uj0xd6qmyb69sLF63RvJN7SRsppgwm2FwW_sVvtJ8bJTAAc5msS_oq_scI7u8M/exec';
const pile = document.getElementById('project-pile');
const logoContainer = document.getElementById('logo-container');
let archiveData = [];

function getSafeImg(url) {
    const id = url.match(/id=([^&]+)/);
    return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w1200` : url;
}

async function init() {
    const res = await fetch(API_URL, { redirect: 'follow' });
    archiveData = await res.json();
    renderPile(archiveData);
}

function renderPile(data, isGrid = false) {
    pile.innerHTML = '';
    
    // Grid Mode Fix
    if (isGrid) {
        pile.style.display = 'grid';
        pile.style.gridTemplateColumns = 'repeat(4, 1fr)';
        pile.style.gap = '30px';
        pile.style.width = '90vw';
    } else {
        pile.style.display = 'flex';
        pile.style.width = '600px';
    }

    data.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = 'paper-card';
        
        if (!isGrid) {
            // RANDOMIZED SIZES FOR STACK
            const randW = 350 + Math.random() * 100; // Between 350-450px
            card.style.width = randW + 'px';
            card.style.zIndex = data.length - i;
            card.style.transform = `rotate(${Math.random() * 8 - 4}deg)`;
            card.onclick = () => shuffleToBack(card);
        } else {
            card.style.position = 'relative';
            card.style.width = '100%';
            card.style.transform = 'none';
        }

        card.innerHTML = `
            <img src="${getSafeImg(p.titleImage)}" style="width:100%; pointer-events:none;">
            <div class="metadata-block" style="margin-top:10px; font-size:12px; text-transform:uppercase;">
                <strong>${p.metadata.name}</strong><br>
                ${p.metadata.author} — ${p.metadata.year}
            </div>
            <img src="expand.png" class="expand-btn" onclick="event.stopPropagation(); unfoldProject('${p.id}')">
        `;
        pile.appendChild(card);
    });
}

function unfoldProject(id) {
    const p = archiveData.find(proj => proj.id === id);
    const overlay = document.createElement('div');
    overlay.id = 'unfold-overlay';
    
    // TOP HALF: Title and Meta
    let html = `
        <div class="unfold-top">
            <img src="${getSafeImg(p.titleImage)}" class="unfold-title-img">
            <div style="text-transform:uppercase;">
                <h1 style="margin:0;">${p.metadata.name}</h1>
                <p>${p.metadata.author} / ${p.metadata.year}</p>
                <p style="opacity:0.5;">${p.metadata.tags.join(', ')}</p>
                <div onclick="this.closest('#unfold-overlay').remove()" style="cursor:pointer; margin-top:20px; font-weight:bold;">[ CLOSE ]</div>
            </div>
        </div>
        <div class="unfold-bottom">
    `;

    // BOTTOM HALF: Chaotic 2 Rows
    p.images.forEach((url, i) => {
        const row = i % 2; // Alternates between Row 0 and Row 1
        const leftPos = (i * 15) + (Math.random() * 10); // Spreads them across
        const rot = Math.random() * 10 - 5;
        
        html += `<img src="${getSafeImg(url)}" class="chaotic-thumb" 
                 style="left:${leftPos}%; top:${row * 45}%; transform:rotate(${rot}deg);">`;
    });

    html += `</div>`;
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
}

function filterProjects(tag) {
    if (tag === 'All') renderPile(archiveData, false);
    else renderPile(archiveData.filter(p => p.metadata.tags.includes(tag)), true);
}

function shuffleToBack(card) {
    card.style.transform = 'translateX(130%) rotate(20deg)';
    card.style.opacity = '0';
    setTimeout(() => {
        const cards = document.querySelectorAll('.paper-card');
        const minZ = Math.min(...Array.from(cards).map(c => parseInt(c.style.zIndex || 0)));
        card.style.zIndex = minZ - 1;
        card.style.opacity = '1';
        card.style.transform = `rotate(${Math.random() * 8 - 4}deg)`;
    }, 600);
}

logoContainer.onclick = () => {
    const active = document.body.classList.toggle('active-state');
    document.body.classList.toggle('focus-state');
    if (!active) renderPile(archiveData, false);
};

init();
