// Variáveis globais
let totalAdsBlocked = 0;
let adCounterElement = null;
let volumeKnobElement = null;
let audioContext = null;
let gainNode = null;
let mediaSource = null;
let lastUpdate = 0;

// Função para criar elementos
function createElement(tag, className, innerHTML = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
}

// Função para inicializar áudio (chamada apenas quando necessário)
function initAudioContext(video) {
    if (!audioContext && video) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            mediaSource = audioContext.createMediaElementSource(video);
            gainNode = audioContext.createGain();
            mediaSource.connect(gainNode);
            gainNode.connect(audioContext.destination);
        } catch (e) {
            console.error('Erro ao inicializar áudio:', e);
        }
    }
}

// Função otimizada para aplicar volume
function applyVolume(video, volume) {
    if (!video) return;
    
    // Limita atualizações (a cada 50ms)
    const now = Date.now();
    if (now - lastUpdate < 50) return;
    lastUpdate = now;

    try {
        if (volume <= 100) {
            video.volume = volume / 100;
            if (gainNode) gainNode.gain.value = 1;
        } else {
            if (!audioContext) initAudioContext(video);
            if (gainNode) {
                video.volume = 1;
                gainNode.gain.value = volume / 100;
            }
        }
    } catch (e) {
        console.error('Erro ao aplicar volume:', e);
    }
}

// Função para inserir contador
function insertCounter() {
    if (adCounterElement) return;

    const container = createElement('div', 'yt-header-controls');
    const counter = createElement('div', 'yt-header-element');
    counter.id = 'ad-counter';
    counter.innerHTML = '<div class="status-dot"></div><span>Anúncios: 0</span>';

    const volumeControl = createElement('div', 'yt-header-element volume-control');
    volumeControl.id = 'volume-control';
    volumeControl.innerHTML = `
        <div class="volume-knob">
            <div class="volume-progress"></div>
            <span class="volume-value">100%</span>
        </div>
    `;

    container.append(counter, volumeControl);
    
    const ytdTopbarMenuContainer = document.querySelector('#end.ytd-masthead');
    if (ytdTopbarMenuContainer) {
        ytdTopbarMenuContainer.insertBefore(container, ytdTopbarMenuContainer.lastChild);
        setupVolumeKnob(volumeControl);
        adCounterElement = container;
    }
}

// Configuração otimizada do controle de volume
function setupVolumeKnob(volumeControl) {
    if (!volumeControl) return;

    const knob = volumeControl.querySelector('.volume-knob');
    const progress = volumeControl.querySelector('.volume-progress');
    const valueDisplay = volumeControl.querySelector('.volume-value');
    
    if (!knob || !progress || !valueDisplay) return;

    let currentRotation = 0;
    let currentVolume = 100;

    // Atualiza a interface do usuário
    function updateUI() {
        progress.style.transform = `rotate(${currentRotation}deg)`;
        valueDisplay.textContent = `${currentVolume}%`;
    }

    // Configura apenas o evento de rolagem do mouse
    knob.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -5 : 5;
        currentVolume = Math.max(0, Math.min(200, currentVolume + delta));
        currentRotation = (currentVolume * 1.8) - 180;
        
        const video = document.querySelector('video');
        if (video) applyVolume(video, currentVolume);
        
        updateUI();
    });

    volumeKnobElement = knob;
}

// Função throttle para limitar chamadas de função
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Função otimizada para remover anúncios
function removeAds() {
    const adSelectors = [
        '.video-ads',
        '.ytp-ad-module',
        '.ytp-ad-overlay-container',
        '.ytp-ad-skip-button-container',
        '.ytp-ad-preview-container',
        '.ytd-promoted-video-renderer',
        '.ytd-display-ad-renderer',
        '.ytd-ad-slot-renderer'
    ].join(',');

    const adElements = document.querySelectorAll(adSelectors);
    let adsRemoved = false;

    adElements.forEach(ad => {
        ad.remove();
        adsRemoved = true;
    });

    const video = document.querySelector('video');
        const player = document.querySelector('.html5-video-player');
    
    if (video && player && (
        player.classList.contains('ad-showing') || 
        document.querySelector('.ytp-ad-skip-button')
    )) {
        const skipButton = document.querySelector('.ytp-ad-skip-button');
        if (skipButton) {
            skipButton.click();
            adsRemoved = true;
        } else if (video.duration) {
                        video.currentTime = video.duration;
            adsRemoved = true;
        }
    }

    if (adsRemoved) {
                    totalAdsBlocked++;
        updateCounter(totalAdsBlocked);
    }
}

// Função para atualizar contador
function updateCounter(count) {
    const counter = document.querySelector('#ad-counter span');
    if (counter) {
        counter.textContent = `Anúncios: ${count}`;
        chrome.storage.local.set({ totalAdsBlocked: count });
    }
}

// Observer otimizado
const observer = new MutationObserver(throttle(() => {
    if (!document.querySelector('#ad-counter')) {
        insertCounter();
    }
    removeAds();
}, 1000));

// Inicia observação com configuração otimizada
observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    insertCounter();
    removeAds();
    
    chrome.storage.local.get(['totalAdsBlocked'], (result) => {
        if (result.totalAdsBlocked) {
            totalAdsBlocked = result.totalAdsBlocked;
            updateCounter(totalAdsBlocked);
            }
        });
    });

// Limpa recursos ao desmontar
window.addEventListener('unload', () => {
    if (volumeKnobElement) {
        volumeKnobElement.removeEventListener('mousedown', null);
        document.removeEventListener('mousemove', null);
        document.removeEventListener('mouseup', null);
    }
    if (audioContext) {
        audioContext.close();
    }
    observer.disconnect();
});
 