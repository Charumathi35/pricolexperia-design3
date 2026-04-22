document.addEventListener("DOMContentLoaded", function () {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    // Initial Hero Animation
    const heroTl = gsap.timeline();
    heroTl.from(".hero-left > *", {
        y: 50,
        opacity: 0,
        duration: 0.5,
        stagger: 0.2,
        ease: "power3.out"
    });

    const sections = gsap.utils.toArray(".comparisonSection");
    const container = document.querySelector(".scroll-container");
    const hero = document.querySelector(".hero-section");

    // Set initial visibility states for brand sections
    sections.forEach((section, i) => {
        gsap.set(section, { autoAlpha: i === 0 ? 1 : 0, zIndex: i });
    });

    // 2. Horizontal Wipe Effect for Company Brands
    const wipeTl = gsap.timeline({
        scrollTrigger: {
            trigger: ".scroll-container",
            pin: true,
            start: "top top",
            end: "+=" + (sections.length * 280) + "%", // Adjusted for more smooth distance
            scrub: 1, // Tighter scrub for better manual control
            pinSpacing: true,
            id: "wipe-trigger",
            snap: {
                snapTo: "labels",
                duration: { min: 0.2, max: 0.8 },
                delay: 0.1,
                ease: "power1.inOut"
            },
            onLeave: () => document.querySelector(".brand-nav").classList.add("hidden"),
            onEnterBack: () => document.querySelector(".brand-nav").classList.remove("hidden"),
            onUpdate: (self) => {
                const totalItems = sections.length; // 6 items: Intro + 5 Brands
                const progress = self.progress;

                // Map progress to current item index (0-5)
                const currentIndex = Math.round(progress * (totalItems - 1));

                // Intro = index 0 => no brand active but nav visible
                // Brands = index 1-5 => brand 0-4 active
                if (currentIndex === 0) {
                    updateActiveNavItem(-1); // On Intro: no brand icon active
                } else {
                    updateActiveNavItem(currentIndex - 1);
                }

                // Always show brand nav while in the scroll container
                document.querySelector(".brand-nav").classList.remove("hidden");
            }
        }
    });

    // Navigation visibility is now fully managed via the 'hidden' class toggles above
    // Show brand nav immediately (visible from intro)
    document.querySelector(".brand-nav").classList.remove("hidden");

    sections.forEach((section, i) => {
        // Labeling for each brand/section
        const brandId = (i === 0) ? "intro" : "brand-" + (i - 1);

        if (i === 0) {
            wipeTl.addLabel("intro");
            return;
        }

        // ALL Transitions use HORIZONTAL WIPE (including Intro -> Travel)
        const isRightToLeft = i % 2 !== 0;
        const img = section.querySelector(".afterImage img");
        const textArea = section.querySelector(".text-overlay-container");

        // For i === 1, fade out the hero content instead of a previous text overlay
        const prevTextArea = (i === 1) ? null : sections[i - 1].querySelector(".text-overlay-container");

        const containerStart = isRightToLeft ? 100 : -100;
        const imageStart = isRightToLeft ? -100 : 100;

        wipeTl.set(section, { autoAlpha: 1, zIndex: 10 + i });

        // Fade out the previous layer's content
        if (i === 1) {
            // Intro -> Travel: fade out hero content
            wipeTl.to(".hero-content", { opacity: 0, duration: 3.5, ease: "power2.inOut" });
        } else {
            wipeTl.to(prevTextArea, { opacity: 0, duration: 3.5, ease: "power2.inOut" });
        }

        // Horizontal wipe in the new section
        wipeTl.fromTo(section, { xPercent: containerStart }, { xPercent: 0, duration: 3.5, ease: "power2.inOut" }, "<")
            .fromTo(img, { xPercent: imageStart }, { xPercent: 0, duration: 3.5, ease: "power2.inOut" }, "<")
            .fromTo(textArea, { xPercent: imageStart, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 3.5, ease: "power2.inOut" }, "<")
            .addLabel(brandId) // Snap point when fully visible
            .to({}, { duration: 1.0 }); // Hold at this section
    });


    // Brand Navigation Click Handlers
    const navItems = document.querySelectorAll(".brand-nav-item");
    navItems.forEach((item, i) => {
        item.addEventListener("click", () => {
            const st = ScrollTrigger.getById("wipe-trigger");
            if (!st) return;

            // Stop auto-scroll before manual override
            handleUserInteraction();

            // Calculate the absolute scroll position for this specific brand
            // Since sections[0] is Intro, Brands correspond to sections[1] to [5]
            const sectionIndex = i + 1;
            const scrollPos = st.start + (st.end - st.start) * (sectionIndex / (sections.length - 1));

            // RE-ORIENT DIRECTION: 
            isYoyoBack = (i === navItems.length - 1);

            gsap.to(window, {
                scrollTo: scrollPos,
                duration: 1.2,
                ease: "power2.inOut",
                onComplete: () => {
                    resumeAutoScroll(3000);
                }
            });
        });
    });

    function updateActiveNavItem(index) {
        navItems.forEach((item, i) => {
            item.classList.toggle("active", i === index);
        });
    }

    // 3. Continuous Auto-Scroll Logic with Interaction Handling
    let autoScrollTween;
    let resumeTimeout;
    let initialScrollTween;
    let isYoyoBack = false;

    function startAutoScroll() {
        const st = ScrollTrigger.getById("wipe-trigger");
        if (!st) return;

        const startPos = 0; // Start at the very top (Intro)
        const endPos = document.documentElement.scrollHeight - window.innerHeight; // End at the very bottom (Footer)
        const currentPos = window.scrollY;

        // If very close to end, switch direction
        if (Math.abs(currentPos - endPos) < 20) isYoyoBack = true;
        if (Math.abs(currentPos - startPos) < 20) isYoyoBack = false;

        const target = isYoyoBack ? startPos : endPos;
        const distanceLeft = Math.abs(currentPos - target);
        const totalDistance = Math.abs(endPos - startPos);
        const baseDuration = (sections.length + 1) * 3; // Harmonized Speed, adjusted for footer span

        const duration = (distanceLeft / totalDistance) * baseDuration;

        if (autoScrollTween) autoScrollTween.kill();

        autoScrollTween = gsap.to(window, {
            scrollTo: target,
            duration: Math.max(duration, 0.5),
            ease: "none",
            onComplete: () => {
                isYoyoBack = !isYoyoBack;
                // Add a hold delay at the end before reversing
                resumeTimeout = setTimeout(startAutoScroll, 1000);
            }
        });

        // Ensure global listeners are active
        if (!window.hasAutoScrollListeners) {
            window.addEventListener("wheel", handleUserInteraction);
            window.addEventListener("touchstart", handleUserInteraction);
            document.addEventListener("mouseleave", () => resumeAutoScroll(1000));
            window.hasAutoScrollListeners = true;
        }
    }

    // Change Resume Check logic: Resume only if mouse is NOT in the window
    let isMouseInWindow = false;

    function handleUserInteraction() {
        if (autoScrollTween) {
            autoScrollTween.pause();
            clearTimeout(resumeTimeout);
        }
        if (initialScrollTween) {
            initialScrollTween.kill();
        }
    }

    function resumeAutoScroll(delay) {
        clearTimeout(resumeTimeout);
        resumeTimeout = setTimeout(() => {
            // Only resume if mouse is actually outside the browser window
            if (!isMouseInWindow) {
                startAutoScroll();
            }
        }, delay);
    }

    // New Global Window Listeners for Hover-Stop
    document.addEventListener("mouseenter", () => {
        isMouseInWindow = true;
        handleUserInteraction();
    });

    document.addEventListener("mouseleave", () => {
        isMouseInWindow = false;
        resumeAutoScroll(1000);
    });

    document.addEventListener("mousemove", () => {
        // Any movement within the screen also ensures it's stopped/pushed back
        isMouseInWindow = true;
        handleUserInteraction();
    });

    // Handle touch separately to allow auto-scroll on touch devices once interaction stops
    document.addEventListener("touchstart", () => {
        handleUserInteraction();
        // Touch doesn't mean mouse is in window
        setTimeout(() => resumeAutoScroll(3000), 100);
    });

    // 4. Initial scroll transition is handled below
    // No extra footer trigger needed as it's handled by 'onLeave' on the main wipe-trigger

    // Initial scroll from landing (Ultra Smooth Transition)
    initialScrollTween = gsap.to(window, {
        scrollTo: { y: ".scroll-container", autoKill: true },
        duration: 1.5, // More deliberate and smooth
        delay: 2,    // Allow user to read the hero section first
        ease: "power2.inOut",
        onComplete: () => {
            if (!isMouseInWindow) {
                startAutoScroll();
            }
        }
    });

    window.addEventListener('load', function () {
        document.body.classList.add('page-loaded');
    });

    // Scroll to Top functionality
    const scrollTopBtn = document.getElementById("scrollToTopBtn");

    if (scrollTopBtn) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > window.innerHeight / 2) {
                scrollTopBtn.classList.add("visible");
            } else {
                scrollTopBtn.classList.remove("visible");
            }
        });

        scrollTopBtn.addEventListener("click", () => {
            handleUserInteraction(); // Stop auto-scroll temporarily
            gsap.to(window, {
                scrollTo: "max",
                duration: 1.5,
                ease: "power2.inOut",
                onComplete: () => {
                    resumeAutoScroll(3000); // Resume auto scroll after 3s
                }
            });
        });
    }

    // Global function for Scroll to Explore button
    window.scrollToFirstBrand = function () {
        handleUserInteraction();
        gsap.to(window, {
            scrollTo: ".scroll-container",
            duration: 1.2,
            ease: "power2.inOut"
        });
    };

});
