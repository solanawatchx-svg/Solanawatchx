document.addEventListener("DOMContentLoaded", () => {
    // ===============================
    // --- SUPABASE CONFIG (only for whitelist) ---
    // ===============================
    if (typeof supabase !== 'undefined') {
        const SUPABASE_URL = 'https://dyferdlczmzxurlfrjnd.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5ZmVyZGxjem16eHVybGZyam5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MjYxMDMsImV4cCI6MjA3NDIwMjEwM30.[...]'
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

        const formatAge = (ms) => {
            const minutes = Math.floor((Date.now() - ms) / 60000);
            return minutes < 60
                ? `${minutes}m ago`
                : `${Math.floor(minutes/60)}h ${minutes%60}m ago`;
        };

        async function fetchTokenInsight(token) {
            const systemPrompt = "You are a witty, slightly cynical crypto market analyst. Provide a brief, one-sentence speculative analysis for a new token from pump.fun. The analysis should be crea[...]"
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

        async function fetchLiveTokens() {
            try {
                const response = await fetch("https://api.solanawatchx.site/live-tokens");
                if (!response.ok) throw new Error('Failed to fetch live tokens');
                const { tokens } = await response.json();
                
                if (isInitialLoad) {
                    if(statusElement) statusElement.style.display = 'none';
                    isInitialLoad = false;
                }

                const newTokens = tokens.filter(t => !displayedTokens.has(t.coinMint));
                if (newTokens.length === 0) return;

                newTokens.forEach(t => displayedTokens.add(t.coinMint));
                
                if (feedContainer.children.length > 50) {
                    while (feedContainer.children.length > 40) {
                        const oldMint = feedContainer.lastChild.dataset.mint;
                        if(oldMint) displayedTokens.delete(oldMint);
                        feedContainer.removeChild(feedContainer.lastChild);
                    }
                }

                for (let i = newTokens.length - 1; i >= 0; i--) {
                    const tokenElement = createTokenElement(newTokens[i]);
                    feedContainer.prepend(tokenElement);
                    tokenElement.classList.add('new-token-animation');
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
                twitter: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19[...]`,
                telegram: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14.536 21.686a.5.5 0 0 0[...]`,
                website: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><pa[...]`
            };
            const socialsHTML = Object.entries({twitter: token.twitter, telegram: token.telegram, website: token.website}).filter(([,url]) => url).map(([name, url]) => `<a href="${url}" target="_blank[...]`).join('');
            const pumpLink = `https://pump.fun/${token.coinMint}`;
            const dexLink = `https://dexscreener.com/solana/${token.coinMint}`;
            card.innerHTML = `<div class="grid grid-cols-12 gap-3 items-center"><div class="col-span-2 sm:col-span-1"><img id="img-${token.coinMint}" alt="${token.ticker}" class="w-10 h-10 sm:w-12 sm:[...]`;
            const imgElement = card.querySelector(`#img-${token.coinMint}`);
            loadImageWithFallback(imgElement, token.imageUrl, token.coinMint);
            const insightBtn = card.querySelector('.get-insight-btn');
            const insightContent = card.querySelector('.insight-content');
            const copyContainer = card.querySelector('.copy-address-container');
            const addressText = card.querySelector('.token-address');
            copyContainer.addEventListener('click', (e) => { e.stopPropagation(); navigator.clipboard.writeText(token.coinMint); const original = addressText.textContent; addressText.textContent = "Co[...]
            insightBtn.addEventListener('click', async (e) => { e.stopPropagation(); insightBtn.disabled = true; insightBtn.innerHTML = `<svg class="insight-loading-spinner h-4 w-4" fill="none" viewBo[...]
            return card;
        }

        
        fetchLiveTokens();
        setInterval(fetchLiveTokens, POLLING_INTERVAL_MS);
    }

    // ===============================
    // --- LIVE SOL PRICE FEED ---
    // ===============================
    const SOL_PRICE_INTERVAL_MS = 4000;
    const solPriceElement = document.getElementById('sol-price');
    async function fetchSolPrice() {
        try {
            const response = await fetch("https://api.solanawatchx.site/sol-price");
            if (!response.ok) throw new Error('Failed to fetch SOL price');
            const { price } = await response.json();
            if (solPriceElement) {
                solPriceElement.textContent = `$${(+price).toFixed(2)}`;
            }
        } catch (err) {
            console.error("❌ SOL Price Fetch Error:", err);
            if (solPriceElement) solPriceElement.textContent = "N/A";
        }
    }
    fetchSolPrice();
    setInterval(fetchSolPrice, SOL_PRICE_INTERVAL_MS);

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
