"use client";
import { useState } from 'react';

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // We don't preventDefault here because we want the form to submit to the hidden iframe
    setIsSubmitting(true);
    
    // Show success message after a tiny delay to allow the browser to initiate the submission
    setTimeout(() => {
      setStatus({ type: 'success', message: 'Message sent! I will get back to you shortly.' });
      setIsSubmitting(false);
    }, 1000);
  };

  if (status.type === 'success') {
    return (
      <div style={{
        padding: '2.5rem',
        borderRadius: '15px',
        backgroundColor: '#f0fdf4',
        border: '3px solid #22c55e',
        textAlign: 'center',
        margin: '1rem 0',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        <i className="ph ph-check-box" style={{ fontSize: '3.5rem', color: '#22c55e', marginBottom: '1rem', display: 'block' }}></i>
        <h3 style={{ color: '#166534', margin: '0 0 0.5rem 0', fontSize: '1.8rem', fontWeight: 800 }}>Message Sent!</h3>
        <p style={{ color: '#166534', margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>I will get back to you as soon as possible.</p>
        <button 
          onClick={() => setStatus({ type: null, message: '' })}
          className="btn btn-secondary"
          style={{ marginTop: '2rem', padding: '0.6rem 1.2rem', fontWeight: 600, background: '#fff' }}
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <>
      <iframe name="hidden_iframe" id="hidden_iframe" style={{ display: 'none' }}></iframe>
      <form 
        id="booking-form" 
        className="booking-form" 
        action="https://formsubmit.co/andrew100br@gmail.com" 
        method="POST" 
        target="hidden_iframe"
        onSubmit={handleSubmit}
      >
        {/* FormSubmit Configuration */}
        <input type="hidden" name="_captcha" value="false" />
        <input type="hidden" name="_template" value="table" />
        <input type="hidden" name="_subject" value="New Inquiry from Geographic Tutoring Portal" />

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
        <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting} style={{ fontSize: '1.1rem', fontWeight: 600 }}>
          {isSubmitting ? 'Sending...' : 'Send Inquiry'}
        </button>
      </form>
    </>
  );
}
