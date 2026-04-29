// Replace with your Google Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycby3AgRD49QItpR6M3oKG0id58QCZN0a7zQbrm91Z1ZmjwvhBwJzLNI3xBuANUzsWaiVfA/exec'; 
const pile = document.getElementById('project-pile');
const landingTrigger = document.getElementById('landing-trigger');
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
    } catch (e) { console.error("Data fetch error"); }
}

// Logic to enter the archive
landingTrigger.onclick = () => {
    document.body.classList.add('active-state');
    document.body.classList.remove('focus-state');
    
    // Create the corner logo if it doesn't exist
    if (!document.getElementById('active-logo-corner')) {
        const cornerLogo = document.createElement('img');
        cornerLogo.src = 'logo.png';
        cornerLogo.id = 'active-logo-corner';
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

    data.forEach((p, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = isGrid ? 'grid-cell-wrapper' : '';

        if (isGrid) {
            const stackImages = [p.titleImage, ...p.images].slice(0, 3);
            stackImages.reverse().forEach((imgUrl, index) => {
                const card = createCard(p, imgUrl, true, index);
                wrapper.appendChild(card);
            });
            pile.appendChild(wrapper);
        } else {
            const card = createCard(p, p.titleImage, false, 0);
            card.style.zIndex = data.length - i;
            pile.appendChild(card);
        }
    });
}

function createCard(project, imgUrl, isGrid, layerIndex) {
    const card = document.createElement('div');
    card.className = 'paper-card';
    const padding = Math.floor(Math.random() * 20) + 15; 
    card.style.padding = `${padding}px`;

    const rot = Math.random() * 8 - 4;
    if (isGrid) {
        card.style.position = 'absolute';
        card.style.width = '100%';
        const layerOffset = (2 - layerIndex) * 6; 
        card.style.transform = `rotate(${rot}deg) translate(${layerOffset}px, ${layerOffset}px)`;
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
            <div style="margin-top:12px; text-transform:lowercase; font-size:11px;">
                <span class="highlight-link" style="font-weight:bold;">${project.metadata.name}</span><br>
                <span class="highlight-link">${project.metadata.author}</span> — <span class="highlight-link">${project.metadata.year}</span>
                <img src="expand.png" style="width:25px; float:right; cursor:pointer;" onclick="event.stopPropagation(); unfoldProject('${project.id}')">
            </div>
        ` : ''}
    `;
    return card;
}

// ... [shuffleToBack, unfoldProject, and filterProjects functions remain the same] ...

init();
