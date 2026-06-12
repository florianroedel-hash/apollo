window.checkMobileTutorial = function() {
    if (window.innerWidth > 900) return; // Only on mobile
    if (sessionStorage.getItem('apolloTutorialSeen')) return; // Only once per visit
    sessionStorage.setItem('apolloTutorialSeen', 'true');

    const tut = document.createElement('div');
    tut.id = 'mobile-tutorial-overlay';
    tut.innerHTML = `
        <style>
            #mobile-tutorial-overlay {
                position: fixed; inset: 0; z-index: 1000000;
                background: rgba(0,0,0,0.6); backdrop-filter: blur(2px);
                color: white; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
                overflow: hidden; pointer-events: auto;
                animation: fadeIn 0.5s ease forwards;
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            
            .tut-dashed { position: absolute; border: 1.5px dashed rgba(255,255,255,0.7); pointer-events: none; border-radius: 4px; }
            .tut-label { position: absolute; font-size: 0.65rem; line-height: 1.4; text-transform: uppercase; text-shadow: 0 1px 4px rgba(0,0,0,0.9); font-weight: 500; letter-spacing: 0.5px; }
            .tut-line { position: absolute; background: rgba(255,255,255,0.6); }

            /* Header + */
            .tut-box-menu { top: 2.5rem; right: 6vw; width: 2.5rem; height: 2.5rem; border: none; }
            .tut-plus-h { position: absolute; top: 50%; left: 0; width: 100%; border-top: 1.5px dashed rgba(255,255,255,0.9); transform: translateY(-50%); }
            .tut-plus-v { position: absolute; top: 0; left: 50%; height: 100%; border-left: 1.5px dashed rgba(255,255,255,0.9); transform: translateX(-50%); }
            .tut-label-menu { top: 5.5rem; right: 8vw; text-align: right; }
            .tut-line-menu { top: 4.8rem; right: 7vw; width: 1.5px; height: 0.8rem; }

            /* Tag dial */
            .tut-label-dial { bottom: 2.5rem; left: 50%; transform: translateX(-50%); text-align: center; width: 100%; font-size: 0.8rem; letter-spacing: 1px; }

            /* Stack */
            .tut-box-stack { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 68vw; height: 95vw; }
            .tut-label-stack { top: 2.5rem; left: 50%; transform: translateX(-50%); width: 100%; text-align: center; }
            
            /* Circle */
            .tut-box-circle { bottom: 3.5rem; left: 43%; transform: translateX(-50%); width: 2.5rem; height: 2.5rem; border-radius: 50%; border: 1.5px dashed rgba(255,255,255,0.9); }
            .tut-label-circle { bottom: 7rem; left: 43%; transform: translateX(-50%); width: 150%; text-align: center; }
            .tut-line-circle { bottom: 6rem; left: 43%; transform: translateX(-50%); width: 1.5px; height: 0.8rem; }

            /* Greeting */
            .tut-greeting {
                position: absolute; top: calc(50% + 47.5vw + 1.5rem); left: 8vw; width: 84vw;
                background: transparent; color: white;
                padding: 0; border-radius: 0; font-size: 0.75rem; line-height: 1.5;
                box-shadow: none; text-transform: none; text-shadow: 0 1px 4px rgba(0,0,0,0.9);
                box-sizing: border-box; font-weight: 500; text-align: center;
            }
        </style>
        
        <!-- Dashed Boxes -->
        <div class="tut-dashed tut-box-menu">
            <div class="tut-plus-h"></div>
            <div class="tut-plus-v"></div>
        </div>
        
        <!-- Stack container for relative positioning -->
        <div class="tut-dashed tut-box-stack" style="border:none;">
            <div class="tut-dashed" style="inset:0; border: 1.5px dashed rgba(255,255,255,0.7); border-radius: 4px;"></div>
            <div class="tut-label tut-label-stack">click here to<br>see next project</div>
            
            <div class="tut-dashed tut-box-circle"></div>
            <div class="tut-label tut-label-circle">click circle to<br>open project</div>
            <div class="tut-line tut-line-circle"></div>
        </div>

        <!-- Lines and Labels -->
        <div class="tut-line tut-line-menu"></div>
        <div class="tut-label tut-label-menu">click + for<br>more options</div>

        <div class="tut-label tut-label-dial">← swipe here →</div>

        <div class="tut-label" style="top: 50%; left: 3vw; transform: translateY(-50%); font-size: 1.2rem;">←</div>
        <div class="tut-label" style="top: 50%; left: 7vw; transform: translateY(-50%) rotate(180deg); writing-mode: vertical-rl;">calendar</div>

        <div class="tut-label" style="top: 50%; right: 3vw; transform: translateY(-50%); font-size: 1.2rem;">→</div>
        <div class="tut-label" style="top: 50%; right: 7vw; transform: translateY(-50%); writing-mode: vertical-rl;">magazine</div>

        <div class="tut-greeting">
            thank you for visiting our website, thank you for your interest in apollo, we are really proud and also we are no webdesigners - thanks for not getting angry if there is a bug and even better if you tell us there is one - you can just send a dm on instagram, there is no form needed - the apollo team
        </div>
    `;
    
    tut.onclick = function() {
        tut.style.animation = 'fadeOut 0.4s ease forwards';
        setTimeout(() => tut.remove(), 400);
    };
    
    // Add fadeOut keyframes if not exists
    if (!document.getElementById('tut-fadeout')) {
        const fadeOutStyle = document.createElement('style');
        fadeOutStyle.id = 'tut-fadeout';
        fadeOutStyle.innerHTML = '@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }';
        document.head.appendChild(fadeOutStyle);
    }
    
    document.body.appendChild(tut);
};
