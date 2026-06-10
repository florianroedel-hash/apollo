// IMPORTANT: You only need ONE URL now. Paste the URL for your Master Control Center script here!
const URL_MASTER = 'https://script.google.com/macros/s/AKfycbx4nDabR1zvlbIAyQCZ0FIg4PjAM_MmNVIWQNcVvxcvGHu_cDvKBnp29nqV7KRrL2Ee/exec';

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
    const isEvent = p.metadata && p.metadata.tags && p.metadata.tags.includes('Event');
    
    let lbl2 = "Course", val2 = (p.metadata && p.metadata.course) || "Studio Alpha";
    let lbl3 = "Track", val3 = (p.metadata && p.metadata.track) || "Laurea Magistrale";
    let lbl4 = "Prof", val4 = (p.metadata && p.metadata.author) || "Dr. Smith";
    
    if (isEvent) {
        lbl2 = "Date"; val2 = (p.metadata && p.metadata.dateOverride) || (p.metadata && p.metadata.name) || "TBA";
        lbl3 = "Event"; val3 = (p.metadata && p.metadata.course) || "Special";
        lbl4 = "Note"; val4 = (p.metadata && p.metadata.author) || "Apollo";
    }
    
    return `
        <div>Year</div><div>${(p.metadata && p.metadata.year) || '2024'}</div>
        <div>${lbl2}</div><div>${val2}</div>
        <div>${lbl3}</div><div>${val3}</div>
        <div>${lbl4}</div><div>${val4}</div>
    `;
}

