import Link from 'next/link';

export const metadata = {
  title: 'Policies - Teacher Andrew Geography Tutoring',
  description: 'Booking, cancellation, payment, and safeguarding policies for Teacher Andrew Geography Tutoring.',
};

export default function PoliciesPage() {
  return (
    <div className="blog-post-main">
      <div className="container blog-post-container">
        <Link href="/" className="back-to-blog">
          <i className="ph ph-arrow-left"></i> Back to Home
        </Link>

        <div className="post-header">
          <div className="post-meta">
            <span><i className="ph ph-calendar-blank"></i> Last updated: April 2026</span>
          </div>
          <h1 className="post-title">Policies</h1>
        </div>

        <div className="post-content">
          <p>Please read the following policies carefully before booking lessons with Teacher Andrew. By making
            a booking or purchasing credits, you agree to the terms outlined below.</p>

          <h2>Booking Policy</h2>
          <p>All lessons must be booked in advance through the online booking portal. A valid account and
            sufficient lesson credits are required to secure a slot. Lesson times are displayed in your local
            timezone and are based on my availability, set in Thailand Time (UTC+7).</p>
          <ul>
            <li>Bookings must be made at least <strong>12 hours in advance</strong> of the lesson start time.</li>
            <li>Each lesson is <strong>50 minutes</strong> in duration and conducted via Zoom.</li>
            <li>I will share a Zoom link prior to the lesson. Please ensure you have Zoom installed and
              tested before your first session.</li>
            <li>It is the parent&apos;s responsibility to ensure their child is ready and present at the
              agreed start time.</li>
          </ul>

          <h2>Cancellation &amp; Rescheduling Policy</h2>
          <p>I understand that life is unpredictable. The following cancellation terms apply:</p>
          <ul>
            <li><strong>Cancellations made more than 24 hours before the lesson:</strong> A full credit
              refund will be issued to your account.</li>
            <li><strong>Cancellations made within 24 hours of the lesson:</strong> Unfortunately, the
              lesson credit will be forfeited as I will have reserved that time exclusively for your child.</li>
            <li><strong>Rescheduling:</strong> If you need to reschedule, please contact me directly as
              early as possible. Rescheduling is subject to my availability and must be requested at least
              24 hours in advance.</li>
            <li><strong>Teacher cancellations:</strong> In the rare event that I need to cancel a lesson,
              your credit will be fully refunded and I will make every effort to offer an alternative time
              promptly.</li>
          </ul>

          <h2>Payment Policy</h2>
          <p>All payments are processed securely through <strong>Stripe</strong>. I accept major credit and
            debit cards. Lesson credits are non-refundable once purchased, except in cases where I cancel
            a lesson.</p>
          <ul>
            <li><strong>Pay As You Go:</strong> £30 per lesson credit.</li>
            <li><strong>10-Lesson Bundle:</strong> £270 (saving £30 — a 10% discount).</li>
            <li>Credits do not expire and can be used at any time.</li>
            <li>All transactions are in <strong>GBP (British Pounds Sterling)</strong>. Your bank may apply
              a currency conversion fee if you are paying from outside the UK — please check with your
              card provider.</li>
          </ul>

          <h2>Code of Conduct</h2>
          <p>To ensure a positive and productive learning environment, the following standards of conduct
            are expected:</p>
          <ul>
            <li>Students should arrive to lessons on time, with any required materials (exercise book,
              revision notes, past papers) ready.</li>
            <li>Respectful and polite communication is expected at all times between students, parents,
              and myself.</li>
            <li>Lessons are for educational purposes only. Any inappropriate behaviour may result in the
              lesson being ended and the credit forfeited.</li>
            <li>Recording of lessons is not permitted without my prior written consent.</li>
          </ul>

          <h2>Safeguarding Policy</h2>
          <p>The safety and wellbeing of all students is my highest priority. I am committed to providing
            a safe online learning environment.</p>
          <ul>
            <li>All online lessons are conducted via Zoom with a parent or guardian present in the home,
              or nearby, during sessions with younger students.</li>
            <li>I use the Zoom waiting room — students will be admitted individually at the start of each
              session.</li>
            <li>No personal contact information (phone numbers, personal social media) will be exchanged
              between myself and students directly. All communication is through the booking portal or
              via the parent&apos;s registered email.</li>
            <li>If I have any safeguarding concerns regarding a student&apos;s welfare, I am obligated to act
              in accordance with UK safeguarding guidelines and may contact the appropriate authorities.</li>
          </ul>

          <h2>Privacy &amp; Data Policy</h2>
          <p>Your personal data is handled with care and in accordance with GDPR principles.</p>
          <ul>
            <li>I collect only the data necessary to provide the tutoring service: name, email address,
              and country of residence.</li>
            <li>Your data is stored securely and will never be sold or shared with third parties, except
              where required by law.</li>
            <li>Payment data is processed entirely by Stripe and is never stored on my servers.</li>
            <li>You may request deletion of your account and associated data at any time by contacting
              me directly.</li>
          </ul>

          <h2>Contact</h2>
          <p>If you have any questions about these policies, please get in touch using the contact form on
            the <Link href="/#contact" style={{ color: 'var(--accent)', fontWeight: 600 }}>home page</Link> or
            via the booking portal. I aim to respond to all enquiries within 48 hours.</p>
        </div>
      </div>
    </div>
  );
}
