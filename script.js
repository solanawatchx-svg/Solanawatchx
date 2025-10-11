document.addEventListener("DOMContentLoaded", () => {
    // ===============================
    // --- CONFIG & HELPERS ---
    // ===============================
    const API_BASE = "https://api.solanawatchx.site"; // Backend you host
    const POLLING_INTERVAL_MS = 4000;
    const SOL_PRICE_INTERVAL_MS = 5000; // ms
    const displayedTokens = new Set();
    const insightsCache = new Map();

    // DOM refs
    const feedContainer = document.getElementById('token-feed');
    const statusElement = document.getElementById('status');
    const solPriceElement = document.getElementById('sol-price');
    let isInitialLoad = true;

    // Safe number formatter
    const formatNum = (n) =>
        (typeof n !== "number" || Number.isNaN(n)) ? "N/A" :
        n >= 1e6 ? `$${(n/1e6).toFixed(2)}M`
        : n >= 1e3 ? `$${(n/1e3).toFixed(1)}K`
        : `$${n.toFixed(0)}`;

    const formatAge = (ms) => {
        if (!ms) return "now";
        const minutes = Math.floor((Date.now() - Number(ms)) / 60000);
        if (minutes < 0) return "now";
        return minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes/60)}h ${minutes%60}m ago`;
    };

    // ===============================
    // --- IMAGE FALLBACK HELPERS ---
    // ===============================
    function resolveImageUrl(url) {
        if (!url) return "https://via.placeholder.com/86";
        try {
            if (url.startsWith("ipfs://")) {
                return url.replace("ipfs://", "https://ipfs.io/ipfs/");
            }
            // images.pump.fun and imagedelivery variants -> transform to size variant where possible
            if (url.includes("imagedelivery.net") || url.includes("images.pump.fun")) {
                // try to extract id and return 86x86 variant form
                const match = url.match(/coin-image\/([^/?]+)/);
                if (match && match[1]) {
                    return `https://imagedelivery.net/WL1JOIJiM_NAChp6rtB6Cw/coin-image/${match[1]}/86x86?alpha=true`;
                }
                // fallback to original
                return url;
            }
            return url;
        } catch (e) {
            return url;
        }
    }

    function loadImageWithFallback(imgElement, primaryUrl, coinMint) {
        if (!imgElement) return;
        const resolved = resolveImageUrl(primaryUrl);
        imgElement.src = resolved;
        imgElement.onerror = function () {
            console.warn(`⚠️ Image failed for ${coinMint}, trying IPFS / proxy fallback...`);
            try {
                const urlObj = new URL(primaryUrl, window.location.origin);
                const ipfsHash = urlObj.searchParams.get("ipfs");
                const srcParam = urlObj.searchParams.get("src");
                if (ipfsHash && /^Qm|^bafy/i.test(ipfsHash)) {
                    imgElement.src = `https://ipfs.io/ipfs/${ipfsHash}`;
                    return;
                } else if (srcParam) {
                    imgElement.src = srcParam;
                    return;
                }
            } catch (e) {
                // ignore
            }
            // final fallback
            imgElement.src = "https://via.placeholder.com/86";
        };
    }

    // ===============================
    // --- TOKEN INSIGHT (AI) ---
    // ===============================
    const GEMINI_API_KEY = ""; // optional
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

    async function fetchTokenInsight(token) {
        if (!GEMINI_API_KEY) return "AI key not configured";
        const systemPrompt = "You are a witty, slightly cynical crypto market analyst. Provide a brief, one-sentence speculative analysis for a new token from pump.fun. The analysis should be creative and mention potential risks or upsides in a fun, meme-worthy manner. Do not give financial advice. Keep it under 20 words.";
        const userQuery = `Analyze this token: Name: ${token.name || 'Unknown'}, Ticker: ${token.ticker || 'N/A'}, Market Cap: ${formatNum(token.marketCap || 0)}`;
        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        try {
            const resp = await fetch(GEMINI_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!resp.ok) throw new Error("AI API failed");
            const j = await resp.json();
            const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
            return text ? text.trim() : "No insight available";
        } catch (err) {
            console.error("Gemini Error:", err);
            return "Couldn't get an insight.";
        }
    }

    // ===============================
    // --- CREATE TOKEN CARD ---
    // ===============================
    function createTokenElement(token) {
        const card = document.createElement('div');
        card.className = 'token-card rounded-lg p-3 sm:p-4';
        card.dataset.mint = token.coinMint || "";

        const socialIcons = {
            twitter: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg>`,
            telegram: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>`,
            website: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`
        };

        const socialsHTML = Object.entries({twitter: token.twitter, telegram: token.telegram, website: token.website})
            .filter(([,url]) => url)
            .map(([name, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white" title="${name}">${socialIcons[name] || ''}</a>`).join('');

        const pumpLink = `https://pump.fun/${token.coinMint}`;
        const dexLink = `https://dexscreener.com/solana/${token.coinMint}`;

        card.innerHTML = `
            <div class="grid grid-cols-12 gap-3 items-center">
                <div class="col-span-2 sm:col-span-1">
                    <img id="img-${token.coinMint}" alt="${token.ticker || ''}" class="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover">
                </div>
                <div class="col-span-5 sm:col-span-5 flex flex-col justify-center">
                    <div class="flex items-center space-x-2">
                        <p class="font-bold text-white truncate">${token.name || 'Unknown'}</p>
                        <div class="flex items-center space-x-1.5">${socialsHTML}</div>
                    </div>
                    <div class="flex items-center space-x-2 text-xs text-gray-400 flex-wrap">
                        <span>$${token.ticker || 'N/A'}</span>
                        <span class="text-gray-500">•</span>
                        <span>${formatAge(token.creationTime)}</span>
                        <div class="copy-address-container flex items-center space-x-1 cursor-pointer hover:text-white" title="Copy Address">
                            <span class="font-mono token-address">${(token.coinMint||'').substring(0,4)}...${(token.coinMint||'').slice(-4)}</span>
                        </div>
                    </div>
                </div>
                <div class="hidden sm:col-span-3 sm:grid grid-cols-2 gap-2 text-xs text-center">
                    <div><div class="text-gray-500">MC</div><div class="font-semibold text-white">${formatNum(token.marketCap)}</div></div>
                    <div><div class="text-gray-500">Vol</div><div class="font-semibold text-white">${formatNum(token.volume)}</div></div>
                </div>
                <div class="col-span-5 sm:col-span-3 flex items-center justify-end space-x-2">
                   <a href="${pumpLink}" target="_blank" rel="noopener noreferrer" class="action-btn p-2 rounded-md" title="Buy on Pump.fun">Pump</a>
                   <a href="${dexLink}" target="_blank" rel="noopener noreferrer" class="action-btn p-2 rounded-md" title="View on DexScreener">Dex</a>
                   <button class="get-insight-btn ai-btn text-xs font-bold px-3 py-1.5 rounded-md" title="Get AI Insight">AI</button>
                </div>
            </div>
            <div class="insight-content hidden mt-3 p-3 bg-gray-900/50 rounded text-sm text-purple-300 italic"></div>
        `;

        const imgElement = card.querySelector(`#img-${token.coinMint}`);
        loadImageWithFallback(imgElement, token.imageUrl, token.coinMint);

        const insightBtn = card.querySelector('.get-insight-btn');
        const insightContent = card.querySelector('.insight-content');
        const copyContainer = card.querySelector('.copy-address-container');
        const addressText = card.querySelector('.token-address');

        copyContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(token.coinMint || "");
            const original = addressText.textContent;
            addressText.textContent = "Copied!";
            setTimeout(() => { addressText.textContent = original; }, 1500);
        });

        insightBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            insightBtn.disabled = true;
            insightBtn.innerHTML = `<svg class="insight-loading-spinner h-4 w-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/></svg>`;
            let insightText;
            if (insightsCache.has(token.coinMint)) {
                insightText = insightsCache.get(token.coinMint);
            } else {
                insightText = await fetchTokenInsight(token);
                insightsCache.set(token.coinMint, insightText);
            }
            insightContent.textContent = `"${insightText}"`;
            insightContent.classList.remove('hidden');
            insightBtn.classList.add('hidden');
        });

        return card;
    }

    // ===============================
    // --- LIVE TOKENS POLLING ---
    // ===============================
    async function fetchLiveTokens() {
        if (!feedContainer) return;
        try {
            if (statusElement && isInitialLoad) {
                statusElement.style.display = 'block';
                statusElement.innerText = 'Fetching live tokens...';
            }

            const resp = await fetch(`${API_BASE}/live-tokens`, { cache: "no-store" });
            if (!resp.ok) throw new Error(`live-tokens failed: ${resp.status}`);
            const parsed = await resp.json();
            const tokens = parsed?.tokens || [];

            // hide initial status
            if (isInitialLoad && statusElement) {
                statusElement.style.display = 'none';
                isInitialLoad = false;
            }

            const newTokens = tokens.filter(t => t && t.coinMint && !displayedTokens.has(t.coinMint));
            if (newTokens.length === 0) return;

            newTokens.forEach(t => displayedTokens.add(t.coinMint));

            // trim feed DOM to avoid memory bloat
            while (feedContainer.children.length > 1800) {
                const lastMint = feedContainer.lastChild?.dataset?.mint;
                if (lastMint) displayedTokens.delete(lastMint);
                feedContainer.removeChild(feedContainer.lastChild);
            }

            for (let i = newTokens.length - 1; i >= 0; i--) {
                const el = createTokenElement(newTokens[i]);
                feedContainer.prepend(el);
                el.classList.add('new-token-animation');
            }
        } catch (err) {
            console.error("❌ Fetch live tokens error:", err);
            if (isInitialLoad && statusElement) statusElement.innerHTML = `<span>Connection failed. Retrying...</span>`;
        }
    }

    // Start live tokens loop
    if (feedContainer) {
        fetchLiveTokens();
        setInterval(fetchLiveTokens, POLLING_INTERVAL_MS);
    }

    // ===============================
    // --- LIVE SOL PRICE POLLING ---
    // ===============================
    async function fetchSolPrice() {
        if (!solPriceElement) return;
        try {
            const resp = await fetch(`${API_BASE}/live-sol-price`, { cache: "no-store" });
            if (!resp.ok) throw new Error(`SOL price fetch failed: ${resp.status}`);
            const json = await resp.json();
            // handle different shapes
            let price = json?.price ?? json?.sol?.price ?? json?.data?.price ?? json?.price_usd ?? json?.value;
            if (!price && typeof json === "object") {
                // sometimes the API returns plain number as root — try that
                if (typeof json === "number") price = json;
            }
            const p = typeof price === "string" ? parseFloat(price) : price;
            solPriceElement.textContent = (p && !Number.isNaN(p)) ? `$${p.toFixed(2)}` : "N/A";
        } catch (err) {
            console.error("❌ SOL Price Fetch Error:", err);
            solPriceElement.textContent = "Error";
        }
    }

    // Start SOL price loop (only if element exists)
    if (solPriceElement) {
        fetchSolPrice();
        setInterval(fetchSolPrice, SOL_PRICE_INTERVAL_MS);
    }

    // ===============================
    // --- NEWS SCROLLER (unchanged) ---
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
