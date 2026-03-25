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

    try {
      // Use no-cors mode to ensure the browser doesn't block the response. 
      // FormSubmit will still receive the data and send the email.
      await fetch('https://formsubmit.co/ajax/andrew100br@gmail.com', {
        method: 'POST',
        mode: 'no-cors',
        body: formData, // FormData automatically sets the right content-type
      });

      // Since we are in no-cors mode, we can't inspect the response, 
      // but if the fetch itself didn't throw, we assume the browser sent it.
      e.currentTarget.reset();
      setStatus({ type: 'success', message: 'Message sent! I will get back to you shortly.' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Error sending message. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form id="booking-form" className="booking-form" onSubmit={handleSubmit}>
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
