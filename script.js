const API_URL = 'https://script.google.com/macros/s/AKfycby3AgRD49QItpR6M3oKG0id58QCZN0a7zQbrm91Z1ZmjwvhBwJzLNI3xBuANUzsWaiVfA/exec';
const landingTrigger = document.getElementById('landing-trigger');
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

// CLICK ACTION: Lift the fog and move the logo
landingTrigger.onclick = () => {
    document.body.classList.remove('focus-state');
    document.body.classList.add('active-state');
    
    // Create the corner logo if missing
    if (!document.getElementById('active-logo-corner')) {
        const cornerLogo = document.createElement('img');
        cornerLogo.src = 'logo.png';
        cornerLogo.id = 'active-logo-corner';
        // Allow clicking corner logo to go back home
        cornerLogo.onclick = () => {
            document.body.classList.add('focus-state');
            document.body.classList.remove('active-state');
        };
        document.body.appendChild(cornerLogo);
    }
};

function renderPile(data, isGrid = false) {
    pile.innerHTML = '';
    document.body.classList.toggle('grid-mode', isGrid);
    // ... [Rest of the renderPile code remains the same as previous turns] ...
}

init();
