import Link from 'next/link';

export default function Footer() {
  return (
    <footer>
        <div className="container footer-content">
            <div className="footer-logo">
                <i className="ph ph-globe-hemisphere-west"></i>
                <span>Teacher Andrew</span>
            </div>
            <div className="footer-links" style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                <Link href="/policies"
                    className="footer-policy-link"
                    style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.3s' }}>
                    Policies
                </Link>
            </div>
            <p style={{ marginTop: '0.5rem' }}>&copy; 2024 Teacher Andrew. All rights reserved.</p>
        </div>
    </footer>
  );
}
