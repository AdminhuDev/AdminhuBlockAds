// Lista de padrões de URLs de anúncios do YouTube
const adPatterns = [
    // Padrões básicos de domínios de anúncios
    "*://*.doubleclick.net/*",
    "*://googleads.g.doubleclick.net/*",
    "*://*.googlesyndication.com/*",
    "*://*.google-analytics.com/*",
    "*://*.googletagservices.com/*",
    "*://*.googleadservices.com/*",
    "*://*.googletagmanager.com/*",
    
    // Padrões específicos do YouTube
    "*://www.youtube.com/pagead/*",
    "*://www.youtube.com/ads/*",
    "*://www.youtube.com/get_midroll_info*",
    "*://www.youtube.com/ptracking*",
    "*://www.youtube.com/api/stats/ads*",
    "*://www.youtube.com/pagead/adview*",
    "*://www.youtube.com/pagead/conversion*",
    "*://www.youtube.com/pagead/interaction*",
    "*://www.youtube.com/_get_ads*",
    
    // Padrões de parâmetros de anúncios
    "*://www.youtube.com/*&ad_type*",
    "*://www.youtube.com/*&adformat*",
    "*://www.youtube.com/*&advideo*",
    "*://www.youtube.com/*&prerolls*",
    "*://www.youtube.com/*&pyv_ad*",
    "*://www.youtube.com/*&ad_slots*",
    "*://www.youtube.com/*&ad_logging*",
    "*://www.youtube.com/*&adtest*"
];

// Lista de parâmetros de anúncios para verificar
const adParams = [
    // Prefixos comuns de parâmetros de anúncios
    'ad_type',
    'adformat',
    'advideo',
    'ad_slots',
    'ad_logging',
    'adtest',
    'adfmt',
    'ad_age',
    'ad_gender',
    'ad_partner',
    'ad_settings',
    'ad_source',
    'ad_tag',
    'ad_video_pub_id',
    'adunit',
    'adpings',
    'adview',
    'ad_template',
    'ad_flags',
    'ad_break_type'
];

// Regras para bloquear anúncios
chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        // Verifica se a URL contém parâmetros de anúncio
        const url = new URL(details.url);
        const searchParams = url.searchParams;
        
        // Ignora URLs de vídeo normais do YouTube
        if (url.href.includes('googlevideo.com/videoplayback') && !url.href.includes('&adformat=')) {
            return {cancel: false};
        }
        
        // Verifica se algum parâmetro de anúncio está presente
        const hasAdParams = adParams.some(param => 
            searchParams.has(param) || 
            url.href.includes(`&${param}=`)
        );
        
        // Verifica se é uma requisição de anúncio do YouTube
        const isYouTubeAd = url.href.includes('/youtubei/v1/player/ad_break') ||
                           url.href.includes('/api/stats/ads') ||
                           url.href.includes('/pagead/');
        
        // Verifica se a URL corresponde a algum padrão de anúncio
        const matchesPattern = adPatterns.some(pattern => 
            new RegExp('^' + pattern.replace(/\*/g, '.*') + '$').test(details.url)
        );

        return {cancel: hasAdParams || matchesPattern || isYouTubeAd};
    },
    {
        urls: ["<all_urls>"],
        types: ["image", "script", "xmlhttprequest", "sub_frame", "main_frame"]
    },
    ["blocking"]
);

// Bloqueia requisições de anúncios em vídeos
chrome.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
        // Ignora URLs de vídeo normais do YouTube
        const url = new URL(details.url);
        if (url.href.includes('googlevideo.com/videoplayback') && !url.href.includes('&adformat=')) {
            return {requestHeaders: details.requestHeaders};
        }

        const headers = details.requestHeaders;
        const newHeaders = headers.filter(header => {
            const name = header.name.toLowerCase();
            const blockList = [
                'x-client-data',
                'doubleclick',
                'ad-',
                'yt-ad',
                'adhost',
                'adformat',
                'adcontent',
                'adunit',
                'adsize',
                'adtype',
                'adview',
                'adreferrer',
                'adsource',
                'adbreaktype',
                'adclient',
                'adposition',
                'adplacement',
                'adnetwork',
                'adserving',
                'adexchange',
                'admanager',
                'adpolicy',
                'adrequest',
                'adresponse',
                'adsystem',
                'adtagurl',
                'adtracking',
                'advalidation',
                'adviewability'
            ];
            return !blockList.some(term => name.includes(term));
        });
        return {requestHeaders: newHeaders};
    },
    {
        urls: ["*://*.youtube.com/*", "*://*.googlevideo.com/*"],
        types: ["xmlhttprequest", "media"]
    },
    ["blocking", "requestHeaders"]
);

// Monitora mudanças no storage
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.totalAdsBlocked) {
        const newTotal = changes.totalAdsBlocked.newValue;
        chrome.action.setBadgeText({
            text: newTotal > 0 ? newTotal.toString() : ''
        });
        chrome.action.setBadgeBackgroundColor({
            color: '#4CAF50'
        });
    }
}); 