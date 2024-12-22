// Otimização das listas de padrões usando Set para busca mais rápida
const adDomains = new Set([
    'doubleclick.net',
    'googlesyndication.com',
    'google-analytics.com',
    'googletagservices.com',
    'googleadservices.com',
    'googletagmanager.com'
]);

// Otimização dos padrões do YouTube
const youtubeAdPatterns = new Set([
    '/pagead/',
    '/ads/',
    '/get_midroll_info',
    '/ptracking',
    '/api/stats/ads',
    '/pagead/adview',
    '/pagead/conversion',
    '/pagead/interaction',
    '/_get_ads'
]);

// Cache para URLs já verificadas
const urlCache = new Map();
const CACHE_MAX_SIZE = 1000;

// Função para limpar cache periodicamente
function clearCache() {
    if (urlCache.size > CACHE_MAX_SIZE) {
        const entries = Array.from(urlCache.entries());
        const halfSize = Math.floor(CACHE_MAX_SIZE / 2);
        entries.slice(0, halfSize).forEach(([key]) => urlCache.delete(key));
    }
}

// Otimização da verificação de URLs
function shouldBlockRequest(url) {
    // Verifica cache primeiro
    if (urlCache.has(url)) {
        return urlCache.get(url);
    }

    try {
        const urlObj = new URL(url);
        
        // Ignora URLs de vídeo normais do YouTube
        if (urlObj.href.includes('googlevideo.com/videoplayback') && !urlObj.href.includes('&adformat=')) {
            urlCache.set(url, false);
            return false;
        }

        // Verifica domínios de anúncios
        const domain = urlObj.hostname.replace('www.', '');
        if (Array.from(adDomains).some(adDomain => domain.includes(adDomain))) {
            urlCache.set(url, true);
            return true;
        }

        // Verifica padrões do YouTube
        if (domain.includes('youtube.com')) {
            const shouldBlock = Array.from(youtubeAdPatterns).some(pattern => 
                urlObj.pathname.includes(pattern)
            );
            urlCache.set(url, shouldBlock);
            return shouldBlock;
        }

        urlCache.set(url, false);
        return false;
    } catch (e) {
        console.error('Erro ao processar URL:', e);
        return false;
    }
}

// Listener otimizado para requisições
chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        return { cancel: shouldBlockRequest(details.url) };
    },
    {
        urls: [
            "*://*.youtube.com/*",
            "*://*.doubleclick.net/*",
            "*://*.googlesyndication.com/*",
            "*://*.google-analytics.com/*",
            "*://*.googletagservices.com/*",
            "*://*.googleadservices.com/*",
            "*://*.googletagmanager.com/*"
        ],
        types: ["xmlhttprequest", "script", "image", "media"]
    },
    ["blocking"]
);

// Otimização do processamento de headers
const blockedHeaderPrefixes = new Set([
    'x-client-data',
    'doubleclick',
    'ad-',
    'yt-ad',
    'adhost',
    'adformat'
]);

chrome.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
        const url = details.url;
        if (url.includes('googlevideo.com/videoplayback') && !url.includes('&adformat=')) {
            return {requestHeaders: details.requestHeaders};
        }

        return {
            requestHeaders: details.requestHeaders.filter(header => {
                const headerName = header.name.toLowerCase();
                return !Array.from(blockedHeaderPrefixes).some(prefix => 
                    headerName.startsWith(prefix)
                );
            })
        };
    },
    {
        urls: ["*://*.youtube.com/*", "*://*.googlevideo.com/*"],
        types: ["xmlhttprequest", "media"]
    },
    ["blocking", "requestHeaders"]
);

// Limpa o cache periodicamente (a cada 5 minutos)
setInterval(clearCache, 5 * 60 * 1000);

// Gerenciamento eficiente do badge
let badgeUpdateTimeout;
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.totalAdsBlocked) {
        // Debounce da atualização do badge
        clearTimeout(badgeUpdateTimeout);
        badgeUpdateTimeout = setTimeout(() => {
            const newTotal = changes.totalAdsBlocked.newValue;
            chrome.action.setBadgeText({
                text: newTotal > 0 ? newTotal.toString() : ''
            });
            chrome.action.setBadgeBackgroundColor({
                color: '#4CAF50'
            });
        }, 100);
    }
}); 