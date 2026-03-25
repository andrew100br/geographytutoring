"use client";
import { useState } from 'react';

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: null, message: '' });

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      service: formData.get('service'),
      message: formData.get('message'),
    };

    try {
      const res = await fetch('https://formsubmit.co/ajax/andrew100br@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok || resData.success === 'false') throw new Error(resData.message || 'Failed to send message.');

      e.currentTarget.reset();
      setStatus({ type: 'success', message: 'Message sent successfully! I will reply soon.' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Error sending message. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id="booking-form" className="booking-form" onSubmit={handleSubmit}>
      <h3>Send a Message</h3>
      <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem', color: 'var(--text-light)' }}>
        Fill out the form below and it will be sent directly to my email. I will reply to you as soon as possible.
      </p>
      <div className="form-group">
        <label htmlFor="name">Parent/Student Name</label>
        <input type="text" id="name" name="name" required placeholder="Tilly Lamai" />
      </div>
      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input type="email" id="email" name="email" required placeholder="tilly@example.com" />
      </div>
      <div className="form-group">
        <label htmlFor="service">Interested Service</label>
        <select id="service" name="service" defaultValue="trial">
          <option value="trial">Free Trial Lesson</option>
          <option value="payg">Pay As You Go Session</option>
          <option value="monthly">Monthly Subscription</option>
          <option value="question">Just a Question</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" rows={4} required placeholder="Tell me about your learning goals or what you need help with..."></textarea>
      </div>
      <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send Inquiry'}
      </button>
      {status.type && (
        <p className="form-status" style={{ color: status.type === 'success' ? '#16a34a' : '#dc2626' }}>
          {status.type === 'success' && <i className="ph ph-check-circle"></i>} {status.message}
        </p>
      )}
    </form>
  );
}
