import Link from 'next/link';

const posts = [
  {
    slug: 'gcse-study-tips',
    date: 'March 15, 2024',
    title: 'How to effectively study for GCSE Geography',
    excerpt: 'Discover proven revision techniques and strategies to confidently tackle your upcoming Geography exams.',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%)',
    icon: '📚',
  },
  {
    slug: 'why-geography-matters',
    date: 'February 28, 2024',
    title: 'Why Geography matters more than ever in 2024',
    excerpt: 'From climate change to geopolitics, understanding our world is crucial. Here\'s why geography is the most relevant subject today.',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 60%, #34d399 100%)',
    icon: '🌍',
  },
  {
    slug: 'tectonic-hazards',
    date: 'January 10, 2024',
    title: 'Understanding Tectonic Hazards',
    excerpt: 'A deep dive into earthquakes, volcanoes, and tsunamis. Perfect for AQA and Edexcel students looking to master this core topic.',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #dc2626 60%, #f97316 100%)',
    icon: '🌋',
  },
];

export const metadata = {
  title: 'Blog - Teacher Andrew Geography Tutoring',
  description: 'Geography insights, study tips, and news from Teacher Andrew.',
};

export default function BlogPage() {
  return (
    <div className="blog-main bg-light">
      <div className="container">
        <div className="blog-header section-header">
          <h2>Our Blog</h2>
          <p>Geography insights, study tips, and news from Teacher Andrew.</p>
        </div>
        <div className="blog-grid">
          {posts.map((post, i) => (
            <article key={post.slug} className="blog-card">
              <div
                className="blog-image"
                style={{ background: post.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}
              >
                {post.icon}
              </div>
              <div className="blog-content">
                <span className="blog-date">{post.date}</span>
                <h3 className="blog-title">{post.title}</h3>
                <p className="blog-excerpt">{post.excerpt}</p>
                <Link href={`/blog/${post.slug}`} className="blog-link">
                  Read More <i className="ph ph-arrow-right"></i>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
