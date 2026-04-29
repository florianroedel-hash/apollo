// ... [getSafeImg and init functions remain same] ...

function renderPile(data, isGrid = false) {
    const pile = document.getElementById('project-pile');
    pile.innerHTML = '';
    document.body.classList.toggle('grid-mode', isGrid);

    data.forEach((p, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = isGrid ? 'grid-cell-wrapper' : '';

        if (isGrid) {
            // MINI-STACK LOGIC: Show Title + up to 2 other images Peeking out
            const stackImages = [p.titleImage, ...p.images].slice(0, 3);
            
            stackImages.reverse().forEach((imgUrl, index) => {
                const card = createCard(p, imgUrl, true, index);
                wrapper.appendChild(card);
            });
            pile.appendChild(wrapper);
        } else {
            // LANDING STACK: Just the title image in a single pile
            const card = createCard(p, p.titleImage, false, 0);
            card.style.zIndex = data.length - i;
            pile.appendChild(card);
        }
    });
}

// Helper function to create a card with random Passe-Partout
function createCard(project, imgUrl, isGrid, layerIndex) {
    const card = document.createElement('div');
    card.className = 'paper-card';

    // 1. RANDOM PASSE-PARTOUT: Change '10' and '20' to adjust thickness range
    const padding = Math.floor(Math.random() * 20) + 10; 
    card.style.padding = `${padding}px`;

    // 2. RANDOM ROTATION & SHIFT
    const rot = Math.random() * 10 - 5;
    const shiftX = Math.random() * 12 - 6;
    const shiftY = Math.random() * 12 - 6;

    if (isGrid) {
        card.style.position = 'absolute';
        card.style.width = '100%';
        // Layers peeking out: Bottom layers shift more
        const layerOffset = (2 - layerIndex) * 5; 
        card.style.transform = `rotate(${rot}deg) translate(${shiftX + layerOffset}px, ${shiftY + layerOffset}px)`;
        card.style.zIndex = layerIndex;
    } else {
        card.style.position = 'absolute';
        card.style.width = (350 + Math.random() * 50) + 'px';
        card.style.transform = `rotate(${rot}deg)`;
        card.onclick = (e) => shuffleToBack(e.currentTarget);
    }

    // Only show text and view button on the top layer (last image in stackImages array)
    const isTopLayer = isGrid ? (layerIndex === 2) : true;

    card.innerHTML = `
        <div class="card-inner-frame">
            <img src="${getSafeImg(imgUrl)}">
        </div>
        ${isTopLayer ? `
            <div class="metadata-block" style="margin-top:12px; text-transform:lowercase; font-size:11px;">
                <span class="highlight-link" style="font-weight:bold;">${project.metadata.name}</span><br>
                <span class="highlight-link">${project.metadata.author}</span> — <span class="highlight-link">${project.metadata.year}</span>
                <img src="expand.png" style="width:25px; float:right; cursor:pointer;" onclick="event.stopPropagation(); unfoldProject('${project.id}')">
            </div>
        ` : ''}
    `;

    return card;
}
