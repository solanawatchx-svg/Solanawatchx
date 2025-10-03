document.addEventListener("DOMContentLoaded", () => {
    // ===============================
    // --- SUPABASE CONFIG (only for whitelist) ---
    // ===============================
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

            document.getElementById('whitelist-counter').textContent =
                `${currentCount} / 500 Spots Filled`;
            document.getElementById('progress-bar').style.width =
                `${(currentCount / 500) * 100}%`;
        } catch (error) {
            console.error('Error fetching whitelist count:', error.message);
        }
    }
    updateWhitelistCounter();

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
        if (url.includes("ipfs.io/ipfs/")) {
            return url;
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
    // --- NEWS PANEL (from backend) ---
    // ===============================
    async function fetchNews() {
        const container = document.getElementById("news-panel");
        if (!container) return;

        container.innerHTML = `<div class="text-gray-400 py-10 text-center">Loading news...</div>`;
        try {
            const response = await fetch("https://api.solanawatchx.site/news");
            if (!response.ok) throw new Error("Failed to fetch news");
            const news = await response.json();

            container.innerHTML = "";
            if (!news.length) {
                container.innerHTML = `<p class="text-gray-400 text-center">No news available.</p>`;
                return;
            }

            news.forEach(item => {
                const card = document.createElement("a");
                card.href = item.url;
                card.target = "_blank";
                card.rel = "noopener noreferrer";
                card.className = "block bg-gray-900/50 hover:bg-gray-800 p-4 rounded-lg border border-gray-700 transition";
                card.innerHTML = `
                    <h3 class="text-white font-bold mb-2">${item.title}</h3>
                    <p class="text-gray-400 text-sm">${item.source || "Unknown source"}</p>
                `;
                container.appendChild(card);
            });
        } catch (err) {
            console.error("❌ News Fetch Error:", err);
            container.innerHTML = `<p class="text-red-400 text-center">Failed to load news.</p>`;
        }
    }
    fetchNews();

    // ===============================
    // --- LIVE TOKEN FEED (AWS & AI) ---
    // ===============================
    const POLLING_INTERVAL_MS = 4000;
    const GEMINI_API_KEY = ""; // Canvas injects this.
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
    
    const displayedTokens = new Set();
    const insightsCache = new Map();
    const feedContainer = document.getElementById('token-feed');
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

    // --- token insight fetch ---
    async function fetchTokenInsight(token) {
        if (insightsCache.has(token.symbol)) {
            return insightsCache.get(token.symbol);
        }
        try {
            const prompt = `Give a 1-line fun & catchy summary for Solana token "${token.symbol}" launched ${formatAge(token.launchUnixTime * 1000)} with volume ${formatNum(token.volume)}.`;
            const response = await fetch(GEMINI_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            });
            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            insightsCache.set(token.symbol, text);
            return text;
        } catch (e) {
            console.error("Insight fetch error", e);
            return "";
        }
    }

    // --- live tokens fetch ---
    async function fetchLiveTokens() {
        try {
            const response = await fetch("https://api.solanawatchx.site/live-feed");
            if (!response.ok) throw new Error("Failed live feed");
            const tokens = await response.json();

            if (isInitialLoad) {
                feedContainer.innerHTML = "";
                isInitialLoad = false;
            }

            tokens.forEach(async token => {
                if (displayedTokens.has(token.mint)) return;
                displayedTokens.add(token.mint);

                const insight = await fetchTokenInsight(token);
                const tokenElement = createTokenElement(token, insight);
                feedContainer.prepend(tokenElement);
            });
        } catch (e) {
            console.error("Live feed error", e);
            statusElement.textContent = "Failed to load live feed.";
        }
    }

    // --- token card element ---
    function createTokenElement(token, insight) {
        const card = document.createElement("div");
        card.className = "flex items-center gap-4 p-4 bg-gray-900/50 border border-gray-700 rounded-lg";
        card.innerHTML = `
            <img class="w-12 h-12 rounded-full" alt="${token.symbol}">
            <div class="flex-1">
                <h3 class="text-white font-bold">${token.symbol}</h3>
                <p class="text-gray-400 text-sm">${insight}</p>
                <p class="text-gray-500 text-xs">${formatNum(token.volume)} · ${formatAge(token.launchUnixTime * 1000)}</p>
            </div>
        `;
        loadImageWithFallback(card.querySelector("img"), token.imageUri, token.mint);
        return card;
    }

    // --- start polling live feed ---
    fetchLiveTokens();
    setInterval(fetchLiveTokens, POLLING_INTERVAL_MS);
});
