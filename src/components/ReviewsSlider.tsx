"use client";
import { useEffect, useState, useCallback } from 'react';

const reviews = [
  { text: "Andrew is very responsible and teaches concepts very well", author: "Jasmine", date: "April 2024", stars: 5 },
  { text: "Wow, amazing tutor so knowledgeable🤩🤩🤩 Also very kind tutor and understanding I would totally recommend him for geography wow☺️☺️☺️ A definite five star from me!!⭐️⭐️⭐️⭐️⭐️", author: "George", date: "August 2023", stars: 5 },
  { text: "Andrew is a great tutor, and he is patient and professional. I am fortunate to meet him, and my son Tony's geography performance is improved. Tony looks forward to his weekly classes, which do very well.", author: "Anonymous Parent", date: "April 2023", stars: 5 },
  { text: "Andrew is a phenomenal tutor. He always went above and beyond to make sure that my son understood all concepts well. His teaching was always very well organised and tailored to the specific needs of my son...", author: "Anonymous Parent", date: "November 2023", stars: 5 },
  { text: "Andrew is an excellent teacher. He is patient and keeps son engaged. Andrew has been very flexible to work with and has catered to my son’s needs.", author: "PS", date: "April 2023", stars: 5 },
  { text: "Great and dedicated tutor who is well versed in the syllabus content and has been a great help to me. Thank you, Andrew!", author: "Tilly", date: "April 2023", stars: 5 },
  { text: "Dear Mr. Andrew, I wanted to take a moment to express my gratitude for all your efforts... Since you started teaching, he has become more engaged and active in his geography work. MR ANDREW IS AN AMAZING TEACHER.", author: "Muhammad Amaan", date: "November 2023", stars: 5 },
  { text: "Brilliant tutor who facilitates such thought-provoking, engaging discussions and promotes critical thinking in his classes. Andrew is a well-versed, supportive and very knowledgeable instructor I highly recommend.", author: "Diana", date: "June 2023", stars: 5 },
  { text: "Andrew is a great tutor, very experienced and knowledgeable. He always prepares the lessons and has lots of materials. His lessons are also very fun. 5 stars *****", author: "Oscar Williams", date: "April 2023", stars: 5 },
  { text: "I had a fantastic experience with Andrew... His engaging teaching style and deep knowledge of the subject made learning easy. I highly recommend Andrew to anyone in need of a skilled geography tutor.", author: "Fares", date: "May 2023", stars: 5 },
  { text: "Andrew has been amazing with my son so far! It's giving him such a boost, his lessons are interesting and I can see my son comes away from them more excited about the subject as well as feeling so much more confident.", author: "Helle", date: "April 2023", stars: 5 },
  { text: "A very knowledgeable, professional and well prepared tutor, I 100% recommend Andrew", author: "Rima", date: "June 2024", stars: 5 },
];

export default function ReviewsSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % reviews.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + reviews.length) % reviews.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  return (
    <div className="testimonials-container reveal">
      <div className="testimonial-slider" id="testimonial-slider">
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
        <div className="slider-dots" id="slider-dots">
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

      <div style={{ marginTop: '2rem' }}>
        <a href="https://preply.com/en/tutor/2898449" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
          <i className="ph ph-link" style={{ marginRight: '8px' }}></i> Verify Reviews on Preply
        </a>
      </div>
    </div>
  );
}
