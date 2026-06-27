// IMPORTANT: The live site now pulls directly from the static data.json file!
const URL_MASTER = 'data.json';

const pile = document.getElementById('project-pile');
const filterBar = document.getElementById('filter-bar');

let archiveData = [], calendarData = [], magazineData = [], historyData = [], audioData = [];
let isLoaded = false, isWaitingToStart = true, magCurrentPage = 0;

// ---- Stable viewport height fix ----
// Prevents address-bar show/hide from compressing/expanding the layout.
// Sets --vh once from window.innerHeight (which excludes the browser chrome on most phones),
// then only updates on genuine orientation changes — never on address-bar toggles.
(function setStableVH() {
    const set = () => document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
    set();
    window.addEventListener('orientationchange', () => setTimeout(set, 300));
})();

function getSafeImg(url) {
    const id = url.match(/id=([^&]+)/);
    return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w1200` : url;
}

function getHDImageUrl(url) {
    if (!url) return '';
    const id = url.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
    return id ? `https://drive.google.com/uc?export=view&id=${id[1]}` : url;
}

window.copyProjectUrl = function(id, btn) {
    const url = window.location.origin + window.location.pathname + '?project=' + id;
    
    const el = document.createElement('textarea');
    el.value = url;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    
    el.select();
    el.setSelectionRange(0, 99999);
    
    let success = false;
    try {
        success = document.execCommand('copy');
    } catch(err) {
        success = false;
    }
    
    document.body.removeChild(el);
    
    if (success) {
        btn.innerText = 'copied!';
    } else {
        btn.innerText = 'failed';
        prompt("Automatic copy blocked by browser. You can manually copy the link here:", url);
    }
    setTimeout(() => { btn.innerText = 'share'; }, 2000);
};

function getNoteGridHtml(p) {
    const meta = p.metadata || {};
    const isEvent = meta.tags && meta.tags.includes('Event');
    
    let html = '';
    
    // Priority order for standard fields
    const priorityKeys = isEvent ? ['year', 'dateoverride', 'course', 'author'] : ['year', 'course', 'track', 'author'];
    
    // Original labels expected by the user
    const labels = {
        'year': 'Year',
        'course': isEvent ? 'Event' : 'Course',
        'track': 'Track',
        'author': isEvent ? 'Note' : 'Author',
        'dateoverride': 'Date'
    };
    
    for (let key of priorityKeys) {
        if (meta[key]) {
            html += `<div>${labels[key] || key}</div><div>${meta[key]}</div>`;
        }
    }
    
    // Automatically inject any custom fields found in the metadata
    const reservedKeys = ['name', 'title', 'description', 'tags', 'instagram handles', 'instagram', 'dateoverride', 'event', 'note'];
    priorityKeys.forEach(k => reservedKeys.push(k));
    
    for (let key in meta) {
        let cleanKey = key.toLowerCase().trim();
        if (!reservedKeys.includes(cleanKey)) {
            let label = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
            let val = meta[key];
            if (val && typeof val === 'string' && val.trim() !== '') {
                html += `<div>${label}</div><div>${val}</div>`;
            }
        }
    }
    
    return html;
}

