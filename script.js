// 1. YOUR GOOGLE SCRIPT LINK
const API_URL = 'https://script.google.com/macros/s/AKfycby3AgRD49QItpR6M3oKG0id58QCZN0a7zQbrm91Z1ZmjwvhBwJzLNI3xBuANUzsWaiVfA/exec';

const logoContainer = document.getElementById('logo-container');
let archiveData = [];

// ... [Keep your getSafeImg and init functions] ...

// THE TRIGGER: Clicking the logo moves it and lifts the fog
logoContainer.onclick = () => {
    if (document.body.classList.contains('focus-state')) {
        document.body.classList.remove('focus-state');
        document.body.classList.add('active-state');
        
        // Render the archive pile immediately once sharp
        renderPile(archiveData, false); 
    }
};

function renderPile(data, isGrid = false) {
    const pile = document.getElementById('project-pile');
    pile.innerHTML = '';
    
    // Toggle the scrolling mode
    document.body.classList.toggle('grid-mode', isGrid);

    data.forEach((p, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = isGrid ? 'grid-cell-wrapper' : '';
        
        // Random Passe-Partout for each card (from previous turn)
        const card = createCard(p, p.titleImage, isGrid, 2); 
        
        if (!isGrid) {
            card.style.position = 'absolute';
            card.style.zIndex = data.length - i;
            card.onclick = () => shuffleToBack(card);
        }

        if (isGrid) {
            wrapper.appendChild(card);
            pile.appendChild(wrapper);
        } else {
            pile.appendChild(card);
        }
    });
}
