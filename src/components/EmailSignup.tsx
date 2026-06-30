"use client";
import { useState } from 'react';

export default function EmailSignup() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;

    try {
      const res = await fetch('/.netlify/functions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="email-signup-box">
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <i className="ph ph-check-circle" style={{ fontSize: '2.5rem', color: '#22c55e', display: 'block', marginBottom: '0.5rem' }}></i>
          <h3 style={{ margin: '0 0 0.5rem' }}>You&apos;re signed up!</h3>
          <p style={{ margin: 0, color: '#64748b' }}>Thank you — you&apos;ll receive new Geography study guides straight to your inbox each month.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="email-signup-box">
      <div className="email-signup-inner">
        <div className="email-signup-text">
          <h3><i className="ph ph-envelope-simple"></i> Get Free Monthly Study Guides</h3>
          <p>Join students and parents who receive a new Geography revision guide every month — expert tips from Teacher Andrew, straight to your inbox.</p>
        </div>
        <form className="email-signup-form" onSubmit={handleSubmit}>
          <div className="email-signup-fields">
            <input type="text" name="name" required placeholder="Your name" className="email-signup-input" />
            <input type="email" name="email" required placeholder="Your email address" className="email-signup-input" />
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Signing up...' : 'Subscribe Free'}
            </button>
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>}
          <p className="email-signup-note">One email per month. No spam. Unsubscribe at any time.</p>
        </form>
      </div>
    </div>
  );
}
