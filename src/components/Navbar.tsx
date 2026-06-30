"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container nav-content">
        <Link href="/" className="logo">
          <i className="ph ph-globe-hemisphere-west"></i>
          Teacher Andrew
        </Link>
        <nav className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`}>
          <Link href="/#services" onClick={() => setIsMobileMenuOpen(false)}>Services</Link>
          <Link href="/#reviews" onClick={() => setIsMobileMenuOpen(false)}>Reviews</Link>
          <Link href="/#about" onClick={() => setIsMobileMenuOpen(false)}>About Me</Link>
          <Link href="/blog" onClick={() => setIsMobileMenuOpen(false)}>Blog</Link>
          <Link href="/policies" onClick={() => setIsMobileMenuOpen(false)}>Policies</Link>
          <Link href="/booking" onClick={() => setIsMobileMenuOpen(false)} style={{ fontWeight: 600, color: 'var(--primary-color)' }}>Booking Portal</Link>
          <Link href="/#contact" onClick={() => setIsMobileMenuOpen(false)} className="btn btn-primary">Contact</Link>
        </nav>
        <button
          className="mobile-menu-btn"
          aria-label="Toggle menu"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <i className={`ph ph-${isMobileMenuOpen ? 'x' : 'list'}`}></i>
        </button>
      </div>
    </header>
  );
}
