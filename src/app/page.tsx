"use client";
import React, { useEffect } from 'react';
import Link from 'next/link';
import ReviewsSlider from '@/components/ReviewsSlider';
import WebsiteReviewsSlider from '@/components/WebsiteReviewsSlider';
import ContactForm from '@/components/ContactForm';

export default function Home() {
  useEffect(() => {
    if (!sessionStorage.getItem('visit_tracked')) {
      fetch('/.netlify/functions/track-visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: '/' }) }).catch(() => {});
      sessionStorage.setItem('visit_tracked', '1');
    }
  }, []);

  useEffect(() => {
    // Scroll Reveal Animations
    const revealElements = document.querySelectorAll('.reveal');
    const revealOptions = {
      threshold: 0.15,
      rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, revealOptions);

    revealElements.forEach(el => revealOnScroll.observe(el));

    // Smooth Scrolling for Anchor Links
    const handleAnchorClick = (e: Event) => {
      const target = e.currentTarget as HTMLAnchorElement;
      const targetId = target.getAttribute('href');
      
      if (targetId && targetId.startsWith('#') && targetId !== '#') {
        e.preventDefault();
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          const headerOffset = 80;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      }
    };

    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach(anchor => anchor.addEventListener('click', handleAnchorClick));

    return () => {
      revealElements.forEach(el => revealOnScroll.unobserve(el));
      anchors.forEach(anchor => anchor.removeEventListener('click', handleAnchorClick));
    };
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section id="hero" className="hero section">
        <div className="container hero-container">
          <div className="hero-content reveal">
            <span className="eyebrow"></span>
            <h1 className="hero-title" style={{ lineHeight: 1.2 }}>
              <span style={{ display: 'block', marginBottom: '0.2rem' }}>Geography</span>
              <span
                style={{ display: 'block', fontSize: '0.65em', fontWeight: 500, marginBottom: '0.8rem', color: '#2d3748' }}>From
                Engaging Learning to Exam Excellence</span>
              <span
                style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontSize: '0.35em', fontStyle: 'italic', fontWeight: 500, color: '#718096', letterSpacing: '0.5px' }}>Pearson
                Edexcel | Cambridge IGCSE | AQA</span>
            </h1>
            <p className="hero-subtitle">
              Welcome, parents and students! With 14+ years of teaching experience, I help students master
              geographic concepts, prepare for exams, and understand the world around them through engaging,
              dialogue-rich lessons.
            </p>
            <div className="hero-actions">
              <Link href="#services" className="btn btn-primary">Explore Services</Link>
              <Link href="#contact" className="btn btn-secondary">Have a Question?</Link>
            </div>
          </div>
          {/* Hero Image */}
          <div className="hero-visual reveal reveal-delay">
            <div className="globe-container">
              <img src="/hero-globe.png" alt="Stunning photo of Earth from space" className="world-image" />
              <div className="globe-shadow"></div>
            </div>
          </div>
        </div>
        {/* Decorative Background Element */}
        <div className="blob-bg"></div>
      </section>

      {/* Video Section */}
      <section className="section bg-light" style={{ paddingBottom: 0 }}>
        <div className="container">
          <div className="section-header reveal" style={{ marginBottom: '2rem' }}>
            <h2>See Geography Come to Life</h2>
            <p>Watch Teacher Andrew in action — engaging, expert, and built around your child&apos;s success.</p>
          </div>
          <div className="video-wrapper reveal">
            <div className="video-frame">
              <iframe
                src="https://player.vimeo.com/video/1185858329?badge=0&autopause=0&player_id=0&app_id=58479"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                allowFullScreen
                title="Teacher Andrew - Geography Tutoring"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="services section bg-light">
        <div className="container">
          <div className="section-header reveal">
            <h2>Tutoring Services</h2>
            <p><strong>All lessons are conducted online via Zoom</strong> at accessibly low prices, because this is passion driven teaching and every student deserves a chance!</p>
          </div>

          <div className="services-grid">
            {/* Service 1 */}
            <div className="service-card reveal">
              <div className="card-icon"><i className="ph ph-handshake"></i></div>
              <h3>30 Minute Trial Lesson</h3>
              <p className="price">Free</p>
              <p className="desc">A relaxed introductory session to discuss your goals, assess current
                understanding, and see if my teaching style is a good fit for your child.</p>
              <ul className="features">
                <li><i className="ph ph-check-circle"></i> Needs assessment</li>
                <li><i className="ph ph-check-circle"></i> Meet and greet</li>
                <li><i className="ph ph-check-circle"></i> Short activity</li>
              </ul>
              <Link href="#contact" className="btn btn-card">Book Trial</Link>
            </div>

            {/* Service 2 */}
            <div className="service-card reveal reveal-delay-1">
              <div className="card-icon"><i className="ph ph-student"></i></div>
              <h3>Pay As You Go</h3>
              <p className="price">£30 <span>/ session</span></p>
              <p className="desc">Flexible, one-off lessons. Perfect for targeted help with specific topics, exam
                revision, or homework support.</p>
              <ul className="features">
                <li><i className="ph ph-check-circle"></i> 50-minute lesson</li>
                <li><i className="ph ph-check-circle"></i> Custom materials</li>
                <li><i className="ph ph-check-circle"></i> No commitment</li>
              </ul>
              <Link href="#contact" className="btn btn-card">Book Session</Link>
            </div>

            {/* Service 3 */}
            <div className="service-card highlight reveal reveal-delay-2">
              <div className="badge">10% Off</div>
              <div className="card-icon"><i className="ph ph-stack"></i></div>
              <h3>10-Lesson Package</h3>
              <p className="price">£270 <span>/ package</span></p>
              <p className="desc">Commit to your progress and save! Buy a bundle of 10 lessons upfront and receive
                a 10% discount on the standard rate.</p>
              <ul className="features">
                <li><i className="ph ph-check-circle"></i> Ten 50-min lessons</li>
                <li><i className="ph ph-check-circle"></i> Priority scheduling</li>
                <li><i className="ph ph-check-circle"></i> Access to lesson notes</li>
              </ul>
              <Link href="/booking" className="btn btn-primary btn-full">Buy Package</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="reviews section">
        <div className="container">
          <div className="section-header reveal">
            <h2>Student Success</h2>
            <p>Over 1,270 lessons taught to students worldwide.</p>
          </div>

          <div className="reviews-columns">
            <ReviewsSlider />
            <WebsiteReviewsSlider />
          </div>

          <div className="stats-row reveal">
            <div className="stat">
              <span className="stat-number">14+</span>
              <span className="stat-label">Years Experience</span>
            </div>
            <div className="stat">
              <span className="stat-number">1k+</span>
              <span className="stat-label">Lessons Taught</span>
            </div>
            <div className="stat">
              <span className="stat-number">100%</span>
              <span className="stat-label">Subject Passion</span>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about section bg-light">
        <div className="container about-container">
          <div className="about-image-wrapper reveal">
            <div className="about-image">
              <img src="/profile-photo.jpg" alt="Teacher Andrew Profile Photo" />
            </div>
            <div className="experience-badge">
              <span>Secondary Geography and History Teacher</span>
              <small>Current Role</small>
            </div>
          </div>
          <div className="about-content reveal reveal-delay">
            <h2>Meet Teacher Andrew</h2>
            <p>I am a passionate and experienced Geography educator, currently teaching secondary geography and history in school to a wide range of students.</p>
            <p>My academic background includes a <strong>BSc in Environmental Hazards and Disaster Management</strong> from <strong>Kingston University, London</strong>, a <strong>Masters in Crisis and Disaster Management</strong> from <strong>Portsmouth University</strong>, and a <strong>PGCE in Secondary Geography</strong> from <strong>Brighton University, United Kingdom</strong>.</p>
            <p>I believe that geography is not just about memorizing facts, but understanding the complex
              relationships that shape our world. My lessons focus on active dialogue, critical thinking, and
              equipping students with the skills they need to excel in their exams and become global citizens.
            </p>

            <ul className="qualifications">
              <li><i className="ph ph-graduation-cap"></i> PGCE Secondary Geography</li>
              <li><i className="ph ph-certificate"></i> MA Environmental Hazards</li>
              <li><i className="ph ph-chalkboard-teacher"></i> 14 Years Teaching Experience</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contact/Booking Section */}
      <section id="contact" className="contact section">
        <div className="container contact-container">
          <div className="contact-info reveal">
            <h2>Ready to start learning?</h2>
            <p>Whether you're looking to ask a quick question or are ready to set up an account and book a
              lesson in your local timezone, select an option below.</p>

            <div className="contact-methods">
              <div className="method" style={{ flex: 1, maxWidth: '100%' }}>
                <div className="method-icon"><i className="ph ph-calendar-plus"></i></div>
                <div>
                  <h4>Create Account & Book</h4>
                  <p>View my availability in your local timezone and book instantly.</p>
                  <Link href="/booking" className="btn btn-primary"
                    style={{ marginTop: '10px', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Go to Booking
                    Portal</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-wrapper reveal reveal-delay">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
