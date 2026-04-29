const API_URL = 'YOUR_APPS_SCRIPT_URL';
const pile = document.getElementById('project-pile');
const logo = document.getElementById('main-logo');
let archiveData = [];

// 1. Fetch Data
async function loadArchive() {
    const response = await fetch(API_URL);
    archiveData = await response.json();
    renderPile(archiveData);
    renderBlurBackground(archiveData);
}

// 2. Render the "Infinite Shuffle" Pile
function renderPile(data) {
    pile.innerHTML = '';
    data.forEach((project, index) => {
        const card = document.createElement('div');
        card.className = 'paper-card';
        card.style.zIndex = data.length - index;
        
        card.innerHTML = `
            <img src="${project.titleImage}" style="width:100%">
            <div class="metadata-block">
                <strong>${project.metadata.name}</strong><br>
                ${project.metadata.author}, ${project.metadata.year}
            </div>
            <div class="expand-icon" onclick="unfoldProject('${project.id}')">
                <img src="expand.png" width="30">
            </div>
        `;

        card.addEventListener('click', (e) => {
            if(e.target.closest('.expand-icon')) return;
            shuffleToBack(card);
        });
        
        pile.appendChild(card);
    });
}

// 3. Shuffle Logic
function shuffleToBack(card) {
    card.style.transform = 'translateX(120%) rotate(10deg)';
    setTimeout(() => {
        const maxZ = Math.max(...Array.from(document.querySelectorAll('.paper-card')).map(c => c.style.zIndex));
        const minZ = Math.min(...Array.from(document.querySelectorAll('.paper-card')).map(c => c.style.zIndex));
        card.style.zIndex = minZ - 1;
        card.style.transform = 'translateX(0) rotate(0deg)';
    }, 600);
}

// 4. State Transitions
logo.addEventListener('click', () => {
    document.body.classList.toggle('active-state');
    document.body.classList.toggle('focus-state');
});

loadArchive();