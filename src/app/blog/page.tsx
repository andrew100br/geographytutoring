import Link from 'next/link';

const posts = [
  {
    slug: 'gcse-study-tips',
    date: 'March 15, 2024',
    title: 'How to effectively study for GCSE Geography',
    excerpt: 'Discover proven revision techniques and strategies to confidently tackle your upcoming Geography exams.',
    image: '/gcse_study_tips.png',
  },
  {
    slug: 'why-geography-matters',
    date: 'February 28, 2024',
    title: 'Why Geography matters more than ever in 2024',
    excerpt: 'From climate change to geopolitics, understanding our world is crucial. Here\'s why geography is the most relevant subject today.',
    image: '/why_geography_matters.png',
  },
  {
    slug: 'tectonic-hazards',
    date: 'January 10, 2024',
    title: 'Understanding Tectonic Hazards',
    excerpt: 'A deep dive into earthquakes, volcanoes, and tsunamis. Perfect for AQA and Edexcel students looking to master this core topic.',
    image: '/tectonic_hazards.png',
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
          {posts.map((post) => (
            <article key={post.slug} className="blog-card">
              <div
                className="blog-image"
                style={{ backgroundImage: `url(${post.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
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
