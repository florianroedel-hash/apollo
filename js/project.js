window.revealInstagramHandles = function(btn, rawHandles) {
    if (window.event) window.event.stopPropagation();
    let lines = rawHandles.split('<br>');
    let out = [];
    for (let line of lines) {
        let match = line.match(/^(.*?)\s*@([a-zA-Z0-9_.-]+)(.*)$/);
        if (match) {
            let name = match[1].trim();
            let handle = match[2].trim();
            let rest = match[3];
            let linkText = name ? name : '@' + handle;
            out.push(`<a href="https://www.instagram.com/${handle}/" target="_blank" style="color:inherit; text-decoration:none;" onclick="event.stopPropagation()">${linkText}</a>${rest}`);
        } else {
            out.push(line);
        }
    }
    btn.innerHTML = out.join('<br>');
    btn.onclick = null;
    btn.style.cursor = 'default';
};

window.openLightbox = function(index, event) {
    if (event) event.stopPropagation();
    const gallery = window.currentLightboxGallery;
    if (!gallery || !gallery[index]) return;
    let box = document.getElementById('spread-lightbox');
    const isNew = !box;
    
    let canvasRects = [];
    if (isNew) {
        const imgs = Array.from(document.querySelectorAll('.unfold-grid-item img'));
        canvasRects = imgs.map(img => ({
            el: img,
            src: img.src,
            rect: img.getBoundingClientRect()
        }));
    }

    if (isNew) {
        box = document.createElement('div');
        box.id = 'spread-lightbox';
        document.body.appendChild(box);
        
        box._keyHandler = (e) => {
            if (e.key === 'Escape') window.closeLightbox();
            else if (e.key === 'ArrowLeft') window.prevSlide(e);
            else if (e.key === 'ArrowRight') window.nextSlide(e);
        };
        document.addEventListener('keydown', box._keyHandler);

        box._wheelHandler = (e) => {
            // Check if we are scrolling inside a scrollable area (like the postit text)
            let el = e.target;
            let isScrollable = false;
            while (el && el !== box) {
                if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
                    const style = window.getComputedStyle(el);
                    if (style.overflowY === 'auto' || style.overflowY === 'scroll' || 
                        style.overflowX === 'auto' || style.overflowX === 'scroll') {
                        isScrollable = true;
                        break;
                    }
                }
                el = el.parentElement;
            }
            if (isScrollable) return;

            if (box._wheelTimeout) return;
            let delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (Math.abs(delta) > 5) {
                if (delta > 0) window.nextSlide(e);
                else window.prevSlide(e);
                
                box._wheelTimeout = setTimeout(() => {
                    box._wheelTimeout = null;
                }, 450); // Cooldown to snap-in one at a time
            }
        };
        box.addEventListener('wheel', box._wheelHandler, { passive: true });
    }
    
    const item = gallery[index];
    const showArrows = gallery.length > 1;

    let contentHtml = '';
    if (item.type === 'postit') {
        const p = item.p;
        const noteHtml = `
            <img src="assets/images/logo.png" class="stamp-logo">
            <div class="note-ref-code">[ REF: ARC-${p.id.substring(0,6).toUpperCase()} ]</div>
            <div class="note-divider"></div>
            <div class="note-title">${p.metadata.name}</div>
            <div class="note-divider"></div>
            <div class="note-meta-grid">
                ${getNoteGridHtml(p)}
            </div>
            <div class="note-divider"></div>
            <div class="note-text-content" style="display: block; -webkit-line-clamp: unset; overflow: visible;">${p.metadata.description || ''}</div>
        `;
        // Measure exact post-it height dynamically to scale
        const dummy = document.createElement('div');
        dummy.style.visibility = 'hidden';
        dummy.style.position = 'absolute';
        dummy.style.width = '272px';
        dummy.className = 'bookmark-note spread-note';
        dummy.innerHTML = noteHtml;
        document.body.appendChild(dummy);
        let nativeHeight = dummy.offsetHeight || 400;
        document.body.removeChild(dummy);
        
        let vh = window.innerHeight;
        let vw = window.innerWidth;
        let scaleH = (vh * 0.60) / nativeHeight;
        let scaleW = (vw * 0.60) / 272;
        let optimalScale = Math.min(scaleH, scaleW, 1.5);
        
        contentHtml = `
            <div style="transform: scale(${optimalScale}); transform-origin: center; cursor: default; position: absolute; top: 50%; left: 50%; margin-top: -${nativeHeight/2}px; margin-left: -136px;" onclick="event.stopPropagation()">
                <div class="bookmark-note spread-note" style="margin:0; width:272px; min-width:unset; transform:none; position: relative;">
                    ${noteHtml}
                </div>
                ${(p.metadata.instagram || p.metadata['instagram handles']) ? 
                    `<div style="cursor: pointer; margin-top: 2rem; text-align: center; width: 100%; font-family: 'Ufficio', sans-serif; font-size: 0.9rem; color: white; opacity: 0.7;" onclick="window.revealInstagramHandles(this, '${(p.metadata.instagram || p.metadata['instagram handles']).replace(/'/g, "\\'")}')">contact</div>` 
                : ''}
            </div>
        `;
    } else {
        const safeSrc = getSafeImg(item.src);
        const desc = item.desc;
        contentHtml = `
            <div style="display: inline-flex; flex-direction: column; align-items: stretch; max-width: 90vw; max-height: 90vh;">
                <img src="${safeSrc}" alt="Detail View" onclick="event.stopPropagation()" style="width: auto; max-width: 100%; max-height: 75vh; box-shadow: 0 1.5rem 4.5rem rgba(0,0,0,0.2); border: 1px solid #eaeaea; background: white; padding: 2rem; border-radius: 0.2rem; object-fit: contain;">
                ${desc || item.audioUrl ? `
                <div style="position: relative; margin-top: 1.5rem; width: 100%; box-sizing: border-box;">
                    ${item.audioUrl ? `<div style="position: absolute; left: 0; top: 0;"><span class="magazine-audio-btn mag-listen-btn" style="font-family: 'Ufficio', sans-serif; font-size: 0.9rem; cursor: pointer; text-decoration: none; color: #FFF; opacity: 1; pointer-events: auto;" onclick="event.stopPropagation(); if(typeof toggleMagazineAudio === 'function') toggleMagazineAudio('${item.audioUrl}')">${typeof magAudioState !== 'undefined' ? magAudioState : 'listen'}</span></div>` : ''}
                    <div class="lightbox-caption" style="text-align: center; width: 100%; font-family: 'Ufficio', sans-serif; font-size: 0.9rem; color: white; opacity: 0.7; pointer-events: none; margin: 0; max-width: none;" onclick="event.stopPropagation()">
                        ${desc ? `${desc}` : ''}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    // Generate thumbnails
    let thumbHtml = '';
    gallery.forEach((gItem, idx) => {
        let activeClass = idx === index ? 'active-swipe-tag' : '';
        if (gItem.type === 'postit') {
            thumbHtml += `<span class="tag-filter highlight-link spread-thumb-item ${activeClass}" style="padding: 0.5rem 0.6rem !important; display:inline-flex; align-items:center; justify-content:center; overflow:visible; width:3.5rem; height:2.5rem; box-sizing:border-box; margin: 0 0.2rem; cursor: pointer; pointer-events: auto;" onclick="openLightbox(${idx}, event)">
                <img src="assets/images/logo.png" style="width:100%;height:100%;object-fit:contain;border-radius:0.2rem;display:block;background:white;padding:0.3rem;box-sizing:border-box;">
            </span>`;
        } else {
            let styleExt = isNew ? "opacity: 0;" : "";
            thumbHtml += `<span class="tag-filter highlight-link spread-thumb-item ${activeClass}" style="padding: 0.5rem 0.6rem !important; display:inline-flex; align-items:center; justify-content:center; overflow:visible; width:3.5rem; height:2.5rem; box-sizing:border-box; margin: 0 0.2rem; cursor: pointer; pointer-events: auto;" onclick="openLightbox(${idx}, event)">
                <img class="lightbox-thumb-img" src="${getSafeImg(gItem.src)}" style="width:100%;height:100%;object-fit:cover;border-radius:0.2rem;display:block; ${styleExt}">
            </span>`;
        }
    });
    
    box.innerHTML = `
        <div class="close-minus" style="position: absolute; top: 3.5rem; right: 4rem; color: black; z-index: 1000005;" onclick="window.closeLightbox(event)" ontouchstart="window.closeLightbox(event)">–</div>
        ${contentHtml}
        <div class="lightbox-thumb-strip" style="position: absolute; bottom: 2rem; width: calc(100% - 12rem); left: 6rem; display: flex; justify-content: safe center; align-items: center; z-index: 1000005; overflow-x: auto; scrollbar-width: none;">
            ${thumbHtml}
        </div>
    `;
    
    const strip = box.querySelector('.lightbox-thumb-strip');
    const activeThumb = box.querySelector('.active-swipe-tag');
    if (strip && activeThumb) {
        requestAnimationFrame(() => {
            activeThumb.scrollIntoView({ behavior: isNew ? 'auto' : 'smooth', inline: 'center' });
            
            if (isNew && canvasRects.length > 0) {
                requestAnimationFrame(() => {
                    const thumbs = Array.from(box.querySelectorAll('.lightbox-thumb-img'));
                    
                    // Fade out canvas post-its smoothly alongside the animation
                    const postits = Array.from(document.querySelectorAll('.bookmark-note'));
                    postits.forEach(p => {
                        if (!p.closest('#spread-lightbox')) {
                            p.style.transition = 'opacity 0.7s ease-out';
                            p.style.opacity = '0';
                        }
                    });
                    
                    canvasRects.forEach(canvasObj => {
                        const thumb = thumbs.find(t => t.src === canvasObj.src);
                        if (!thumb) return;
                        
                        const targetRect = thumb.getBoundingClientRect();
                        
                        // Hide original canvas wrapper to remove the white frames smoothly
                        const wrapper = canvasObj.el.closest('.unfold-grid-item');
                        if (wrapper) {
                            wrapper.style.transition = 'opacity 0.2s ease-out';
                            wrapper.style.opacity = '0';
                        }
                        else canvasObj.el.style.opacity = '0';
                        
                        const ghost = document.createElement('img');
                        ghost.src = canvasObj.src;
                        ghost.style.position = 'fixed';
                        ghost.style.zIndex = '1000010';
                        ghost.style.top = `${canvasObj.rect.top}px`;
                        ghost.style.left = `${canvasObj.rect.left}px`;
                        ghost.style.width = `${canvasObj.rect.width}px`;
                        ghost.style.height = `${canvasObj.rect.height}px`;
                        ghost.style.objectFit = 'cover';
                        ghost.style.transition = 'all 0.7s cubic-bezier(0.25, 1, 0.5, 1)';
                        ghost.style.borderRadius = '0';
                        document.body.appendChild(ghost);
                        
                        // Force reflow
                        ghost.getBoundingClientRect();
                        
                        // Play
                        ghost.style.top = `${targetRect.top}px`;
                        ghost.style.left = `${targetRect.left}px`;
                        ghost.style.width = `${targetRect.width}px`;
                        ghost.style.height = `${targetRect.height}px`;
                        ghost.style.borderRadius = '0.2rem';
                        
                        setTimeout(() => {
                            if (ghost.parentNode) ghost.remove();
                        }, 750);
                    });
                    
                    // Reveal real thumbnails slightly BEFORE animation finishes to prevent flash
                    setTimeout(() => {
                        thumbs.forEach(t => {
                            t.style.transition = 'opacity 0.25s ease-out';
                            t.style.opacity = '1';
                        });
                    }, 500);
                });
            }
        });
    }
    
    box.onclick = function(e) {
        if (e.clientX < window.innerWidth * 0.35) {
            window.prevSlide(e);
        } else if (e.clientX > window.innerWidth * 0.65) {
            window.nextSlide(e);
        } else {
            window.closeLightbox(e);
        }
    };
    window.currentLightboxIndex = index;
    
    if (isNew) {
        requestAnimationFrame(() => {
            box.style.opacity = '1';
        });
    }
};

window.closeLightbox = function(event) {
    if (event) event.stopPropagation();
    const box = document.getElementById('spread-lightbox');
    if (box) {
        if (box.isClosing) return;
        box.isClosing = true;

        if (box._keyHandler) document.removeEventListener('keydown', box._keyHandler);

        // FLIP Reverse Animation
        const thumbs = Array.from(box.querySelectorAll('.lightbox-thumb-img'));
        const canvasImgs = Array.from(document.querySelectorAll('.unfold-grid-item img'));
        
        // Fade canvas post-its back in
        const postits = Array.from(document.querySelectorAll('.bookmark-note'));
        postits.forEach(p => {
            if (!p.closest('#spread-lightbox')) {
                p.style.transition = 'opacity 0.7s ease-in';
                p.style.opacity = '1';
            }
        });
        
        thumbs.forEach(thumb => {
            const canvasImg = canvasImgs.find(c => c.src === thumb.src);
            if (!canvasImg) return;
            
            const startRect = thumb.getBoundingClientRect();
            const targetRect = canvasImg.getBoundingClientRect();
            
            const ghost = document.createElement('img');
            ghost.src = thumb.src;
            ghost.style.position = 'fixed';
            ghost.style.zIndex = '1000010';
            ghost.style.top = `${startRect.top}px`;
            ghost.style.left = `${startRect.left}px`;
            ghost.style.width = `${startRect.width}px`;
            ghost.style.height = `${startRect.height}px`;
            ghost.style.objectFit = 'cover';
            ghost.style.borderRadius = '0.2rem';
            ghost.style.transition = 'all 0.7s cubic-bezier(0.25, 1, 0.5, 1)';
            document.body.appendChild(ghost);
            
            // Hide real thumb to prevent double-vision
            thumb.style.opacity = '0';
            
            // Force reflow
            ghost.getBoundingClientRect();
            
            // Play
            ghost.style.top = `${targetRect.top}px`;
            ghost.style.left = `${targetRect.left}px`;
            ghost.style.width = `${targetRect.width}px`;
            ghost.style.height = `${targetRect.height}px`;
            ghost.style.borderRadius = '0';
            
            // Start fading the frame in late so it's fully visible when the image lands
            setTimeout(() => {
                const wrapper = canvasImg.closest('.unfold-grid-item');
                if (wrapper) {
                    wrapper.style.transition = 'opacity 0.2s ease-in';
                    wrapper.style.opacity = '1';
                }
                else canvasImg.style.opacity = '1';
            }, 500);
            
            setTimeout(() => {
                if (ghost.parentNode) ghost.remove();
            }, 750);
        });

        // Fade out lightbox background and main content
        box.style.opacity = '0';
        setTimeout(() => box.remove(), 750);
    }
};

window.prevSlide = function(event) {
    if (event) event.stopPropagation();
    const gallery = window.currentLightboxGallery;
    if (!gallery) return;
    let idx = window.currentLightboxIndex - 1;
    if (idx < 0) idx = gallery.length - 1;
    window.openLightbox(idx, event);
};

window.nextSlide = function(event) {
    if (event) event.stopPropagation();
    const gallery = window.currentLightboxGallery;
    if (!gallery) return;
    let idx = window.currentLightboxIndex + 1;
    if (idx >= gallery.length) idx = 0;
    window.openLightbox(idx, event);
};

function initSpreadCanvas(containerId, contentId, contentWidth, contentHeight) {
    const container = document.getElementById(containerId);
    const content = document.getElementById(contentId);
    if (!container || !content) return;

    let scale = 1;
    let tx = 0, ty = 0;
    let isDragging = false;
    let startX = 0, startY = 0;

    // Pan via drag
    container.addEventListener('mousedown', e => {
        isDragging = true;
        startX = e.clientX - tx;
        startY = e.clientY - ty;
    });
    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        tx = e.clientX - startX;
        ty = e.clientY - startY;
        content.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    });
    window.addEventListener('mouseup', () => isDragging = false);

    // Zoom via wheel
    container.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomIntensity = 0.002;
        const wheel = e.deltaY < 0 ? 1 : -1;
        const zoom = Math.exp(wheel * zoomIntensity * 30); // Smooth zoom factor
        
        // Calculate pointer position relative to content to zoom into pointer
        const rect = container.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;

        // Calculate offset difference
        const dx = (pointerX - tx) * (zoom - 1);
        const dy = (pointerY - ty) * (zoom - 1);

        tx -= dx;
        ty -= dy;
        scale *= zoom;
        
        // Constrain scale
        scale = Math.min(Math.max(scale, 0.1), 5);
        content.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }, { passive: false });
    
    // Initial centering
    setTimeout(() => {
        const cRect = container.getBoundingClientRect();
        const scaleFitX = (cRect.width - 160) / contentWidth;
        const scaleFitY = (cRect.height - 300) / contentHeight;
        const initialScale = Math.min(scaleFitX, scaleFitY, 1);
        
        scale = initialScale;
        tx = (cRect.width - (contentWidth * scale)) / 2;
        ty = (cRect.height - (contentHeight * scale)) / 2;
        content.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }, 50);
}

function unfoldProject(id) {
    window.history.pushState({ projectId: id }, '', '?project=' + id);
    let p = archiveData.find(proj => proj.id === id);
    if (!p) {
        // Fallback to searching calendar data
        for (let i = 0; i < calendarData[0].events.length; i++) {
            if (calendarData[0].events[i].spreadData && calendarData[0].events[i].spreadData.id === id) {
                p = calendarData[0].events[i].spreadData;
                break;
            }
        }
    }
    if (!p) return;

    document.body.classList.add('spread-open');
    filterBar.style.opacity = '0';
    filterBar.style.pointerEvents = 'none';
    const over = document.createElement('div');
    over.id = 'unfold-overlay';
    over.classList.add('glass-overlay');
    
    window._spreadEscHandler = (e) => {
        if (e.key === 'Escape') {
            if (document.getElementById('spread-lightbox')) return; // Let lightbox handle its own Escape
            document.body.classList.remove('spread-open');
            filterBar.style.opacity='1';
            filterBar.style.pointerEvents='auto';
            const ov = document.getElementById('unfold-overlay');
            if(ov) ov.remove();
            document.removeEventListener('keydown', window._spreadEscHandler);
            window.history.pushState({}, '', window.location.pathname);
            if (window.cameFromSearch) {
                window.cameFromSearch = false;
                document.body.classList.add('search-open');
                document.addEventListener('keydown', window._searchEscHandler);
            }
            if (window.innerWidth <= 900 && typeof window.updateMobileTitles === 'function') {
                window.updateMobileTitles();
            }
        }
    };
    document.addEventListener('keydown', window._spreadEscHandler);
    
    window.toggleMobileImageZoom = function(box) {
        if(box.style.width === '150vw') {
            box.style.width = '100vw';
            const imgContainer = box.querySelector('.mobile-img-container');
            if(imgContainer) imgContainer.style.overflowX = 'hidden';
            const img = box.querySelector('img');
            if(img) {
                img.style.objectFit = 'contain';
                img.style.width = '90%';
                img.style.maxWidth = '';
                img.style.cursor = 'zoom-in';
            }
        } else {
            box.style.width = '150vw';
            const imgContainer = box.querySelector('.mobile-img-container');
            if(imgContainer) imgContainer.style.overflowX = 'auto';
            const img = box.querySelector('img');
            if(img) {
                img.style.objectFit = '';
                img.style.width = 'max-content';
                img.style.maxWidth = 'none';
                img.style.cursor = 'zoom-out';
            }
        }
    };

    window.closeMobileSpread = function(btn) {
        document.body.classList.remove('spread-open');
        
        // Find the overlay wrapper and remove it
        let overlay = btn.closest('#unfold-overlay') || btn.parentElement;
        if(overlay) overlay.remove();
        
        // Block ghost-tap: the touch-through from the minus button would otherwise
        // immediately trigger the ARCHIVE toggleMenu beneath it (~300ms delay)
        window._blockMenuToggle = true;
        setTimeout(() => { window._blockMenuToggle = false; }, 400);
        
        document.removeEventListener('keydown', window._spreadEscHandler);
        window.history.pushState({}, '', window.location.pathname);
        if(window.cameFromSearch){ 
            window.cameFromSearch=false; 
            document.body.classList.add('search-open'); 
            document.addEventListener('keydown', window._searchEscHandler); 
        }

        // Restore the tag dial in the filter-bar
        if (window.innerWidth <= 900) {
            filterBar._spreadThumbActive = false;
            filterBar._magDialActive = false;
            generateDynamicTags();
        } else {
            filterBar.style.opacity = '1';
            filterBar.style.pointerEvents = 'auto';
        }
    };

    // Initialize Spread Loader
    document.body.classList.add('loading-spread');
    isSpreadLoading = true;
    spreadDataReady = false;
    loadingProgress = 100;
    loadingColorIndex = 0;
    over.innerHTML = `
        <div class="close-minus" onclick="if(window.closeMobileSpread) window.closeMobileSpread(this); else { document.body.classList.remove('spread-open'); const fb = document.getElementById('filter-bar'); if(fb){ fb.style.opacity='1'; fb.style.pointerEvents='auto'; } this.parentElement.remove(); document.removeEventListener('keydown', window._spreadEscHandler); window.history.pushState({}, '', window.location.pathname); if(window.cameFromSearch){ window.cameFromSearch=false; document.body.classList.add('search-open'); document.addEventListener('keydown', window._searchEscHandler); } }" ontouchstart="if(window.closeMobileSpread) window.closeMobileSpread(this); else { document.body.classList.remove('spread-open'); const fb = document.getElementById('filter-bar'); if(fb){ fb.style.opacity='1'; fb.style.pointerEvents='auto'; } this.parentElement.remove(); document.removeEventListener('keydown', window._spreadEscHandler); window.history.pushState({}, '', window.location.pathname); if(window.cameFromSearch){ window.cameFromSearch=false; document.body.classList.add('search-open'); document.addEventListener('keydown', window._searchEscHandler); } }">–</div>
        
        <div style="position: absolute; top: 8rem; bottom: 4rem; left: 4rem; right: 4rem; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <div id="spread-loading" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
                <div style="position: relative; width: 22rem; display: inline-block;">
                    <img src="assets/images/apollologonextended.png" style="width: 100%; display: block; filter: brightness(0) invert(1) drop-shadow(-1px -1px 2px rgba(0,0,0,0.5)); opacity: 0.9;" alt="Loading Base">
                    <div class="loading-fill-layer" style="position: absolute; inset: 0; background-color: #B24F44; -webkit-mask-image: url('assets/images/apollologonextended.png'); -webkit-mask-size: 100% 100%; -webkit-mask-repeat: no-repeat; clip-path: inset(0 100% 0 0);"></div>
                </div>
            </div>
        </div>
        <div class="right-col-canvas" id="canvas-container" style="opacity: 0; transition: opacity 0.5s;">
            <div class="spread-canvas-content" id="canvas-content" style="position: relative;"></div>
        </div>
        <!-- SHARE BUTTON COMPLETELY REMOVED -->
    `;
    document.body.appendChild(over);

    // Kick off animation loop now that the element is in the DOM
    animateLoadingLogo();

    // Measure exact post-it height dynamically to prevent physics bounding box overflow
    const dummy = document.createElement('div');
    dummy.style.visibility = 'hidden';
    dummy.style.position = 'absolute';
    dummy.style.width = '272px';
    dummy.className = 'bookmark-note spread-note';
    dummy.innerHTML = `
        <img src="assets/images/logo.png" class="stamp-logo">
        <div class="note-ref-code">[ REF: ARC-${p.id.substring(0,6).toUpperCase()} ]</div>
        <div class="note-divider"></div>
        <div class="note-title">${p.metadata.name}</div>
        <div class="note-divider"></div>
        <div class="note-meta-grid">
            ${getNoteGridHtml(p)}
        </div>
        <div class="note-divider"></div>
        <div class="note-text-content" style="display: block; -webkit-line-clamp: unset; overflow: visible;">${p.metadata.description || ''}</div>
    `;
    document.body.appendChild(dummy);
    let exactPostitHeight = dummy.offsetHeight;
    document.body.removeChild(dummy);
    if (!exactPostitHeight || exactPostitHeight < 100) exactPostitHeight = 400;

    // Collect all items
    const allItems = [
        { type: 'postit', p: p },
        { type: 'image', src: p.titleImage, name: "cover drawing", desc: 'cover drawing', audioUrl: p.titleAudio }
    ];
    (p.images || []).forEach((img, i) => {
        let name = "drawing " + (i+1);
        if(img && img.title) name = img.title;
        else if (typeof img === 'string' && img.includes('drive.google.com')) {
            name = "drawing " + (i+1);
        } else if (typeof img === 'string') {
            const parts = img.split('/');
            name = parts[parts.length-1].split('.')[0].replace(/[-_]/g, ' ');
        }
        
        // Ensure we extract the URL string if img is an object
        let imgUrl = typeof img === 'string' ? img : (img.src || '');
        let audioUrl = typeof img === 'string' ? null : (img.audioUrl || null);
        allItems.push({ type: 'image', src: imgUrl, name: name, desc: name, audioUrl: audioUrl });
    });

    // 1. Preload images
    Promise.all(allItems.map(item => {
        if (item.type === 'postit') {
            item.width = 272; // 17rem approx width
            item.height = exactPostitHeight; // Measured exact height
            return Promise.resolve();
        } else {
            return new Promise(resolve => {
                const img = new Image();
                img.src = getSafeImg(item.src);
                img.onload = () => { 
                    item.width = img.naturalWidth || 300; 
                    item.height = img.naturalHeight || 300; 
                    resolve(); 
                };
                img.onerror = () => { 
                    item.width = 300; 
                    item.height = 300; 
                    resolve(); 
                };
            });
        }
    })).then(() => {
        
        // 2. Statistical Analysis & Scaling Rules
        const normalItems = allItems.filter(i => i.type !== 'postit');
        const areas = normalItems.map(i => i.width * i.height).sort((a,b) => a-b);
        const medianArea = areas[Math.floor(areas.length / 2)] || 100000;
        
        normalItems.forEach(item => {
            let targetArea = medianArea * 0.55; // Shrink drawings significantly to give them more room to breathe
            const ar = item.width / item.height;
            const initialScale = Math.sqrt(medianArea / (item.width * item.height));
            
            // Outlier Handling
            if (ar > 1.8 || ar < 0.6 || initialScale < 0.85) {
                targetArea *= 2; 
            }
            
            item.targetWidth = Math.sqrt(targetArea * ar);
            item.targetHeight = item.targetWidth / ar;
            item.rotation = 0;
        });

        // Calculate median target height of images to scale the post-it correctly
        const targetHeights = normalItems.map(i => i.targetHeight).sort((a,b) => a-b);
        const medianTargetHeight = targetHeights[Math.floor(targetHeights.length / 2)] || 400;

        const postitItem = allItems.find(i => i.type === 'postit');
        if (postitItem) {
            // Scale it to 75% of the median vertical edge, using its exact native height.
            postitItem.scaleFactor = Math.max(0.5, (medianTargetHeight / exactPostitHeight) * 0.75);
            
            // Keep physics bounding box matching the scaled visual size
            postitItem.targetWidth = 272 * postitItem.scaleFactor;
            postitItem.targetHeight = exactPostitHeight * postitItem.scaleFactor; 
            postitItem.rotation = 0;
        }

        // 3. Initialize items in a rough grid
        let cols = Math.ceil(Math.sqrt(allItems.length));
        let startX = 0, startY = 0, maxH = 0;
        allItems.forEach((item, i) => {
            if (i > 0 && i % cols === 0) { 
                startX = 0; 
                startY += maxH + 60; 
                maxH = 0; 
            }
            item.x = startX; 
            item.y = startY;
            startX += item.targetWidth + 60;
            maxH = Math.max(maxH, item.targetHeight);
        });
        
        // Center initial cluster roughly at 0,0
        let cx = allItems.reduce((sum, i) => sum + i.x, 0) / allItems.length;
        let cy = allItems.reduce((sum, i) => sum + i.y, 0) / allItems.length;
        allItems.forEach(item => { 
            item.x -= cx; 
            item.y -= cy; 
            item.vx = 0; 
            item.vy = 0; 
        });

        // Calculate dynamic gravity based on project size
        // Normal gravity is 0.003. For projects over 10 items, gravity weakens linearly
        // so massive projects don't crush their centers.
        let gravity = 0.003 * Math.min(1, 10 / allItems.length);

        // 4. Force-Directed Simulation (Relaxation Loop)
        for (let step = 0; step < 150; step++) {
            // Center attraction
            allItems.forEach(item => {
                item.vx -= item.x * gravity;
                item.vy -= item.y * gravity;
            });
            
            // Repulsion
            for (let i = 0; i < allItems.length; i++) {
                for (let j = i + 1; j < allItems.length; j++) {
                    let a = allItems[i], b = allItems[j];
                    let dx = a.x - b.x;
                    let dy = a.y - b.y;
                    
                    if (dx === 0) dx = (Math.random() - 0.5) * 0.1;
                    if (dy === 0) dy = (Math.random() - 0.5) * 0.1;
                    
                    // Maintain hard minimum gap (no overlap allowed, increased spacing)
                    let w = (a.targetWidth + b.targetWidth) / 2 + 140; // 140px gap minimum
                    let h = (a.targetHeight + b.targetHeight) / 2 + 140;
                    
                    if (Math.abs(dx) < w && Math.abs(dy) < h) {
                        let overlapX = w - Math.abs(dx);
                        let overlapY = h - Math.abs(dy);
                        if (overlapX < overlapY) {
                            let push = overlapX * 0.15 * Math.sign(dx);
                            a.vx += push; b.vx -= push;
                        } else {
                            let push = overlapY * 0.15 * Math.sign(dy);
                            a.vy += push; b.vy -= push;
                        }
                    }
                }
            }
            // Integration & Friction
            allItems.forEach(item => {
                item.x += item.vx; 
                item.y += item.vy;
                item.vx *= 0.6; 
                item.vy *= 0.6; 
            });
            
            // Spring force: align Post-It's bottom edge to the Cover Image's bottom edge
            if (allItems.length > 1 && allItems[0].type === 'postit' && allItems[1].type === 'image') {
                let postit = allItems[0];
                let cover = allItems[1];
                let coverVisualBottom = cover.y + cover.targetHeight/2;
                let targetY = coverVisualBottom - postit.targetHeight/2 - 12;
                // Gently pull post-it towards the target Y, physics will push other things out of the way
                postit.vy += (targetY - postit.y) * 0.15;
            }
        }
        
        spreadDataReady = true; // Signal the animation loop that it can stop when it reaches 0%

        // Wait for the logo loading animation to complete its current loop
        const checkDone = setInterval(() => {
            if (loadingProgress <= 0) {
                clearInterval(checkDone);
                isSpreadLoading = false; 
                spreadDataReady = false;

                // 5. Calculate final bounding box and render
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                allItems.forEach(item => {
                    minX = Math.min(minX, item.x - item.targetWidth/2);
                    minY = Math.min(minY, item.y - item.targetHeight/2);
                    maxX = Math.max(maxX, item.x + item.targetWidth/2);
                    maxY = Math.max(maxY, item.y + item.targetHeight/2);
                });

                let contentWidth = maxX - minX;
                let contentHeight = maxY - minY;
                let html = '';
                
                window.currentLightboxGallery = allItems;
                
                if (window.innerWidth <= 900) {
                    const postitItem = allItems.find(i => i.type === 'postit');
                    const imageItems = allItems.filter(i => i.type === 'image');

                    html += '<div class="mobile-project-layout" style="display: flex; flex-direction: column; width: 100vw; height: 100svh; overflow: hidden;">';
                    
                    // Close button floating above everything
                    html += '<div class="close-minus" style="position: absolute; top: 3.5rem; right: 4rem; z-index: 1000000; color: black;" onclick="window.closeMobileSpread(this)" ontouchstart="window.closeMobileSpread(this)">–</div>';

                    // Single horizontal swipe gallery: post-it first, then images
                    html += '<div class="mobile-swipe-gallery" style="flex: 1; height: 100svh; display: flex; overflow-x: auto; scroll-snap-type: x mandatory; align-items: stretch;">';

                    // --- Slide 0: Post-it ---
                    if (postitItem) {
                        window.currentPostitData = postitItem.p;
                        html += `
                        <div class="mobile-gallery-box" style="flex-shrink: 0; scroll-snap-align: center; width: 100vw; height: 100%; min-height: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 0 2rem; box-sizing: border-box; position: relative;">
                            <div class="mobile-postit-wrapper" style="width: 100%; height: 100%; min-height: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; background: transparent;">
                                <div class="bookmark-note spread-note" style="position: relative; width: 90%; max-width: 400px; transform: none; box-shadow: 0 0.5rem 2rem rgba(0,0,0,0.08); padding: 1.5rem; max-height: 100%; display: flex; flex-direction: column; margin-bottom: 1.5rem;">
                                    <div style="overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; z-index: 1; width: 100%; height: 100%; font-size: clamp(0.7rem, 2.5vw, 1rem); word-break: break-word;">
                                        <img src="assets/images/logo.png" class="stamp-logo">
                                        <div class="note-ref-code">[ REF: ARC-${postitItem.p.id.substring(0,6).toUpperCase()} ]</div>
                                        <div class="note-divider"></div>
                                        <div class="note-title" style="word-break: break-word; hyphens: auto;">${postitItem.p.metadata.name}</div>
                                        <div class="note-divider"></div>
                                        <div class="note-meta-grid" style="width: 100%; overflow: hidden;">${getNoteGridHtml(postitItem.p)}</div>
                                        <div class="note-divider"></div>
                                        <div class="note-text-content" style="word-break: break-word;">${postitItem.p.metadata.description || ''}</div>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 1rem; align-items: center; justify-content: center; margin-top: 1rem;">
                                    <button style="cursor: pointer; background: transparent; border: none; font-family: monospace; font-size: 0.9rem; color: #FFF; opacity: 0.7; font-weight: normal; text-transform: none; padding: 0.4rem 0.8rem;" onclick="window.copyProjectUrl('${postitItem.p.id}', this)">share</button>
                                    ${(postitItem.p.metadata.instagram || postitItem.p.metadata['instagram handles']) ? 
                                        `<button style="cursor: pointer; background: transparent; border: none; font-family: monospace; font-size: 0.9rem; color: #FFF; opacity: 0.7; font-weight: normal; text-transform: none; padding: 0.4rem 0.8rem;" onclick="window.revealInstagramHandles(this, '${(postitItem.p.metadata.instagram || postitItem.p.metadata['instagram handles']).replace(/'/g, "\\'")}')">contact</button>` 
                                    : ''}
                                </div>
                            </div>
                        </div>`;
                    }

                    // --- Slides 1…n: Project images ---
                    imageItems.forEach((item, idx) => {
                        const isWide = item.width > item.height * 1.2;
                        html += `
                        <div class="mobile-gallery-box" style="flex-shrink: 0; scroll-snap-align: center; height: 100%; min-height: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 0 2rem; box-sizing: border-box; position: relative; width: 100vw;">
                            <div class="mobile-img-container" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow-x: hidden;" ${isWide ? 'onclick="window.toggleMobileImageZoom(this.parentElement)"' : ''}>
                                <img src="${getSafeImg(item.src)}" alt="${item.name}" style="width: 90%; height: 100%; object-fit: contain; ${isWide ? 'cursor: zoom-in;' : ''}">
                            </div>
                            <div style="position: absolute; bottom: 0; width: 100%; left: 0; padding-bottom: 0.5rem; box-sizing: border-box; display: flex; align-items: center; justify-content: center;">
                                ${item.audioUrl ? `<span class="magazine-audio-btn mag-listen-btn" style="position: absolute; left: 5vw; font-family: 'Ufficio', sans-serif; font-size: 0.9rem; cursor: pointer; text-decoration: none; color: #FFF; opacity: 1;" onclick="event.stopPropagation(); if(typeof toggleMagazineAudio === 'function') toggleMagazineAudio('${item.audioUrl}')">${typeof magAudioState !== 'undefined' ? magAudioState : 'listen'}</span>` : ''}
                                <div class="mobile-img-title" style="font-family: 'Ufficio', sans-serif; font-size: 0.9rem; text-align: center; color: #FFF; opacity: 0.7;">
                                    ${item.name}
                                </div>
                            </div>
                        </div>`;
                    });

                    html += '</div>'; // end swipe gallery
                    html += '</div>'; // end mobile-project-layout

                    const content = document.getElementById('canvas-content');
                    if(content) {
                        content.style.width = '100vw';
                        content.style.height = '100svh';
                        content.style.overflow = 'hidden';
                        content.innerHTML = html;
                    }

                    const loadingMsg = document.getElementById('spread-loading');
                    if(loadingMsg) loadingMsg.remove();
                    document.body.classList.remove('loading-spread');
                    document.getElementById('canvas-container').style.opacity = '1';

                    // --- Thumbnail strip in filter-bar ---
                    // Replaces the tag dial while the spread is open.
                    // Slide 0 = post-it (no thumbnail), slides 1…n = images.
                    if (window.innerWidth <= 900) {
                        window._ignoreFilterBarScroll = Date.now() + 1000;
                        filterBar._spreadThumbActive = true;
                        filterBar._magDialActive = false;
                        filterBar.innerHTML = '';
                        filterBar.scrollLeft = 0;
                        filterBar.classList.remove('tags-collapsed','tags-expanded','hover-expanded','mag-chapters-collapsed','mag-chapters-expanded');

                        const gallery = content.querySelector('.mobile-swipe-gallery');
                        const slides = gallery ? Array.from(gallery.children) : [];

                        allItems.forEach((item, idx) => {
                            if (item.type === 'postit') {
                                return;
                            }
                            
                            const thumb = document.createElement('span');
                            thumb.className = 'tag-filter highlight-link spread-thumb-item';
                            thumb.dataset.slideIndex = idx;
                            thumb.style.cssText = 'padding: 0.5rem 0.6rem !important; display:inline-flex; align-items:center; justify-content:center; overflow:visible; width:3.5rem; height:2.5rem; box-sizing:border-box; margin: 0 0.2rem;';
                            thumb.innerHTML = `<img src="${getSafeImg(item.src)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:0.2rem;display:block;">`;
                            thumb.onclick = () => {
                                const target = slides[idx];
                                if (target && gallery) gallery.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
                            };
                            filterBar.appendChild(thumb);
                        });

                        filterBar.style.opacity = '1';
                        filterBar.style.pointerEvents = 'auto';
                        
                        // Wait a tiny bit for layout, then center the first image (idx=1)
                        setTimeout(() => {
                            const firstImgThumb = filterBar.querySelector('.spread-thumb-item[data-slide-index="1"]');
                            if (firstImgThumb) {
                                window._ignoreFilterBarScroll = Date.now() + 1000;
                                const centerLine = filterBar.offsetWidth / 2;
                                filterBar.scrollLeft = firstImgThumb.offsetLeft + firstImgThumb.offsetWidth / 2 - centerLine;
                            }
                        }, 20);

                        // Sync bracket to currently visible slide
                        const syncThumb = () => {
                            if (!filterBar._spreadThumbActive) return;
                            if (!gallery) return;
                            if (window._ignoreGalleryScroll && Date.now() < window._ignoreGalleryScroll) return;

                            const slideW = gallery.offsetWidth;
                            const scrolled = gallery.scrollLeft;
                            const slideIdx = Math.round(scrolled / slideW); // 0 = post-it slide
                            const thumbs = Array.from(filterBar.querySelectorAll('.spread-thumb-item'));
                            
                            let activeThumb = null;
                            thumbs.forEach((t) => {
                                const targetIdx = parseInt(t.dataset.slideIndex, 10);
                                const isActive = targetIdx === slideIdx && targetIdx !== 0; // Never active for post-it!
                                t.classList.toggle('active-swipe-tag', isActive);
                                if (isActive) activeThumb = t;
                            });

                            if (activeThumb) {
                                const thumbCenter = activeThumb.offsetLeft + activeThumb.offsetWidth / 2;
                                const barCenter = filterBar.offsetWidth / 2;
                                const targetScroll = thumbCenter - barCenter;
                                if (Math.abs(filterBar.scrollLeft - targetScroll) > 5) {
                                    window._ignoreFilterBarScroll = Date.now() + 500;
                                    filterBar.scrollTo({ left: targetScroll, behavior: 'smooth' });
                                }
                            }
                        };

                        if (gallery) {
                            gallery.addEventListener('scroll', syncThumb, { passive: true });
                            // Init: post-it slide is visible, no thumb active yet
                            syncThumb();
                        }
                    }

                    // Do NOT init physics engine
                } else {
                    allItems.forEach(item => {
                        let left = (item.x - item.targetWidth/2) - minX;
                        let top = (item.y - item.targetHeight/2) - minY;
                        let style = `position: absolute; left: ${left}px; top: ${top}px; width: ${item.targetWidth}px; height: ${item.targetHeight}px; transform: rotate(${item.rotation}deg); display: flex; flex-direction: column; align-items: center;`;
                        
                        if (item.type === 'postit') {
                            window.currentPostitData = item.p;
                            const postitIndex = window.currentLightboxGallery.findIndex(g => g.type === 'postit');
                            html += `
                            <div style="${style}">
                                <div class="bookmark-note spread-note" style="position: absolute !important; bottom: 0 !important; margin:0; width:272px; min-width:unset; transform: scale(${item.scaleFactor}); transform-origin: bottom center; cursor: pointer; transition: transform 0.2s;" onclick="openLightbox(${postitIndex}, event)">
                                    <img src="assets/images/logo.png" class="stamp-logo">
                                    <div class="note-ref-code">[ REF: ARC-${item.p.id.substring(0,6).toUpperCase()} ]</div>
                                    <div class="note-divider"></div>
                                    <div class="note-title">${item.p.metadata.name}</div>
                                    <div class="note-divider"></div>
                                    <div class="note-meta-grid">
                                        ${getNoteGridHtml(item.p)}
                                    </div>
                                    <div class="note-divider"></div>
                                    <div class="note-text-content" style="display: block; -webkit-line-clamp: unset; overflow: visible;">${item.p.metadata.description || ''}</div>
                                </div>
                                ${(item.p.metadata.instagram || item.p.metadata['instagram handles']) ? 
                                    `<div onclick="window.revealInstagramHandles(this, '${(item.p.metadata.instagram || item.p.metadata['instagram handles']).replace(/'/g, "\\'")}')" style="position: absolute; top: 100%; margin-top: 1.5rem; width: 100%; text-align: center; font-size: 0.6rem; opacity: 0.6; font-family: monospace; color: inherit; cursor: pointer; pointer-events: auto;">contact</div>` 
                                : ''}
                            </div>`;
                        } else {
                            const imgIndex = window.currentLightboxGallery.findIndex(g => g.src === item.src);
                            html += `
                            <div style="${style}">
                                <div class="unfold-grid-item" style="width:100%; height:auto;">
                                    <img src="${getSafeImg(item.src)}" alt="${item.name}" onclick="openLightbox(${imgIndex}, event)" style="position: relative; z-index: 1; width: 100%; max-height:none; height:auto; object-fit: contain; display: block;">
                                </div>
                                <div style="width: 100%; position: relative; margin-top: 1rem;">
                                    ${item.audioUrl ? `<div style="position: absolute; left: 0; top: 0;"><span class="magazine-audio-btn mag-listen-btn" style="font-family: 'Ufficio', sans-serif; font-size: 0.6rem; cursor: pointer; text-decoration: none; color: black; opacity: 1; pointer-events: auto;" onclick="event.stopPropagation(); if(typeof toggleMagazineAudio === 'function') toggleMagazineAudio('${item.audioUrl}')">${typeof magAudioState !== 'undefined' ? magAudioState : 'listen'}</span></div>` : ''}
                                    <div style="width: 100%; text-align: center; font-size: 0.6rem; opacity: 0.8; font-weight: bold; text-transform: lowercase; font-family: 'Ufficio', sans-serif; color: black; text-shadow: 0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.8); pointer-events: none; padding-top: 0.1rem;">
                                        ${item.name}
                                    </div>
                                </div>
                            </div>`;
                        }
                    });

                    const content = document.getElementById('canvas-content');
                    if(!content) return;
                    content.style.width = `${contentWidth}px`;
                    content.style.height = `${contentHeight}px`;
                    content.innerHTML = html;

                    const loadingMsg = document.getElementById('spread-loading');
                    if(loadingMsg) loadingMsg.remove();
                    document.body.classList.remove('loading-spread');
                    document.getElementById('canvas-container').style.opacity = '1';
                    
                    initSpreadCanvas('canvas-container', 'canvas-content', contentWidth, contentHeight);
                }
            }
        }, 30);
    });
}

