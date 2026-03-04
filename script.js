document.addEventListener('DOMContentLoaded', () => {

    // -----------------------------------------
    // 1. Navigation Scroll Effect
    // -----------------------------------------
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // -----------------------------------------
    // 2. Scroll Reveal Animations
    // -----------------------------------------
    // Using Intersection Observer to trigger animations when elements enter viewport
    const revealElements = document.querySelectorAll('.reveal');

    const revealOptions = {
        threshold: 0.15, // Trigger when 15% of element is visible
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver(function (entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('active');
                // Optional: Stop observing once revealed if you don't want it to repeat
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealOnScroll.observe(el);
    });

    // -----------------------------------------
    // 3. Smooth Scrolling for Anchor Links
    // -----------------------------------------
    // Makes clicking on nav links or buttons scroll smoothly to the section
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                // Adjust for fixed header height
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    // -----------------------------------------
    // 4. Testimonial Carousel
    // -----------------------------------------
    const slides = document.querySelectorAll('.testimonial.slide');
    const dotsContainer = document.getElementById('slider-dots');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    let currentSlide = 0;
    let slideInterval;

    if (slides.length > 0) {
        // Create dots dynamically based on number of slides
        slides.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.classList.add('dot');
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                goToSlide(i);
                resetInterval();
            });
            dotsContainer.appendChild(dot);
        });

        const dots = document.querySelectorAll('.dot');

        function goToSlide(n) {
            slides[currentSlide].classList.remove('active');
            dots[currentSlide].classList.remove('active');

            // Handle wrapping
            currentSlide = (n + slides.length) % slides.length;

            slides[currentSlide].classList.add('active');
            dots[currentSlide].classList.add('active');
        }

        function nextSlide() {
            goToSlide(currentSlide + 1);
        }

        function prevSlide() {
            goToSlide(currentSlide - 1);
        }

        function startInterval() {
            slideInterval = setInterval(nextSlide, 6000); // Auto-advance every 6 seconds
        }

        function resetInterval() {
            clearInterval(slideInterval);
            startInterval();
        }

        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetInterval();
        });

        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetInterval();
        });

        // Start auto-play
        startInterval();
    }

    // -----------------------------------------
    // 5. Form Submission Handling
    // -----------------------------------------
    const bookingForm = document.getElementById('booking-form');
    const formStatus = document.getElementById('form-status');

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent basic submission

            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;

            submitBtn.innerText = 'Sending...';
            submitBtn.disabled = true;

            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim().toLowerCase();
            const service = document.getElementById('service').value;
            const message = document.getElementById('message').value.trim();
            const fullMessage = `Interested Service: ${service}\n\n${message}`;

            try {
                const res = await fetch('/.netlify/functions/public-action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'submit_contact_form',
                        data: { name, email, message: fullMessage }
                    })
                });

                if (!res.ok) {
                    throw new Error("Failed to send inquiry.");
                }

                formStatus.style.color = 'green';
                formStatus.style.marginTop = '1rem';
                formStatus.innerText = 'Thank you! Your inquiry has been sent. Teacher Andrew will reply via the portal soon.';

                bookingForm.reset();
            } catch (err) {
                console.error(err);
                formStatus.style.color = '#dc2626';
                formStatus.style.marginTop = '1rem';
                formStatus.innerText = 'Error sending inquiry. Please try again later.';
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
                setTimeout(() => {
                    formStatus.innerText = '';
                }, 5000);
            }
        });
    }

    // -----------------------------------------
    // 5. Simple Mobile Menu Toggle Concept
    // -----------------------------------------
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            // Note: Add CSS for a proper mobile menu slide-out in a v2
            if (navLinks.style.display === 'flex') {
                navLinks.style.display = 'none';
            } else {
                navLinks.style.display = 'flex';
                navLinks.style.flexDirection = 'column';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '100%';
                navLinks.style.left = '0';
                navLinks.style.width = '100%';
                navLinks.style.background = '#fff';
                navLinks.style.padding = '1rem';
                navLinks.style.boxShadow = '0 10px 10px rgba(0,0,0,0.1)';
            }
        });
    }

});
