document.addEventListener("DOMContentLoaded", () => {
    // ===============================
    // --- SUPABASE CONFIG (only for whitelist) ---
    // ===============================
    if (typeof supabase !== 'undefined') {
        const SUPABASE_URL = 'https://dyferdlczmzxurlfrjnd.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5ZmVyZGxjem16eHVybGZyam5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MjYxMDMsImV4cCI6MjA3NDIwMjEwM30.LTXkmO2MkqYqg4g7Bv7H8u1rgQnDnQ43FDaT7DzFAt8';
        const { createClient } = supabase;
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // ===============================
        // --- WHITELIST COUNTER ---
        // ===============================
        async function updateWhitelistCounter() {
            try {
                const { count, error } = await supabaseClient
                    .from('whitelist')
                    .select('*', { count: 'exact', head: true });

                if (error) throw error;
                const currentCount = Math.min(count || 0, 500);

                const counterElement = document.getElementById('whitelist-counter');
                if (counterElement) {
                    counterElement.textContent = `${currentCount} / 500 Spots Filled`;
                }
                const progressBarElement = document.getElementById('progress-bar');
                if (progressBarElement) {
                    progressBarElement.style.width = `${(currentCount / 500) * 100}%`;
                }
            } catch (error) {
                console.error('Error fetching whitelist count:', error.message);
            }
        }
        if (document.getElementById('whitelist-counter')) {
           updateWhitelistCounter();
        }
    }


// ===============================
// --- SOL PRICE FETCH ---
// ===============================
    const solPriceElement = document.getElementById('sol-price');
    let currentSolPrice = null;
    
    async function fetchSolPrice() {
        try {
            const response = await fetch('https://api.solanawatchx.site/sol-price');
            if (!response.ok) throw new Error("Failed to fetch SOL price");
            const data = await response.json();
            currentSolPrice = data.solana_usd || data.solPrice || 0; // depending on your API key
            if (solPriceElement) solPriceElement.textContent = `SOL: $${currentSolPrice.toFixed(2)}`;
        } catch (err) {
            console.error("❌ Error fetching SOL price:", err);
            if (solPriceElement) solPriceElement.textContent = "SOL: --";
        }
    }
    // fetch immediately and every 30 seconds
    fetchSolPrice();
    setInterval(fetchSolPrice, 30000);


    
    // ===============================
    // --- SCROLL ANIMATIONS ---
    // ===============================
    const animatedElements = document.querySelectorAll('.scroll-animate');
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        animatedElements.forEach(el => observer.observe(el));
    } else {
        animatedElements.forEach(el => el.classList.add('is-visible'));
    }

    // ===============================
    // --- IMAGE FALLBACK FIX ---
    // ===============================
    function resolveImageUrl(url) {
        if (!url) return "https://via.placeholder.com/86";
        if (url.includes("imagedelivery.net") || url.includes("images.pump.fun")) {
            return url.replace(/\/coin-image\/([^/?]+).*/, "/coin-image/$1/86x86?alpha=true");
        }
        if (url.includes("ipfs://")) {
            return url.replace("ipfs://", "https://ipfs.io/ipfs/");
        }
        return url;
    }

    function loadImageWithFallback(imgElement, primaryUrl, coinMint) {
        imgElement.src = resolveImageUrl(primaryUrl);
        imgElement.onerror = function () {
            console.warn(`⚠️ Image failed for ${coinMint}, trying IPFS fallback...`);
            try {
                const urlObj = new URL(primaryUrl);
                const ipfsHash = urlObj.searchParams.get("ipfs");
                if (ipfsHash) {
                    imgElement.src = `https://ipfs.io/ipfs/${ipfsHash}`;
                    return;
                }
            } catch (e) {
                console.error("Error parsing URL:", e);
            }
            imgElement.src = "https://via.placeholder.com/86";
        };
    }

    // ===============================
    // --- LIVE TOKEN FEED (AWS & AI) ---
    // ===============================
    const feedContainer = document.getElementById('token-feed');
    if (feedContainer) {
        const POLLING_INTERVAL_MS = 4000;
        const GEMINI_API_KEY = ""; // Canvas injects this.
        const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
        const displayedTokens = new Set();
        const insightsCache = new Map();
        const statusElement = document.getElementById('status');
        let isInitialLoad = true;

        const formatNum = (n) =>
            n >= 1e6 ? `$${(n/1e6).toFixed(2)}M`
            : n >= 1e3 ? `$${(n/1e3).toFixed(1)}K`
            : `$${n.toFixed(0)}`;
        
        function formatAge(ms) {
            const now = Date.now();
            let diff = Math.floor((now - ms) / 1000); // seconds
            if (diff < 60) return `${diff}s ago`;
            if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s ago`;
            return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
        }

        async function fetchTokenInsight(token) {
            const systemPrompt = "You are a witty, slightly cynical crypto market analyst. Provide a brief, one-sentence speculative analysis for a new token from pump.fun. The analysis should be creative and mention potential risks or upsides in a fun, meme-worthy manner. Do not give financial advice. Keep it under 20 words.";
            const userQuery = `Analyze this token: Name: ${token.name}, Ticker: $${token.ticker}, Market Cap: ${formatNum(token.marketCap)}`;
            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
            };
            try {
                const response = await fetch(GEMINI_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
                const result = await response.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return text.trim();
                throw new Error("Invalid response structure from Gemini API.");
            } catch (error) {
                console.error("Gemini API Error:", error);
                return "Couldn't get an insight. The AI might be sleeping.";
            }
        }


const displayedTokensObjects = [];
async function fetchLiveTokens() {
    try {
        // new: keep full token objects for sorting across fetches
        const response = await fetch("https://api.solanawatchx.site/live-tokens");
        if (!response.ok) throw new Error('Failed to fetch live tokens');
        const { tokens } = await response.json();


 


        if (isInitialLoad) {
            if(statusElement) statusElement.style.display = 'none';
            isInitialLoad = false;
        }

        if (tokens.length === 0) return;

        // No need to sort client-side—the endpoint already sorts newest first (descending creationTime)
        // tokens.sort((a, b) => b.creationTime - a.creationTime); // Comment this out
        
        
        const newTokens = [];
        for (const token of tokens) {
            if (!displayedTokens.has(token.coinMint)) {
                newTokens.push(token);
                displayedTokens.add(token.coinMint);

              displayedTokensObjects.push(token); // keep full object
            } //else {
                //break;
            //}
        }

// ===== Simplified LiQ (First Swap) Calculation - Always uses /sol-price =====
// ===== Pump.fun First Swap Liquidity Calculation (New Dev Holdings Formula) =====
const solUsd = Number(currentSolPrice ?? 0); // live SOL/USD from your API

for (const token of tokens) {
  try {
    // --- safely extract required fields ---
    const progressNum = Number(token.bondingCurveProgress || 0); // in %
    const marketCapUsd = Number(token.marketCap || 0);           // in USD
    const devHoldingsPct = Number(token.devHoldingsPct || 0);    // in %, e.g., 4.88
    const tokenMint = token.coinMint || "unknown";

    // --- Step 1: convert MarketCap → SOL ---
    const marketCapSol = solUsd > 0 ? (marketCapUsd / solUsd) : 0;

    // --- Step 2: First Swap SOL using new formula ---
    // First Swap (SOL) = (Dev Holdings % / 100) × (1 - Bonding Curve Progress %) × Market Cap (SOL)
    const progressFraction = progressNum / 100;
    const devFraction = devHoldingsPct / 100;
    const firstSwapSol = marketCapSol * devFraction * (1 - progressFraction);

    // --- Step 3: Convert SOL back to USD for UI ---
    const firstSwapUsd = firstSwapSol * solUsd;

    // --- Step 4: Round and assign (renamed for clarity) ---
    token.firstSwapSol = Number(firstSwapSol.toFixed(9));
    token.firstSwapUsd = Number(firstSwapUsd.toFixed(2));
    token._liqMethod = "dev_holdings_formula";

    // --- Debug Log (shows full calculation + token address) ---
    console.debug(`✅ First Swap (${tokenMint}) → ${token.firstSwapSol} SOL / $${token.firstSwapUsd} | Dev%: ${devHoldingsPct}%, Progress: ${progressNum}%`);

  } catch (e) {
    token.firstSwapSol = 0;
    token.firstSwapUsd = 0;
    token._liqMethod = "error_formula";
    console.error("❌ First Swap formula error:", token.coinMint, e.message);
  }
}



        // Step 1: sort all displayed tokens newest → oldest
displayedTokensObjects.sort((a,b) => b.creationTime - a.creationTime);

// Step 2: clear current feed
feedContainer.innerHTML = "";

// Step 3: render all tokens in correct order
for (const token of displayedTokensObjects) {
    const el = createTokenElement(token);
    feedContainer.appendChild(el);
}


        
        if (newTokens.length === 0) return;
        
        //Prepend only the new tokens (newest will be first in newTokens)
        //for (let i = newTokens.length - 1; i >= 0; i--) {
            //const tokenElement = createTokenElement(newTokens[i]);
            //feedContainer.prepend(tokenElement);
            //tokenElement.classList.add('new-token-animation');
        //}

//for (let i = newTokens.length - 1; i >= 0; i--) {
    //const el = createTokenElement(newTokens[i]);
   // feedContainer.prepend(el);
   // el.classList.add('new-token-animation');
//}


        
        const MAX_FEED_LENGTH = 50;
        while (feedContainer.children.length > MAX_FEED_LENGTH) {
            feedContainer.removeChild(feedContainer.lastChild);
        }
    } catch (err) {
        console.error("❌ Fetch Error:", err);
        if(isInitialLoad && statusElement){
            statusElement.innerHTML = `<span>Connection failed. Retrying...</span>`;
        }
    }
}

        
        function createTokenElement(token) {
            const card = document.createElement('div');
            card.className = 'token-card rounded-lg p-3 sm:p-4';
            card.dataset.mint = token.coinMint;

            const socialIcons = {
                twitter: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg>`,
                telegram: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>`,
                website: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`
            };
            const socialsHTML = Object.entries({twitter: token.twitter, telegram: token.telegram, website: token.website}).filter(([,url]) => url).map(([name, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white" title="${name.charAt(0).toUpperCase() + name.slice(1)}">${socialIcons[name] || ''}</a>`).join('');
            const pumpLink = `https://pump.fun/${token.coinMint}`;
            const dexLink = `https://dexscreener.com/solana/${token.coinMint}`;
            card.innerHTML = `<div class="grid grid-cols-12 gap-3 items-center"><div class="col-span-2 sm:col-span-1"><img id="img-${token.coinMint}" alt="${token.ticker}" class="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"></div><div class="col-span-5 sm:col-span-5 flex flex-col justify-center"><div class="flex items-center space-x-2"><p class="font-bold text-white truncate">${token.ticker}</p><div class="flex items-center space-x-1.5">${socialsHTML}</div></div><div class="flex items-center space-x-2 text-xs text-gray-400 flex-wrap"><span class="truncate block max-w-[80px] sm:max-w-[120px]" title="${token.name}">${token.name}</span><span class="text-gray-500">•</span><span>${formatAge(token.creationTime)}</span><div class="copy-address-container flex items-center space-x-1 cursor-pointer hover:text-white" title="Copy Address"><span class="font-mono token-address">${token.coinMint.substring(0, 4)}...${token.coinMint.substring(token.coinMint.length - 4)}</span><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></div></div></div><div class="hidden sm:col-span-3 sm:grid grid-cols-2 gap-2 text-xs text-center"><div><div class="text-gray-500">LiQ</div><div class="font-semibold text-white">
  ${(typeof token.firstSwapSol === 'number' && token.firstSwapSol > 0) 
     ? `${token.firstSwapSol.toFixed(6)} SOL / $${token.firstSwapUsd.toLocaleString()}` 
     : '—'}
</div></div></div><div class="col-span-5 sm:col-span-3 flex items-center justify-end space-x-2"><a href="${pumpLink}" target="_blank" rel="noopener noreferrer" class="action-btn p-2 rounded-md" title="Buy on Pump.fun"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 13.5L12 18L7.5 13.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 6V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></a><a href="${dexLink}" target="_blank" rel="noopener noreferrer" class="action-btn p-2 rounded-md" title="View on DexScreener"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg></a><button class="get-insight-btn ai-btn text-xs font-bold px-3 py-1.5 rounded-md" title="Get AI Insight">AI</button></div></div><div class="insight-content hidden mt-3 p-3 bg-gray-900/50 rounded text-sm text-purple-300 italic"></div>`;
            const imgElement = card.querySelector(`#img-${token.coinMint}`);
            loadImageWithFallback(imgElement, token.imageUrl, token.coinMint);
            const insightBtn = card.querySelector('.get-insight-btn');
            const insightContent = card.querySelector('.insight-content');
            const copyContainer = card.querySelector('.copy-address-container');
            const addressText = card.querySelector('.token-address');
            copyContainer.addEventListener('click', (e) => { e.stopPropagation(); navigator.clipboard.writeText(token.coinMint); const original = addressText.textContent; addressText.textContent = "Copied!"; setTimeout(() => { addressText.textContent = original; }, 1500); });
            insightBtn.addEventListener('click', async (e) => { e.stopPropagation(); insightBtn.disabled = true; insightBtn.innerHTML = `<svg class="insight-loading-spinner h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.75V6.25m0 11.5v1.5M17.25 6.75l-1.06 1.06M7.81 16.19l-1.06 1.06M20.25 12h-1.5M5.25 12h-1.5m14.25-5.25l-1.06-1.06M7.81 7.81l-1.06-1.06"></path></svg>`; let insightText; if (insightsCache.has(token.coinMint)) { insightText = insightsCache.get(token.coinMint); } else { insightText = await fetchTokenInsight(token); insightsCache.set(token.coinMint, insightText); } insightContent.textContent = `"${insightText}"`; insightContent.classList.remove('hidden'); insightBtn.classList.add('hidden'); });
            return card;
        }

        // --- start polling ---
        // --- start polling after we fetch SOL price once (so currentSolPrice exists) ---
(async () => {
  try {
    await fetchSolPrice(); // ensure price is fetched at least once
  } catch (e) {
    console.warn('Initial fetchSolPrice failed:', e);
  }
  // start feed now
  fetchLiveTokens();
  setInterval(fetchLiveTokens, POLLING_INTERVAL_MS);
})();

    }

    // ===============================
    // --- NEWS PANELS SCRIPT (CORRECTED) ---
    // ===============================
    const newsTrack1 = document.getElementById('news-track-1');
    const newsTrack2 = document.getElementById('news-track-2');

    if (newsTrack1 && newsTrack2) {
        const createNewsPanel = (item) => {
            const eventDate = new Date(item.event_date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            return `
                <div class="news-panel flex-none w-80 md:w-96 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg p-4 mx-4">
                    <h2 class="text-base font-bold text-gray-100 leading-tight mb-3 truncate" title="${item.title}">${item.title}</h2>
                    <div class="flex justify-between items-center text-xs text-gray-400">
                        <a href="${item.source_url}" target="_blank" rel="noopener noreferrer" class="font-semibold text-green-400 hover:text-green-300">Read Source &rarr;</a>
                        <span>${eventDate}</span>
                    </div>
                </div>
            `;
        };

        const populateNewsScroller = (newsData) => {
            if (!newsData || newsData.length === 0) {
                console.warn('No news data to display.');
                const newsContainer = document.getElementById('news-container');
                if (newsContainer) newsContainer.style.display = 'none';
                return;
            }
            const content = newsData.map(createNewsPanel).join('');
            newsTrack1.innerHTML = content;
            newsTrack2.innerHTML = content;
        };

        const fetchNewsData = async () => {
            try {
                const response = await fetch("https://news.solanawatchx.site/solana-news");
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                populateNewsScroller(data);
            } catch (error) {
                console.error("Could not fetch news data:", error);
                const newsContainer = document.getElementById('news-container');
                if(newsContainer) newsContainer.innerHTML = '<p class="text-center text-red-400 py-4">Could not load news feed.</p>';
            }
        };
        fetchNewsData();
    }
});
```
