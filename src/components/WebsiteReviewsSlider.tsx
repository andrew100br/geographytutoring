"use client";
import { useEffect, useState, useCallback } from 'react';

type Review = { text: string; author: string; date: string; stars: number };

export default function WebsiteReviewsSlider() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetch('/.netlify/functions/public-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_approved_reviews' }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.reviews && data.reviews.length > 0) {
          setReviews(data.reviews.map((r: any) => ({
            text: r.review_text,
            author: r.reviewer_name,
            date: new Date(r.submitted_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
            stars: r.rating,
          })));
        }
      })
      .catch(() => {});
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % reviews.length);
  }, [reviews.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + reviews.length) % reviews.length);
  }, [reviews.length]);

  useEffect(() => {
    if (reviews.length === 0) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [nextSlide, reviews.length]);

  if (reviews.length === 0) return null;

  return (
    <div className="testimonials-container" style={{ opacity: 1 }}>
      <div className="testimonial-slider">
        {reviews.map((review, i) => (
          <div key={i} className={`testimonial slide ${i === currentSlide ? 'active' : ''}`}>
            <div className="stars">
              {[...Array(review.stars)].map((_, idx) => (
                <i key={idx} className="ph-fill ph-star"></i>
              ))}
            </div>
            <p className="review-text">"{review.text}"</p>
            <p className="author">- {review.author}</p>
            <span className="review-date">{review.date}</span>
          </div>
        ))}
      </div>

      <div className="slider-controls">
        <button className="slider-btn prev-btn" aria-label="Previous Review" onClick={prevSlide}>
          <i className="ph ph-caret-left"></i>
        </button>
        <div className="slider-dots">
          {reviews.map((_, i) => (
            <button
              key={i}
              className={`dot ${i === currentSlide ? 'active' : ''}`}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setCurrentSlide(i)}
            ></button>
          ))}
        </div>
        <button className="slider-btn next-btn" aria-label="Next Review" onClick={nextSlide}>
          <i className="ph ph-caret-right"></i>
        </button>
      </div>
    </div>
  );
}
