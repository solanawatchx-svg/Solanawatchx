document.addEventListener("DOMContentLoaded", () => {
    // --- Intersection Observer for animations ---
    const animatedElements = document.querySelectorAll('.scroll-animate');
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1
        });
        animatedElements.forEach(el => observer.observe(el));
    } else {
        // Fallback for older browsers
        animatedElements.forEach(el => el.classList.add('is-visible'));
    }

    // --- Supabase Whitelist Counter ---
    const SUPABASE_URL = 'https://dyferdlczmzxurlfrjnd.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5ZmVyZGxjem16eHVybGZyam5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MjYxMDMsImV4cCI6MjA3NDIwMjEwM30.LTXkmO2MkqYqg4g7Bv7H8u1rgQnDnQ43FDaT7DzFAt8';
    
    // Check if the Supabase client library is loaded
    if (typeof supabase === 'undefined') {
        console.error('Supabase client not loaded. Make sure the script tag is included in your HTML.');
        return;
    }
    
    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    async function updateWhitelistCounter() {
        try {
            const counterElement = document.getElementById('whitelist-counter');
            const progressBarElement = document.getElementById('progress-bar');
            const maxSpots = 500;

            if (!counterElement || !progressBarElement) {
                console.error('Counter or progress bar element not found.');
                return;
            }

            counterElement.textContent = 'Loading...';

            // Fetch the count of rows from the 'whitelist' table efficiently
            const { count, error } = await supabaseClient
                .from('whitelist')
                .select('*', { count: 'exact', head: true });

            if (error) {
                throw error;
            }

            if (count !== null) {
                const currentCount = Math.min(count, maxSpots); // Ensure count doesn't exceed max
                counterElement.textContent = `${currentCount} / ${maxSpots} Spots Filled`;
                const percentage = (currentCount / maxSpots) * 100;
                progressBarElement.style.width = `${percentage}%`;
            } else {
                // Handle case where count is null (e.g., table is empty)
                counterElement.textContent = `0 / ${maxSpots} Spots Filled`;
                progressBarElement.style.width = `0%`;
            }

        } catch (error) {
            console.error('Error fetching whitelist count:', error.message);
            const counterElement = document.getElementById('whitelist-counter');
            if (counterElement) {
               counterElement.textContent = 'Could not load count';
            }
        }
    }

    // Fetch the count as soon as the DOM is ready
    updateWhitelistCounter();
});


