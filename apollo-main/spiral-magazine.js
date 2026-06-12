window.createSpiralMagazine = function(issue, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'issue-container mag-tube-wrapper';
    
    // Flat cover image (hidden initially)
    const coverImg = document.createElement('img');
    coverImg.className = 'flat-cover-img';
    coverImg.src = getSafeImg(issue.images[0]);
    wrapper.appendChild(coverImg);
    
    // Canvas for spiral render
    const canvas = document.createElement('canvas');
    const cw = 600;
    const ch = 600;
    canvas.width = cw;
    canvas.height = ch;
    canvas.className = 'spiral-canvas';
    wrapper.appendChild(canvas);
    
    // Gradient shadow overlay
    const shadow = document.createElement('div');
    shadow.className = 'spiral-shadow';
    wrapper.appendChild(shadow);
    
    // Title
    const title = document.createElement('div');
    title.className = 'mag-tube-title';
    title.innerText = issue.title || `Issue ${index + 1}`;
    wrapper.appendChild(title);
    
    // Render spiral logic
    const srcImg = new Image();
    srcImg.onload = () => {
        renderSpiral(canvas, srcImg);
    };
    srcImg.src = getSafeImg(issue.images[0]);
    
    // Interaction State
    let hoverTimer = null;
    let isUnrolled = false;
    
    wrapper.onmouseenter = () => {
        if (window.innerWidth <= 900) return;
        
        hoverTimer = setTimeout(() => {
            isUnrolled = true;
            
            // FLIP-like fixed position calculation via translation
            const rect = wrapper.getBoundingClientRect();
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            
            const tx = cx - (rect.left + rect.width / 2);
            const ty = cy - (rect.top + rect.height / 2);
            
            wrapper.style.setProperty('--tx', `${tx}px`);
            wrapper.style.setProperty('--ty', `${ty}px`);
            
            wrapper.classList.add('is-active');
            
            // Remove from background pile z-index stack temporarily
            wrapper.style.zIndex = '9999';
        }, 1000);
    };
    
    wrapper.onmouseleave = () => {
        if (window.innerWidth <= 900) return;
        clearTimeout(hoverTimer);
        if (isUnrolled) {
            isUnrolled = false;
            wrapper.classList.remove('is-active');
            setTimeout(() => {
                if (!isUnrolled) wrapper.style.zIndex = '';
            }, 600); // Wait for transition
        }
    };
    
    wrapper.onclick = (e) => {
        if (window.innerWidth <= 900) {
            if (!isUnrolled) {
                // Mobile unroll
                document.querySelectorAll('.issue-container.is-active').forEach(el => {
                    el.classList.remove('is-active');
                    el.style.zIndex = '';
                });
                
                isUnrolled = true;
                const rect = wrapper.getBoundingClientRect();
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2;
                wrapper.style.setProperty('--tx', `${cx - (rect.left + rect.width / 2)}px`);
                wrapper.style.setProperty('--ty', `${cy - (rect.top + rect.height / 2)}px`);
                
                wrapper.style.zIndex = '9999';
                wrapper.classList.add('is-active');
                
                const outsideClick = (ev) => {
                    if (!wrapper.contains(ev.target)) {
                        wrapper.classList.remove('is-active');
                        isUnrolled = false;
                        setTimeout(() => wrapper.style.zIndex = '', 600);
                        document.removeEventListener('touchstart', outsideClick);
                    }
                };
                setTimeout(() => document.addEventListener('touchstart', outsideClick), 50);
                return;
            }
        }
        
        // Always open magazine on click (desktop, or if already unrolled on mobile)
        openMagazine(index);
    };
    
    return wrapper;
};

function renderSpiral(canvas, img) {
    const ctx = canvas.getContext('2d', { alpha: true });
    // Keep canvas resolution high to contain the fanned-out structure
    canvas.width = 1100;
    canvas.height = 1100;
    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    
    // Shift coordinate system to center
    ctx.save();
    // Move slightly down to visually center the "e" shape
    ctx.translate(cw/2, ch/2 + 20);
    
    // 1. Core Simulation Parameters
    const totalPages = 60; // Standardized page count
    const pixelWidth = img.width;
    const k = 1.4;    // Base Curve parameters (The "e" core shape)
    const R0 = 15; // Core turn radius
    const t_spine_start = -1.5; // Shorter straight spine (keeps it safely tucked inside the hollow core)
    
    // 2. Control Points & Tension Gaps (The "Play")
    const numControlPoints = 30; // Control points distributed along the arc
    const pagesData = [];
    
    // Group pages into chunks/signatures for realistic buckling
    const groupSize = Math.floor(4 + Math.random() * 5); // Packs of 4 to 8 pages
    const numGroups = Math.ceil(totalPages / groupSize);
    const macroGaps = [];
    
    for (let g = 0; g < numGroups; g++) {
        let gaps = [];
        for (let j = 0; j < numControlPoints; j++) {
            // 35% chance for a dramatic structural gap BETWEEN groups
            if (Math.random() < 0.35) {
                gaps[j] = Math.random() * 8.0 + 2.0; // 2px to 10px dramatic buckle
            } else {
                gaps[j] = 0;
            }
        }
        macroGaps.push(gaps);
    }
    
    for (let i = 0; i < totalPages; i++) {
        let gaps = [];
        let isFirstInGroup = (i % groupSize === 0);
        let groupIdx = Math.floor(i / groupSize);
        
        for (let j = 0; j < numControlPoints; j++) {
            let totalLocalGap = 0;
            
            // Apply the dramatic macro gap ONLY to the first page of the group
            // This forces the entire group of pages to follow this large distortion together
            if (isFirstInGroup && i > 0) { 
                totalLocalGap += macroGaps[groupIdx][j];
            }
            
            // Add tiny micro-distortions to every individual page (breathing room within the group)
            if (Math.random() < 0.40) {
                totalLocalGap += Math.random() * 1.5; 
            }
            
            gaps[j] = totalLocalGap;
        }
        pagesData.push({ gaps, path: [] });
    }
    
    // Cosine interpolation for organic, smooth cascading distortions
    function getGap(i, t) {
        if (t < 0) return 0; // Rigid glued spine has no air gaps
        const interval = Math.PI / 2;
        let idx = Math.floor(t / interval);
        let frac = (t % interval) / interval;
        if (idx >= numControlPoints - 1) return pagesData[i].gaps[numControlPoints - 1];
        let a = pagesData[i].gaps[idx];
        let b = pagesData[i].gaps[idx+1];
        let w = (1 - Math.cos(frac * Math.PI)) / 2;
        return a * (1 - w) + b * w;
    }
    
    // Calculate the cumulative offset distance D_i(t)
    function getOffset(i, t) {
        if (i === 0) return 0;
        let offset = 0;
        for (let p = 1; p <= i; p++) {
            offset += k + getGap(p, t);
        }
        return offset;
    }


    // CRITICAL FIX: The base curve must expand by exactly the total bundle thickness per rotation.
    // If it expands slower, the rotations will crash into each other and swallow the spiral effect.
    let maxBundleThickness = 0;
    for (let t = 0; t <= Math.PI * 4; t += 0.5) {
        let off = getOffset(totalPages - 1, t);
        if (off > maxBundleThickness) maxBundleThickness = off;
    }
    const V = maxBundleThickness / (2 * Math.PI); // Perfect geometric spiral stacking velocity

    // 3. Parametric Base Curve & Normal Offset
    function getPagePoint(i, t) {
        let x, y, dx, dy;
        
        // Base curve C(t)
        if (t < 0) {
            // Straight spine segment
            x = R0 + t * V;
            y = t * R0;
            dx = V;
            dy = R0;
        } else {
            // Archimedean spiral segment
            x = (R0 + V * t) * Math.cos(t);
            y = (R0 + V * t) * Math.sin(t);
            dx = V * Math.cos(t) - (R0 + V * t) * Math.sin(t);
            dy = V * Math.sin(t) + (R0 + V * t) * Math.cos(t);
        }
        
        // Compute outward normal vector
        let len = Math.sqrt(dx * dx + dy * dy);
        let nx = dy / len;
        let ny = -dx / len;
        
        let offset = getOffset(i, t);
        
        return {
            x: x + nx * offset,
            y: y + ny * offset,
            nx: nx,
            ny: ny
        };
    }
    
    // 4. Arc Length Integration & Fanned Keil
    // Target ~1.6 rotations for the outermost cover page to decouple keil from spine
    let L_target = 0;
    let t_end_approx = 1.6 * 2 * Math.PI;
    let prev_P_target = getPagePoint(totalPages - 1, t_spine_start);
    
    for (let t = t_spine_start + 0.02; t <= t_end_approx; t += 0.02) {
        let pt = getPagePoint(totalPages - 1, t);
        let dx = pt.x - prev_P_target.x;
        let dy = pt.y - prev_P_target.y;
        L_target += Math.sqrt(dx*dx + dy*dy);
        prev_P_target = pt;
    }
    
    // Iteratively trace every page's exact offset curve until it reaches the constant physical length
    for (let i = 0; i < totalPages; i++) {
        let s = 0;
        let t = t_spine_start;
        let prev_P = getPagePoint(i, t);
        pagesData[i].path.push({ ...prev_P, t: t, s: 0 });
        
        t += 0.02;
        while (s < L_target) {
            let pt = getPagePoint(i, t);
            let dx = pt.x - prev_P.x;
            let dy = pt.y - prev_P.y;
            s += Math.sqrt(dx*dx + dy*dy);
            pagesData[i].path.push({ ...pt, t: t, s: s });
            prev_P = pt;
            t += 0.02;
        }
    }
    
    // 5. Render Inner Pages (0 to totalPages - 2)
    ctx.lineWidth = k * 1.5; // Thicker to overlap slightly
    ctx.lineCap = 'butt';
    
    for (let i = 0; i < totalPages - 1; i++) {
        ctx.beginPath();
        let path = pagesData[i].path;
        ctx.moveTo(path[0].x, path[0].y);
        
        for (let j = 1; j < path.length; j++) {
            ctx.lineTo(path[j].x, path[j].y);
        }
        
        let shade = 230 + Math.random() * 12;
        ctx.strokeStyle = `rgb(${shade}, ${shade}, ${shade - 3})`;
        ctx.stroke();
    }
    
    // --- THE SPINE BINDING ---
    // Draw the structural line across the flat starting cut of the paper stack
    ctx.beginPath();
    ctx.moveTo(pagesData[0].path[0].x, pagesData[0].path[0].y);
    ctx.lineTo(pagesData[totalPages - 1].path[0].x, pagesData[totalPages - 1].path[0].y);
    ctx.lineWidth = 3; 
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#d4d4d4'; 
    ctx.stroke();
    
    // 6. Render The Cover (Page N-1)
    const drawH = 120; // Fixed stretch distance outwards
    const imgH = img.height;
    ctx.imageSmoothingEnabled = false; 

    const coverPath = pagesData[totalPages - 1].path;
    const totalS = coverPath[coverPath.length - 1].s;

    // Map the 0..pixelWidth of the JPG to the exact 0..totalS arc length of the outer offset path
    for (let px = 0; px < pixelWidth; px++) {
        let targetS = (px / pixelWidth) * totalS;
        
        // Find closest point in the integrated path
        let closest = coverPath[0];
        let minDiff = Infinity;
        for (let pt of coverPath) {
            let diff = Math.abs(pt.s - targetS);
            if (diff < minDiff) {
                minDiff = diff;
                closest = pt;
            }
        }
        
        // Tangent angle is computed from the normal vector of the offset curve
        let tangent = Math.atan2(closest.nx, -closest.ny);
        
        ctx.save();
        ctx.translate(closest.x, closest.y);
        ctx.rotate(tangent);
        
        // Draw 1px slice radially OUTWARDS (negative Y in tangent space)
        ctx.drawImage(img, px, 0, 1, imgH, 0, -drawH, 1.5, drawH);
        
        ctx.restore();
    }
    
    ctx.restore(); // Restore center shift
}
