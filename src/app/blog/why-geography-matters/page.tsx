import Link from 'next/link';

export const metadata = {
  title: 'Why Geography matters more than ever in 2024 - Teacher Andrew',
  description: 'From climate change to geopolitics, understanding our world is crucial. Here\'s why geography is the most relevant subject today.',
};

export default function WhyGeographyMattersPost() {
  return (
    <div className="blog-post-main">
      <article className="container blog-post-container">
        <Link href="/blog" className="back-to-blog">
          <i className="ph ph-arrow-left"></i> Back to Blog
        </Link>

        <div className="post-header reveal">
          <div className="post-meta">
            <span><i className="ph ph-calendar-blank"></i> February 28, 2024</span>
            <span><i className="ph ph-clock"></i> 4 min read</span>
          </div>
          <h1 className="post-title">Why Geography matters more than ever in 2024</h1>
        </div>

        <div
          className="post-hero-image reveal reveal-delay-1"
          style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #059669 60%, #34d399 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '6rem',
          }}
        >
          🌍
        </div>

        <div className="post-content reveal reveal-delay-2">
          <p>When you ask people what Geography is, many still think it&apos;s simply about memorizing capital cities
            or knowing the names of the longest rivers. But in reality, Geography is the study of how our
            complex world functions, and in 2024, it has never been more relevant.</p>

          <h2>The Climate Crisis</h2>
          <p>We are living through unprecedented environmental changes. Geography teaches us not only the physical
            mechanisms behind climate change but also the human impacts—how rising sea levels displace
            communities, how changing weather patterns affect food security, and what strategies we can use to
            mitigate and adapt to these profound challenges. It is the subject that bridges the gap between the
            physical science of the atmosphere and the social science of human behaviour.</p>

          <h2>Global Connectivity</h2>
          <p>In our hyper-connected world, an event on one side of the globe can have immediate consequences on
            the other. Look at global supply chains: a disruption in a major shipping canal or a natural
            disaster in a manufacturing hub can impact the availability of goods in your local supermarket
            within days. Geography provides the blueprint for understanding how these intricate networks of
            trade, transport, and communication operate.</p>

          <blockquote>
            &quot;Geography is the subject which holds the key to our future.&quot; – Michael Palin
          </blockquote>

          <h2>Urbanization and Sustainability</h2>
          <p>With more than half of the global population now living in urban areas, the challenge of creating
            sustainable, livable cities is paramount. Geographers are at the forefront of urban planning,
            studying how to manage resource consumption, reduce pollution, and improve the quality of life for
            billions of urban dwellers.</p>

          <p>Choosing to study Geography is choosing to understand the most pressing issues of our time. It
            creates informed global citizens who are equipped to critically analyze the world around them and
            contribute to solving its grandest challenges.</p>
        </div>
      </article>
    </div>
  );
}
