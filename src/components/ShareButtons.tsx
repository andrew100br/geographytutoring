"use client";
import { useState } from 'react';

interface ShareButtonsProps {
  url: string;
  title: string;
}

export default function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="share-section">
      <p className="share-label"><i className="ph ph-share-network"></i> Share this article</p>
      <div className="share-buttons">
        <a
          href={`https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="share-btn share-twitter"
          aria-label="Share on Twitter"
        >
          <i className="ph ph-twitter-logo"></i> Twitter
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          className="share-btn share-facebook"
          aria-label="Share on Facebook"
        >
          <i className="ph ph-facebook-logo"></i> Facebook
        </a>
        <a
          href={`https://wa.me/?text=${encodedTitle}%20${encoded}`}
          target="_blank"
          rel="noopener noreferrer"
          className="share-btn share-whatsapp"
          aria-label="Share on WhatsApp"
        >
          <i className="ph ph-whatsapp-logo"></i> WhatsApp
        </a>
        <button
          onClick={handleCopy}
          className="share-btn share-copy"
          aria-label="Copy link"
        >
          <i className={`ph ph-${copied ? 'check' : 'link'}`}></i> {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
}
