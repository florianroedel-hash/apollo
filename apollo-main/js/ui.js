// ---------------------------------------------------------------------------
// DROPDOWN FONT SCALING
// ---------------------------------------------------------------------------
function calibrateDropdownFont() {
    requestAnimationFrame(() => {
        const titleEls = document.querySelectorAll('.big-header-title');
        const dropdownMenus = document.querySelectorAll('.dropdown-menu');
        dropdownMenus.forEach(m => {
            m.style.opacity = '1';
            m.style.pointerEvents = 'none';
        });

        let baseFontRem = 1.2; 
        let minRatio = 1;

        document.querySelectorAll('.header-col').forEach(col => {
            const titleEl = col.querySelector('.big-header-title');
            const dropMenu = col.querySelector('.dropdown-menu');
            if (!titleEl || !dropMenu) return;
            const titleW = titleEl.getBoundingClientRect().width;
            const dropW = dropMenu.scrollWidth;
            if (dropW > 0 && titleW > 0) {
                const ratio = titleW / dropW;
                if (ratio < minRatio) minRatio = ratio;
            }
        });

        const finalFontRem = baseFontRem * minRatio;
        const finalPadRem = 0.6 * minRatio;
        const finalGapRem = 0.4 * minRatio;
        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.gap = `${finalGapRem}rem`);
        document.querySelectorAll('.dropdown-menu .highlight-link').forEach(link => {
            link.style.fontSize = `${finalFontRem}rem`;
            link.style.padding = `${finalPadRem/2}rem ${finalPadRem}rem`;
        });

        dropdownMenus.forEach(m => {
            m.style.opacity = '';
            m.style.pointerEvents = '';
        });
    });
}

window.toggleMenu = function(id, wrapper, event) {
    if(event.target.tagName === 'A') return;
    if(window._blockMenuToggle) return; // ghost-tap guard after closing a spread
    event.stopPropagation();
    
    const col = document.getElementById('col-' + id);
    const isOpen = col.classList.contains('menu-open');
    const btn = wrapper.querySelector('.menu-toggle');
    
    document.querySelectorAll('.header-col').forEach(c => c.classList.remove('menu-open'));
    document.querySelectorAll('.menu-toggle').forEach(t => t.innerText = '+');
    
    if (!isOpen) {
        col.classList.add('menu-open');
        btn.innerText = '–';
    }
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('.title-wrapper')) {
        document.querySelectorAll('.header-col').forEach(c => c.classList.remove('menu-open'));
        document.querySelectorAll('.menu-toggle').forEach(t => t.innerText = '+');
    }
});

