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
    // --- LIVE TOKEN FEED (AWS) ---
    // ===============================
    const POLLING_INTERVAL_MS = 4000;
    const displayedTokens = new Set();
    const feedContainer = document.getElementById('token-feed');
    const statusElement = document.getElementById('status');

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

    async function fetchLiveTokens() {
        try {
            statusElement.style.display = 'block';
            statusElement.textContent = 'Fetching live tokens...';

            // 🔥 Fetch directly from AWS live-feed.js
            const response = await fetch('https://34.204.51.121:3000/live-tokens');
            if (!response.ok) throw new Error('Failed to fetch live tokens');

            const { tokens } = await response.json();
            statusElement.style.display = 'none';

            const newTokens = tokens.filter(t => !displayedTokens.has(t.coinMint));
            if (newTokens.length === 0) return;

            newTokens.forEach(t => displayedTokens.add(t.coinMint));

            // trim feed if > 2000
            if (displayedTokens.size > 2000) {
                displayedTokens.clear();
                feedContainer.innerHTML = "";
            }

            for (let i = newTokens.length - 1; i >= 0; i--) {
                const tokenElement = createTokenElement(newTokens[i]);
                feedContainer.prepend(tokenElement);
                tokenElement.classList.add('new-token-animation');
            }
        } catch (err) {
            console.error("❌ Fetch Error:", err);
            statusElement.innerHTML = `<span>Connection failed. Retrying...</span>`;
        }
    }

    function createTokenElement(token) {
        const card = document.createElement('div');
        card.className = 'token-card rounded-lg p-3 sm:p-4';

        const socialsHTML = [
            token.twitter ? `<a href="${token.twitter}" target="_blank">Twitter</a>` : "",
            token.telegram ? `<a href="${token.telegram}" target="_blank">Telegram</a>` : "",
            token.website ? `<a href="${token.website}" target="_blank">Website</a>` : ""
        ].join('');

        const pumpLink = `https://pump.fun/${token.coinMint}`;
        const dexLink = `https://dexscreener.com/solana/${token.coinMint}`;

        card.innerHTML = `
            <div class="grid grid-cols-12 gap-3 items-center">
                <div class="col-span-2 sm:col-span-1">
                    <img src="${token.imageUrl}" alt="${token.ticker}" class="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover">
                </div>
                <div class="col-span-10 sm:col-span-5 flex flex-col justify-center">
                    <div class="flex items-center space-x-2">
                        <p class="font-bold text-white truncate">${token.name}</p>
                        <div class="flex items-center space-x-1.5">${socialsHTML}</div>
                    </div>
                    <div class="flex items-center space-x-2 text-xs text-gray-400 flex-wrap">
                        <span>$${token.ticker}</span>
                        <span class="text-gray-500">•</span>
                        <span>${formatAge(token.creationTime)}</span>
                        <div class="copy-address-container flex items-center space-x-1 cursor-pointer hover:text-white" title="Copy Address">
                            <span class="font-mono token-address">${token.coinMint.substring(0, 4)}...${token.coinMint.substring(token.coinMint.length - 4)}</span>
                        </div>
                    </div>
                </div>
                <div class="hidden sm:col-span-3 sm:grid grid-cols-2 gap-2 text-xs text-center">
                    <div><div class="text-gray-500">MC</div><div class="font-semibold text-white">${formatNum(token.marketCap)}</div></div>
                    <div><div class="text-gray-500">Vol</div><div class="font-semibold text-white">${formatNum(token.volume)}</div></div>
                </div>
                <div class="col-span-12 sm:col-span-3 flex items-center justify-end space-x-2">
                   <a href="${pumpLink}" target="_blank" class="action-btn p-2 rounded-md">Pump</a>
                   <a href="${dexLink}" target="_blank" class="action-btn p-2 rounded-md">Dex</a>
                </div>
            </div>
        `;

        // copy address logic
        const copyContainer = card.querySelector('.copy-address-container');
        const addressText = card.querySelector('.token-address');
        copyContainer.addEventListener('click', () => {
            navigator.clipboard.writeText(token.coinMint);
            const original = addressText.textContent;
            addressText.textContent = "Copied!";
            setTimeout(() => { addressText.textContent = original; }, 1500);
        });

        return card;
    }

    // --- start polling ---
    fetchLiveTokens();
    setInterval(fetchLiveTokens, POLLING_INTERVAL_MS);
});
