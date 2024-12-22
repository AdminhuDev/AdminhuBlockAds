// Contador global de anúncios bloqueados
let totalAdsBlocked = 0;

// Cria o contador de anúncios
function createAdCounter() {
    const container = document.createElement('div');
    container.className = 'yt-header-controls';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '12px';

    // Contador de anúncios
    const counter = document.createElement('div');
    counter.id = 'ad-counter';
    counter.className = 'yt-header-element';
    counter.innerHTML = `
        <div class="status-dot"></div>
        <span>Anúncios: 0</span>
    `;

    // Controle de volume circular
    const volumeControl = document.createElement('div');
    volumeControl.id = 'volume-control';
    volumeControl.className = 'yt-header-element volume-control';
    volumeControl.innerHTML = `
        <div class="volume-knob">
            <div class="volume-progress"></div>
            <span class="volume-value">100%</span>
        </div>
    `;

    // Adiciona os elementos ao container
    container.appendChild(counter);
    container.appendChild(volumeControl);
    
    // Procura o container de ações do YouTube
    const ytdTopbarMenuContainer = document.querySelector('#end.ytd-masthead');
    if (ytdTopbarMenuContainer) {
        // Insere antes do último elemento (geralmente o avatar do usuário)
        ytdTopbarMenuContainer.insertBefore(container, ytdTopbarMenuContainer.lastChild);
        setupVolumeKnob(volumeControl);
        return container;
    }
    return null;
}

// Função para configurar o controle de volume circular
function setupVolumeKnob(volumeControl) {
    const knob = volumeControl.querySelector('.volume-knob');
    const progress = volumeControl.querySelector('.volume-progress');
    const valueDisplay = volumeControl.querySelector('.volume-value');
    let isDragging = false;
    let currentVolume = 1;

    // Função para atualizar o visual do knob
    function updateKnobVisual(volume) {
        const percentage = Math.round(volume * 100);
        valueDisplay.textContent = `${percentage}%`;
        
        // Define o nível do volume e a cor correspondente
        let volumeLevel;
        if (volume <= 1) {
            volumeLevel = "normal";
        } else if (volume <= 1.5) {
            volumeLevel = "high";
        } else {
            volumeLevel = "danger";
        }
        
        // Atualiza o atributo de nível do volume
        knob.setAttribute('data-volume-level', volumeLevel);
        
        // Calcula o ângulo para o gradiente (360 graus = 200% de volume)
        const degrees = Math.min(360, (volume * 180));
        knob.style.setProperty('--volume-angle', `${degrees}deg`);
    }

    // Função para resetar o volume para 100%
    function resetVolume() {
        if (!isDragging) {
            currentVolume = 1;
            const video = document.querySelector('video');
            if (video) {
                video.volume = currentVolume;
            }
            updateKnobVisual(currentVolume);
            
            knob.classList.add('reset-pulse');
            setTimeout(() => knob.classList.remove('reset-pulse'), 300);
        }
    }

    // Adiciona evento de clique para resetar o volume
    knob.addEventListener('click', (e) => {
        if (!isDragging) {
            resetVolume();
            e.stopPropagation();
        }
    });

    // Adiciona suporte à rolagem do mouse no knob
    knob.addEventListener('wheel', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Calcula o delta do volume (invertido para rolagem natural)
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const video = document.querySelector('video');
        if (video) {
            currentVolume = Math.max(0, Math.min(2, video.volume + delta));
            video.volume = currentVolume;
            updateKnobVisual(currentVolume);
        }
    }, { passive: false });

    // Observa mudanças no volume do vídeo
    const video = document.querySelector('video');
    if (video) {
        // Atualiza o volume inicial
        currentVolume = video.volume;
        updateKnobVisual(currentVolume);

        // Observa mudanças no volume
        video.addEventListener('volumechange', () => {
            if (!isDragging) {
                currentVolume = video.volume;
                updateKnobVisual(currentVolume);
            }
        });
    }
}

// Atualiza o contador de anúncios
function updateAdCounter() {
    const counter = document.getElementById('ad-counter');
    if (counter) {
        counter.querySelector('span').textContent = `Anúncios: ${totalAdsBlocked}`;
    } else {
        // Tenta criar novamente se não existir
        createAdCounter();
    }
}

// Função para remover anúncios
function removeAds() {
    let adsFound = 0;
    
    // Remove os anúncios em vídeo
    const skipButton = document.querySelector('.ytp-ad-skip-button');
    if (skipButton) {
        skipButton.click();
        adsFound++;
        totalAdsBlocked++;
    }

    // Remove anúncios de overlay
    const adOverlay = document.querySelector('.ytp-ad-overlay-close-button');
    if (adOverlay) {
        adOverlay.click();
        adsFound++;
        totalAdsBlocked++;
    }

    // Remove anúncios na página
    const ads = document.querySelectorAll(`
        .ytd-promoted-video-renderer,
        .ytd-promoted-sparkles-web-renderer,
        .ytd-display-ad-renderer,
        .ytd-ad-slot-renderer,
        ytd-in-feed-ad-layout-renderer,
        .ytd-banner-promo-renderer,
        .video-ads.ytp-ad-module,
        .ytp-ad-overlay-container,
        .ytp-ad-text-overlay,
        .ytp-ad-preview-container,
        .ytd-compact-promoted-video-renderer,
        .ytd-promoted-sparkles-text-search-renderer,
        .ytd-player-legacy-desktop-watch-ads-renderer,
        .ytd-watch-next-secondary-results-renderer.sparkles-light-cta,
        .ytd-item-section-renderer.sparkles-light-cta,
        [layout="display-ad-layout-renderer"],
        [id="player-ads"],
        [id="masthead-ad"]
    `);
    
    if (ads.length > 0) {
        ads.forEach(ad => ad.remove());
        adsFound += ads.length;
        totalAdsBlocked += ads.length;
    }

    // Remove elementos de anúncio específicos
    const adElements = [
        'ytd-promoted-sparkles-web-renderer',
        'ytd-display-ad-renderer',
        'ytd-ad-slot-renderer',
        'ytd-in-feed-ad-layout-renderer',
        'ytd-banner-promo-renderer'
    ];

    adElements.forEach(selector => {
        const elements = document.getElementsByTagName(selector);
        if (elements.length > 0) {
            Array.from(elements).forEach(element => {
                element.remove();
                adsFound++;
                totalAdsBlocked++;
            });
        }
    });

    // Atualiza o contador
    if (adsFound > 0) {
    updateAdCounter();
        // Salva o estado
        chrome.storage.local.set({ totalAdsBlocked });
    }
}

// Função para tentar inserir o contador periodicamente até conseguir
function tryInsertCounter() {
    if (!document.getElementById('ad-counter')) {
        const counter = createAdCounter();
        if (!counter) {
            // Se não conseguiu inserir, tenta novamente em 1 segundo
            setTimeout(tryInsertCounter, 1000);
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Tenta inserir o contador
    tryInsertCounter();
    
    // Configura o observer para monitorar mudanças na página
    const observer = new MutationObserver(removeAds);
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Remove anúncios iniciais
    removeAds();
    
    // Salva o estado
    chrome.storage.local.set({ totalAdsBlocked });
});

// Função para modificar o volume máximo do player
function modifyVolumeControl() {
    // Aguarda o player do YouTube estar pronto
    const observer = new MutationObserver((mutations, obs) => {
        const player = document.querySelector('video');
        const playerContainer = document.querySelector('.html5-video-player');
        if (player && playerContainer) {
            // Remove a limitação de volume
            let currentVolume = player.volume;
            let audioContext = null;
            let gainNode = null;
            let source = null;
            
            // Função para inicializar o contexto de áudio
            function initAudioContext() {
                if (!audioContext) {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    source = audioContext.createMediaElementSource(player);
                    gainNode = audioContext.createGain();
                    source.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                }
            }
            
            // Função para aplicar o volume real
            function applyVolume(volume) {
                // Limita entre 0 e 2 (0% a 200%)
                currentVolume = Math.max(0, Math.min(2, volume));
                
                try {
                    // Se o volume for maior que 100%, usa o contexto de áudio
                    if (currentVolume > 1) {
                        initAudioContext();
                        // Define o volume do player para 100%
                        Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume')
                            .set.call(player, 1);
                        // Aplica o ganho para aumentar o volume acima de 100%
                        if (gainNode) {
                            gainNode.gain.setValueAtTime(currentVolume, audioContext.currentTime);
                        }
                    } else {
                        // Para volumes até 100%, usa o controle normal
                        if (gainNode) {
                            gainNode.gain.setValueAtTime(1, audioContext.currentTime);
                        }
                        Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume')
                            .set.call(player, currentVolume);
                    }
                } catch (e) {
                    console.log('Erro ao aplicar volume:', e);
                    // Fallback: aplica o volume normalizado
                    Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume')
                        .set.call(player, Math.min(1, currentVolume));
                }
                
                // Atualiza o display e dispara evento
                updateVolumeDisplay(currentVolume);
                player.dispatchEvent(new Event('volumechange'));
            }
            
            // Sobrescreve a propriedade volume
            Object.defineProperty(player, 'volume', {
                get: function() {
                    return currentVolume;
                },
                set: function(v) {
                    applyVolume(v);
                    return true;
                }
            });
            
            // Adiciona indicador de volume flutuante
            let volumeIndicator = document.createElement('div');
            volumeIndicator.className = 'volume-indicator';
            document.body.appendChild(volumeIndicator);
            
            // Função para atualizar o display de volume
            function updateVolumeDisplay(volume) {
                const percentage = Math.round(volume * 100);
                volumeIndicator.textContent = `Volume: ${percentage}%`;
                volumeIndicator.classList.add('visible');
                
                // Posiciona o indicador no centro do player
                const rect = playerContainer.getBoundingClientRect();
                volumeIndicator.style.left = `${rect.left + (rect.width / 2) - (volumeIndicator.offsetWidth / 2)}px`;
                volumeIndicator.style.top = `${rect.top + 20}px`;
                
                // Esconde o indicador após 1.5 segundos
                clearTimeout(window.volumeTimeout);
                window.volumeTimeout = setTimeout(() => {
                    volumeIndicator.classList.remove('visible');
                }, 1500);
            }
            
            // Adiciona suporte à rolagem do mouse em todo o player
            document.addEventListener('wheel', function(e) {
                if (e.ctrlKey && e.shiftKey) {
                    const target = e.target;
                    if (playerContainer.contains(target) || target === playerContainer) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Calcula o delta do volume (invertido para rolagem natural)
                        const delta = e.deltaY < 0 ? 0.05 : -0.05;
                        applyVolume(currentVolume + delta);
                    }
                }
            }, { passive: false, capture: true });
            
            // Atualiza o texto do volume no controle padrão do YouTube
            const volumePanel = document.querySelector('.ytp-volume-panel');
            if (volumePanel) {
                const updateVolumeText = () => {
                    const percentage = Math.round(currentVolume * 100);
                    volumePanel.setAttribute('aria-valuenow', percentage);
                    volumePanel.setAttribute('aria-valuetext', `${percentage}% volume`);
                };
                
                // Observa mudanças no volume
                player.addEventListener('volumechange', updateVolumeText);
            }
            
            obs.disconnect();
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}

// Inicia a modificação do volume
modifyVolumeControl();

// Adiciona atalhos de teclado para controle de volume
document.addEventListener('keydown', function(e) {
    const player = document.querySelector('video');
    if (player) {
        // Aumenta o volume (Seta para cima)
        if (e.key === 'ArrowUp' && e.ctrlKey) {
            e.preventDefault();
            player.volume = Math.min(2, player.volume + 0.1);
        }
        // Diminui o volume (Seta para baixo)
        if (e.key === 'ArrowDown' && e.ctrlKey) {
            e.preventDefault();
            player.volume = Math.max(0, player.volume - 0.1);
        }
    }
});

// Função para bloquear anúncios
function blockAds() {
    // Lista atualizada de seletores de anúncios
    const adSelectors = [
        // Anúncios no player de vídeo
        '.video-ads',
        '.ytp-ad-module',
        '.ytp-ad-overlay-container',
        '.ytp-ad-skip-button-container',
        '.ytp-ad-preview-container',
        '.ytp-ad-preview-slot',
        '.ytp-ad-text-overlay',
        '.ytp-ad-player-overlay',
        '.ytp-ad-player-overlay-instream-info',
        '.ytp-ad-player-overlay-skip-or-preview',
        '.ytp-ad-feedback-dialog-container',
        'div[id^="player-ads"]',
        'div[id^="ad_creative"]',
        '.html5-video-player[ad-showing]',
        '.html5-video-player.ad-showing',
        '.html5-video-player.ad-interrupting',
        
        // Anúncios na página
        '.ytd-promoted-video-renderer',
        '.ytd-promoted-sparkles-web-renderer',
        '.ytd-display-ad-renderer',
        '.ytd-ad-slot-renderer',
        '.ytd-in-feed-ad-layout-renderer',
        '.ytd-banner-promo-renderer',
        '.ytd-companion-slot-renderer',
        '.ytd-action-companion-ad-renderer',
        '.ytd-player-legacy-desktop-watch-ads-renderer',
        '.ytd-rich-item-renderer[is-ad]',
        '.ytd-compact-promoted-video-renderer',
        '.ytd-promoted-sparkles-text-search-renderer',
        '.ytd-watch-next-secondary-results-renderer.sparkles-light-cta',
        '.ytd-item-section-renderer.sparkles-light-cta',
        
        // Novos seletores específicos
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
        'ytd-merch-shelf-renderer',
        '.ytd-video-masthead-ad-v3-renderer',
        '.ytd-primetime-promo-renderer',
        'ytd-statement-banner-renderer',
        'ytd-in-feed-ad-layout-renderer',
        'ytd-ad-slot-renderer',
        
        // Anúncios por atributo
        '[layout="display-ad-layout-renderer"]',
        '[id="player-ads"]',
        '[id="masthead-ad"]',
        '[id^="google_ads_"]',
        '[id*="google_ads_iframe"]',
        '[id*="adunit"]'
    ];

    // Remove todos os elementos de anúncio encontrados
    adSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.remove();
        });
    });

    // Tratamento específico para o player de vídeo
    const video = document.querySelector('video');
    if (video) {
        const player = document.querySelector('.html5-video-player');
        if (player) {
            // Verifica múltiplas condições que indicam anúncio
            const isAd = player.classList.contains('ad-showing') || 
                        player.classList.contains('ad-interrupting') ||
                        document.querySelector('.ytp-ad-player-overlay') ||
                        document.querySelector('.ytp-ad-skip-button') ||
                        document.querySelector('.video-ads') ||
                        player.getAttribute('class')?.includes('ad-showing') ||
                        video.src?.includes('googlevideo.com/videoplayback') ||
                        document.querySelector('.ytp-ad-text-overlay');

            if (isAd) {
                try {
                    // Remove classes relacionadas a anúncios
                    player.classList.remove('ad-showing', 'ad-interrupting');
                    player.removeAttribute('ad-showing');
                    
                    // Força o fim do anúncio
                    if (video.duration) {
                        video.currentTime = video.duration;
                    }
                    
                    // Tenta pular o anúncio de várias formas
                    const skipButtons = document.querySelectorAll('.ytp-ad-skip-button, .ytp-ad-skip-button-modern');
                    skipButtons.forEach(button => button.click());
                    
                    // Remove overlays de anúncio
                    const overlays = document.querySelectorAll('.ytp-ad-overlay-container, .ytp-ad-overlay-slot');
                    overlays.forEach(overlay => overlay.remove());
                    
                    // Força a reprodução do vídeo principal
                    video.play();
                    
                    // Incrementa o contador
                    totalAdsBlocked++;
                    updateAdCounter();
                    
                    // Salva o estado
                    chrome.storage.local.set({ totalAdsBlocked });
                } catch (e) {
                    console.log('Erro ao pular anúncio:', e);
                }
            }
        }
    }
}

// Função para observar mudanças na página
function observePageChanges() {
    // Observer principal para mudanças na página
    const pageObserver = new MutationObserver((mutations) => {
        blockAds();
    });

    // Observer específico para o player de vídeo
    const videoObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' || mutation.type === 'childList') {
                const target = mutation.target;
                if (target.classList?.contains('ad-showing') ||
                    target.classList?.contains('ad-interrupting') ||
                    target.getAttribute('ad-showing') === 'true' ||
                    target.querySelector('.ytp-ad-player-overlay')) {
                    blockAds();
                }
            }
        });
    });

    // Observa mudanças em todo o documento
    pageObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'src', 'style']
    });

    // Observa especificamente o player de vídeo
    const videoPlayer = document.querySelector('.html5-video-player');
    if (videoPlayer) {
        videoObserver.observe(videoPlayer, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['class', 'ad-showing', 'src']
        });
    }
}

// Executa o bloqueio de anúncios quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    observePageChanges();
});

// Executa o bloqueio de anúncios quando a URL muda (navegação entre vídeos)
let lastUrl = location.href;
let lastUrlCheck = Date.now();
const URL_CHECK_INTERVAL = 15000; // 15 segundos

new MutationObserver(() => {
    const now = Date.now();
    const url = location.href;
    if (url !== lastUrl && now - lastUrlCheck >= URL_CHECK_INTERVAL) {
        lastUrl = url;
        lastUrlCheck = now;
        blockAds();
    }
}).observe(document, {subtree: true, childList: true});
 