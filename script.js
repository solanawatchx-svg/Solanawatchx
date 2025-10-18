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
            currentSolPrice = data.solana_usd || data.solPrice || 0;
            if (solPriceElement) solPriceElement.textContent = `SOL: $${currentSolPrice.toFixed(2)}`;
        } catch (err) {
            console.error("❌ Error fetching SOL price:", err);
            if (solPriceElement) solPriceElement.textContent = "SOL: --";
        }
    }
    // fetch immediately and every 10 seconds
    fetchSolPrice();
    setInterval(fetchSolPrice, 10000);

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
        const imageUrl = primaryUrl || "https://via.placeholder.com/86";
        imgElement.src = resolveImageUrl(imageUrl);
        imgElement.onerror = function () {
            console.warn(`⚠️ Image failed for ${coinMint}, trying IPFS fallback...`);
            try {
                const urlObj = new URL(imageUrl);
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
    // --- LIVE TOKEN FEED ---
    // ===============================
    const feedContainer = document.getElementById('token-feed');
    const statusElement = document.getElementById('status');
    if (feedContainer) {
        const POLLING_INTERVAL_MS = 4000;
        const displayedTokens = new Set();
        const displayedTokensObjects = [];
        let isInitialLoad = true;
        let hasLoadedFromDb = false;
        let supabaseClient = null;

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

        // ===============================
        // --- SUPABASE TOKEN MANAGEMENT (inside feedContainer scope) ---
        // ===============================
        if (typeof supabase !== 'undefined') {
            const SUPABASE_URL = 'https://jhznyntysmjsmmuhxciw.supabase.co';
            const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impoem55bnR5c21qc21tdWh4Y2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NzU5NzksImV4cCI6MjA3NjM1MTk3OX0.lIGy5ZjpVjfZcHjBgZCTSBK0hN486mZvEY-BG79OkKE';
            const { createClient } = supabase;
            supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            const STORAGE_LIMIT_BYTES = 470 * 1024 * 1024; // 470 MB

            async function checkAndClean() {
                if (!supabaseClient) return;
                try {
                    const { data: rows, error } = await supabaseClient
                        .from('tokens')
                        .select('size_bytes');
                    if (error) throw error;

                    const totalBytes = rows.reduce((sum, row) => sum + row.size_bytes, 0);
                    if (totalBytes > STORAGE_LIMIT_BYTES) {
                        await supabaseClient
                            .from('tokens')
                            .delete()
                            .neq('id', null);
                        // Clear local state
                        displayedTokens.clear();
                        displayedTokensObjects.length = 0;
                        feedContainer.innerHTML = "";
                        console.log('Storage limit exceeded. All token data cleared.');
                        if (statusElement) {
                            statusElement.innerHTML = `<span>Data cleared due to storage limit.</span>`;
                            setTimeout(() => { if (statusElement) statusElement.style.display = 'none'; }, 3000);
                        }
                    }
                } catch (error) {
                    console.error('Error in checkAndClean:', error);
                    if (statusElement) {
                        statusElement.innerHTML = `<span>Storage check failed.</span>`;
                        setTimeout(() => { if (statusElement) statusElement.style.display = 'none'; }, 3000);
                    }
                }
            }

            async function loadFromSupabase() {
                if (!supabaseClient) return;
                try {
                    await checkAndClean();
                    const { data: rows, error } = await supabaseClient
                        .from('tokens')
                        .select('*')
                        .order('inserted_at', { ascending: false });
                    if (error) throw error;

                    for (const row of rows) {
                        const data = row.data;
                        const mockToken = {
                            name: data.name,
                            ticker: data.ticker,
                            imageUrl: data.image,
                            coinMint: data.address,
                            creationTime: data.timestamp,
                            twitter: data.socials.twitter || null,
                            telegram: data.socials.telegram || null,
                            website: data.socials.website || null,
                            liquidity_sol: data.liquidity_sol || 0,
                            holders: [], // Placeholder
                            dev: null // Placeholder
                        };
                        if (!displayedTokens.has(mockToken.coinMint)) {
                            displayedTokens.add(mockToken.coinMint);
                            displayedTokensObjects.push(mockToken);
                        }
                    }

                    // Sort and render
                    displayedTokensObjects.sort((a, b) => b.creationTime - a.creationTime);
                    feedContainer.innerHTML = "";
                    for (const token of displayedTokensObjects) {
                        const el = createTokenElement(token);
                        feedContainer.appendChild(el);
                    }
                    const MAX_FEED_LENGTH = 50;
                    while (feedContainer.children.length > MAX_FEED_LENGTH) {
                        feedContainer.removeChild(feedContainer.lastChild);
                    }
                    // Trim local array
                    displayedTokensObjects.length = Math.min(displayedTokensObjects.length, MAX_FEED_LENGTH);
                } catch (error) {
                    console.error('Error loading from Supabase:', error);
                    if (statusElement) {
                        statusElement.innerHTML = `<span>Failed to load saved tokens.</span>`;
                        setTimeout(() => { if (statusElement) statusElement.style.display = 'none'; }, 3000);
                    }
                }
            }

            function compute_sol(token) {
                let liquidity_sol = 0;
                let dev_held = 0;
                for (const h of token.holders) {
                    if (h.holderId === token.dev) {
                        dev_held = h.totalTokenAmountHeld;
                        break;
                    }
                }
                if (dev_held > 0) {
                    const TOKEN_DECIMALS = 6;
                    const dev_token_units = BigInt(Math.floor(dev_held * Math.pow(10, TOKEN_DECIMALS)));
                    const INITIAL_VIRTUAL_SOL = 30000000000n;
                    const INITIAL_VIRTUAL_TOKEN = 1073000000000000n;
                    const k = INITIAL_VIRTUAL_SOL * INITIAL_VIRTUAL_TOKEN;
                    const new_virtual_token = INITIAL_VIRTUAL_TOKEN - dev_token_units;
                    if (new_virtual_token > 0n) {
                        const new_virtual_sol = k / new_virtual_token;
                        const delta_lamports = new_virtual_sol - INITIAL_VIRTUAL_SOL;
                        liquidity_sol = Number(delta_lamports) / 1e9;
                    }
                }
                return liquidity_sol;
            }

            function createCleanToken(token) {
                const pumpLink = `https://pump.fun/${token.coinMint}`;
                const dexLink = `https://dexscreener.com/solana/${token.coinMint}`;
                const image = resolveImageUrl(token.imageUrl);
                const liquidity_sol = compute_sol(token);

                return {
                    name: token.name,
                    ticker: token.ticker,
                    image: image,
                    address: token.coinMint,
                    liquidity_sol: liquidity_sol,
                    socials: {
                        twitter: token.twitter || null,
                        telegram: token.telegram || null,
                        website: token.website || null
                    },
                    pump_link: pumpLink,
                    dex_link: dexLink,
                    timestamp: token.creationTime
                };
            }

            async function insertNewTokens(newTokens) {
                if (!supabaseClient || newTokens.length === 0) return;
                try {
                    const cleanTokens = newTokens.map(createCleanToken);
                    const inserts = cleanTokens.map(clean => {
                        const jsonStr = JSON.stringify(clean);
                        const sizeBytes = new Blob([jsonStr]).size;
                        return { data: clean, size_bytes: sizeBytes };
                    });

                    const { error } = await supabaseClient.from('tokens').insert(inserts);
                    if (error) throw error;

                    await checkAndClean();
                } catch (error) {
                    console.error('Error inserting tokens to Supabase:', error);
                    if (statusElement) {
                        statusElement.innerHTML = `<span>Failed to save new tokens.</span>`;
                        setTimeout(() => { if (statusElement) statusElement.style.display = 'none'; }, 3000);
                    }
                }
            }
        }

        async function fetchLiveTokens() {
            // Load from Supabase on first run
            if (!hasLoadedFromDb && supabaseClient) {
                await loadFromSupabase();
                hasLoadedFromDb = true;
            }

            try {
                const response = await fetch("https://api.solanawatchx.site/live-tokens");
                if (!response.ok) throw new Error('Failed to fetch live tokens');
                const { tokens } = await response.json();

                if (isInitialLoad) {
                    if(statusElement) statusElement.style.display = 'none';
                    isInitialLoad = false;
                }

                if (tokens.length === 0) return;

                // tokens already sorted newest first
                const newTokens = [];
                for (const token of tokens) {
                    if (!displayedTokens.has(token.coinMint)) {
                        // Compute liquidity_sol for new token
                        token.liquidity_sol = compute_sol(token);
                        newTokens.push(token);
                        displayedTokens.add(token.coinMint);
                        displayedTokensObjects.push(token);
                    }
                }

                // Insert new tokens to Supabase
                if (supabaseClient) {
                    await insertNewTokens(newTokens);
                }

                // Sort all
                displayedTokensObjects.sort((a,b) => b.creationTime - a.creationTime);

                // Clear and render all
                feedContainer.innerHTML = "";
                for (const token of displayedTokensObjects) {
                    const el = createTokenElement(token);
                    feedContainer.appendChild(el);
                }
                
                const MAX_FEED_LENGTH = 50;
                while (feedContainer.children.length > MAX_FEED_LENGTH) {
                    feedContainer.removeChild(feedContainer.lastChild);
                }
                // Trim local array
                displayedTokensObjects.length = Math.min(displayedTokensObjects.length, MAX_FEED_LENGTH);
            } catch (err) {
                console.error("❌ Fetch Error:", err);
                if(isInitialLoad && statusElement){
                    statusElement.innerHTML = `<span>Connection failed. Retrying...</span>`;
                }
            }
        }

        function createTokenElement(token) {
            const liquidityUSD = (token.liquidity_sol || 0) * (currentSolPrice || 0);

            const card = document.createElement('div');
            card.className = 'token-card rounded-lg p-3 sm:p-4';
            card.dataset.mint = token.coinMint;

            const socialIcons = {
                twitter: `<svg class="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg>`,
                telegram: `<svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>`,
                website: `<svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`
            };
            const twitterUrl = token.twitter;
            const telegramUrl = token.telegram;
            const websiteUrl = token.website;
            const socialsHTML = Object.entries({twitter: twitterUrl, telegram: telegramUrl, website: websiteUrl}).filter(([,url]) => url).map(([name, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white" title="${name.charAt(0).toUpperCase() + name.slice(1)}">${socialIcons[name] || ''}</a>`).join('');
            const pumpLink = `https://pump.fun/${token.coinMint}`;
            const dexLink = `https://dexscreener.com/solana/${token.coinMint}`;
            card.innerHTML = `<div class="grid grid-cols-12 gap-1 sm:gap-3 items-center"><div class="col-span-2 sm:col-span-1"><img id="img-${token.coinMint}" alt="${token.ticker}" class="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"></div><div class="col-span-5 sm:col-span-5 flex flex-col justify-center gap-0.5"><div class="flex items-center space-x-1 sm:space-x-2"><p class="font-bold text-white text-sm">${token.ticker}</p><div class="flex items-center space-x-1 sm:space-x-1.5">${socialsHTML}</div></div><div class="flex items-center space-x-1 sm:space-x-2 text-xs text-gray-400"><span class="truncate max-w-[80px] sm:max-w-[120px]" title="${token.name}">${token.name}</span><span class="text-gray-500">•</span><span>${formatAge(token.creationTime)}</span></div><div class="copy-address-container flex items-center space-x-1 cursor-pointer hover:text-white" title="Copy Address"><span class="font-mono token-address text-xs">${token.coinMint.substring(0, 4)}...${token.coinMint.substring(token.coinMint.length - 4)}</span><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></div></div><div class="col-span-2 sm:col-span-3 grid grid-cols-1 gap-1 sm:gap-2 text-xs text-center"><div><div class="text-gray-500">Liq</div><div class="font-semibold text-white">${formatNum(liquidityUSD)}</div></div></div><div class="col-span-3 sm:col-span-3 flex items-center justify-end space-x-1 sm:space-x-2"><a href="${pumpLink}" target="_blank" rel="noopener noreferrer" class="action-btn p-1.5 sm:p-2 rounded-md" title="Buy on Pump.fun"><svg class="w-3 h-3 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 13.5L12 18L7.5 13.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 6V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></a><a href="${dexLink}" target="_blank" rel="noopener noreferrer" class="action-btn p-1.5 sm:p-2 rounded-md" title="View on DexScreener"><svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg></a></div></div>`;
            const imgElement = card.querySelector(`#img-${token.coinMint}`);
            loadImageWithFallback(imgElement, token.imageUrl, token.coinMint);
            const copyContainer = card.querySelector('.copy-address-container');
            const addressText = card.querySelector('.token-address');
            copyContainer.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                navigator.clipboard.writeText(token.coinMint); 
                const original = addressText.textContent; 
                addressText.textContent = "Copied!"; 
                setTimeout(() => { addressText.textContent = original; }, 1500); 
            });
            return card;
        }

        function compute_sol(token) {
            let liquidity_sol = 0;
            let dev_held = 0;
            for (const h of token.holders) {
                if (h.holderId === token.dev) {
                    dev_held = h.totalTokenAmountHeld;
                    break;
                }
            }
            if (dev_held > 0) {
                const TOKEN_DECIMALS = 6;
                const dev_token_units = BigInt(Math.floor(dev_held * Math.pow(10, TOKEN_DECIMALS)));
                const INITIAL_VIRTUAL_SOL = 30000000000n;
                const INITIAL_VIRTUAL_TOKEN = 1073000000000000n;
                const k = INITIAL_VIRTUAL_SOL * INITIAL_VIRTUAL_TOKEN;
                const new_virtual_token = INITIAL_VIRTUAL_TOKEN - dev_token_units;
                if (new_virtual_token > 0n) {
                    const new_virtual_sol = k / new_virtual_token;
                    const delta_lamports = new_virtual_sol - INITIAL_VIRTUAL_SOL;
                    liquidity_sol = Number(delta_lamports) / 1e9;
                }
            }
            return liquidity_sol;
        }

        // --- start polling ---
        fetchLiveTokens();
        setInterval(fetchLiveTokens, POLLING_INTERVAL_MS);
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
                        <a href="${item.source_url}" target="_blank" rel="noopener noreferrer" class="font-semibold text-green-400 hover:text-green-300">Read Source →</a>
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
