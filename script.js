/**
 * BESPOKE ARCHIVE: CORE ENGINE
 * Connected to Google Apps Script JSON Feed
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbycjFdXAr-Dsaj7hpAqZr9Uq-rgPCcqgcBO77_XCy3TRH-RU-79nAnR9AVe6ftHJMlN/exec';
const pile = document.getElementById('project-pile');
const logo = document.getElementById('main-logo');
const bgBlurContainer = document.getElementById('bg-blur-container');
let archiveData = [];

// 1. Fetch Data from Google
async function loadArchive() {
    try {
        const response = await fetch(API_URL);
        archiveData = await response.json();
        renderPile(archiveData);
        renderBlurBackground(archiveData);
    } catch (error) {
        console.error("Data connection failed:", error);
    }
}

// 2. Create the Blurred Background (Focus State)
function renderBlurBackground(data) {
    bgBlurContainer.innerHTML = '';
    data.forEach(project => {
        const img = document.createElement('img');
        img.src = project.titleImage;
        img.style.position = 'absolute';
        img.style.width = '300px';
        // Randomly scatter blurred images behind logo
        img.style.top = Math.random() * 80 + '%';
        img.style.left = Math.random() * 80 + '%';
        bgBlurContainer.appendChild(img);
    });
}

// 3. Render the "Infinite Shuffle" Pile
function renderPile(data) {
    pile.innerHTML = '';
    data.forEach((project, index) => {
        const card = document.createElement('div');
        card.className = 'paper-card';
        card.style.zIndex = data.length - index;
        
        // Random slight rotation for the "Paper on Desk" look
        const randomRot = Math.random() * 4 - 2; 
        card.style.transform = `rotate(${randomRot}deg)`;

        card.innerHTML = `
            <img src="${project.titleImage}" style="width:100%" loading="lazy">
            <div class="metadata-block">
                <strong>${project.metadata.name}</strong><br>
                ${project.metadata.author} — ${project.metadata.year}
            </div>
            <div class="expand-icon" onclick="event.stopPropagation(); unfoldProject('${project.id}')">
                <img src="expand.png" style="width:100%">
            </div>
        `;

        // Shuffle logic on click
        card.addEventListener('click', () => shuffleToBack(card));
        
        pile.appendChild(card);
    });
}

// 4. The Shuffle Animation
function shuffleToBack(card) {
    // Slide out to the right
    card.style.transform = 'translateX(120%) rotate(15deg)';
    card.style.opacity = '0';

    setTimeout(() => {
        // Find the current lowest z-index
        const cards = document.querySelectorAll('.paper-card');
        const zIndices = Array.from(cards).map(c => parseInt(c.style.zIndex));
        const minZ = Math.min(...zIndices);

        card.style.zIndex = minZ - 1;
        card.style.opacity = '1';
        // Slide back in with a random slight rotation
        const randomRot = Math.random() * 4 - 2;
        card.style.transform = `rotate(${randomRot}deg)`;
    }, 600);
}

// 5. Logo State Toggle
logo.addEventListener('click', () => {
    const isFocus = document.body.classList.contains('focus-state');
    if (isFocus) {
        document.body.classList.replace('focus-state', 'active-state');
    } else {
        document.body.classList.replace('active-state', 'focus-state');
    }
});

loadArchive();
