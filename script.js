const API_URL = 'https://script.google.com/macros/s/AKfycbycjFdXAr-Dsaj7hpAqZr9Uq-rgPCcqgcBO77_XCy3TRH-RU-79nAnR9AVe6ftHJMlN/exec';
const pile = document.getElementById('project-pile');
const logoContainer = document.getElementById('logo-container');
const bgBlur = document.getElementById('bg-blur-container');
const menu = document.getElementById('side-menu');

let archiveData = [];

// --- THE FIX: Force Google Drive links to act like real images ---
function getSafeImageUrl(googleUrl) {
    if (!googleUrl) return '';
    // Extract the raw ID from the Google link
    const idMatch = googleUrl.match(/id=([^&]+)/);
    if (idMatch && idMatch[1]) {
        // Rebuild it using the unblocked thumbnail server
        return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
    }
    return googleUrl;
}

// 1. Initialize
async function init() {
    try {
        const response = await fetch(API_URL);
        archiveData = await response.json();
        renderPile(archiveData);
        renderBackground(archiveData);
    } catch (err) {
        console.error("Archive fetch failed:", err);
    }
}

// 2. Render blurred stack for landing
function renderBackground(data) {
    bgBlur.innerHTML = ''; // Clear existing
    data.forEach(p => {
        const img = document.createElement('img');
        img.src = getSafeImageUrl(p.titleImage);
        img.style.width = '200px';
        img.style.position = 'absolute';
        img.style.top = Math.random() * 100 + '%';
        img.style.left = Math.random() * 100 + '%';
        img.style.opacity = '0.5';
        bgBlur.appendChild(img);
    });
}

// 3. Create the Paper Pile
function renderPile(data) {
    pile.innerHTML = '';
    data.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = 'paper-card';
        card.style.zIndex = data.length - i;
        
        const rot = Math.random() * 6 - 3;
        card.style.transform = `rotate(${rot}deg)`;

        // Added object-fit and min-height so the card never collapses
        const safeImg = getSafeImageUrl(p.titleImage);
        
        card.innerHTML = `
            <img src="${safeImg}" style="width: 100%; height: 350px; object-fit: cover; background-color: #f5f5f5; border-radius: 2px;">
            <div class="metadata-block">
                <strong>${p.metadata.name}</strong><br>
                ${p.metadata.author} — ${p.metadata.year}
            </div>
            <div class="expand-icon" style="position:absolute; bottom:10px; right:10px;">
                <img src="expand.png" width="20">
            </div>
        `;

        card.onclick = () => shuffleToBack(card);
        pile.appendChild(card);
    });
}

// 4. Shuffle Logic
function shuffleToBack(card) {
    card.style.transform = 'translateX(150%) rotate(20deg)';
    card.style.opacity = '0';

    setTimeout(() => {
        const cards = document.querySelectorAll('.paper-card');
        const zIndices = Array.from(cards).map(c => parseInt(c.style.zIndex));
        const minZ = Math.min(...zIndices);

        card.style.zIndex = minZ - 1;
        card.style.opacity = '1';
        const rot = Math.random() * 6 - 3;
        card.style.transform = `rotate(${rot}deg)`;
    }, 600);
}

// 5. Logo Click (Toggle State & Menu)
logoContainer.onclick = () => {
    const isFocus = document.body.classList.contains('focus-state');
    if (isFocus) {
        document.body.classList.replace('focus-state', 'active-state');
        menu.classList.remove('hidden');
    } else {
        document.body.classList.replace('active-state', 'focus-state');
        menu.classList.add('hidden');
    }
};

init();
