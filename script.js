document.addEventListener("DOMContentLoaded", () => {
    const animatedElements = document.querySelectorAll('.scroll-animate');

    // Use Intersection Observer for modern browsers for better performance
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    // Stop observing the element once the animation is triggered
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1 // Trigger animation when 10% of the element is visible
        });

        animatedElements.forEach(el => {
            observer.observe(el);
        });
    } else {
        // Fallback for older browsers that don't support Intersection Observer
        // This will make all animated elements visible at once without scrolling.
        animatedElements.forEach(el => {
            el.classList.add('is-visible');
        });
    }
});

