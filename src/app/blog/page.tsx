import Link from 'next/link';
import EmailSignup from '@/components/EmailSignup';

export const metadata = {
  title: 'Blog - Geography Study Guides & Tips | Teacher Andrew',
  description: 'Free GCSE Geography study guides, exam tips, and resources from Teacher Andrew — an expert tutor with 14+ years experience.',
  openGraph: {
    title: 'Blog - Geography Study Guides & Tips | Teacher Andrew',
    description: 'Free GCSE Geography study guides, exam tips, and resources from Teacher Andrew.',
    url: 'https://teacherandrewgeo.com/blog',
    images: [{ url: '/hero-globe.png', width: 1200, height: 630 }],
  },
};

const allPosts = [
  {
    slug: 'development-gap-gcse',
    date: 'October 1, 2026',
    title: 'The Development Gap: GCSE Geography Complete Guide',
    excerpt: 'Understand global inequality, development indicators, causes of the gap, and how to evaluate strategies to close it — with exam technique built in.',
    image: '/why_geography_matters.png',
  },
  {
    slug: 'urban-issues-gcse',
    date: 'September 1, 2026',
    title: 'Urban Issues and Challenges: The Complete GCSE Guide',
    excerpt: 'Master urbanisation, UK cities, LIC/NEE cities, and sustainable urban living — one of the most mark-rich topics on Paper 2.',
    image: '/hero-globe.png',
  },
  {
    slug: 'gcse-fieldwork-guide',
    date: 'August 1, 2026',
    title: 'GCSE Geography Fieldwork: What to Expect and How to Prepare',
    excerpt: 'Fieldwork is compulsory and examined. Find out exactly what to memorise, how to write up your investigation, and how to score top marks.',
    image: '/why_geography_matters.png',
  },
  {
    slug: 'rivers-and-coasts-guide',
    date: 'July 1, 2026',
    title: 'Rivers and Coasts: The Complete GCSE Geography Guide',
    excerpt: 'Master the physical geography of rivers and coasts. Processes, landforms, case studies, and exam technique — all in one guide.',
    image: '/tectonic_hazards.png',
  },
  {
    slug: 'how-to-write-9-mark-answer',
    date: 'June 1, 2026',
    title: 'How to Write a Perfect Extended Answer: AQA, Edexcel & Cambridge IGCSE',
    excerpt: 'AQA have 9 marks, Edexcel 8, Cambridge IGCSE 7 — and each marks differently. Learn the exact structure for your curriculum to score maximum marks.',
    image: '/gcse_study_tips.png',
  },
  {
    slug: 'gcse-exam-topics',
    date: 'May 1, 2026',
    title: 'Top 5 Geography Topics That Appear Every Year in GCSE Exams',
    excerpt: 'Find out which Geography topics are guaranteed to appear in your GCSE exam every year — and how to score maximum marks on each one.',
    image: '/gcse_study_tips.png',
  },
  {
    slug: 'benefits-of-online-tutoring',
    date: 'April 8, 2026',
    title: '5 Reasons Online Geography Tutoring Can Transform Your Child\'s Grade',
    excerpt: 'Discover why one-to-one online tutoring with an expert teacher produces results that years of classroom lessons simply cannot.',
    image: '/hero-globe.png',
    featured: true,
  },
  {
    slug: 'aqa-paper-2-guide',
    date: 'April 2, 2026',
    title: 'How to Ace AQA GCSE Geography Paper 2: Human Geography',
    excerpt: 'Your complete guide to Paper 2 — urban issues, the changing economic world, and resource management, with exam technique tips.',
    image: '/hero-globe.png',
  },
  {
    slug: 'climate-change-gcse',
    date: 'March 20, 2026',
    title: 'Climate Change and Your GCSE Geography: Everything You Need to Know',
    excerpt: 'From the enhanced greenhouse effect to mitigation vs adaptation — a complete GCSE guide to climate change with exam tips.',
    image: '/why_geography_matters.png',
  },
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

const now = new Date();
const posts = allPosts.filter(p => new Date(p.date) <= now);

export default function BlogPage() {
  const featuredPost = posts.find(p => p.featured);
  const regularPosts = posts.filter(p => !p.featured);

  return (
    <div className="blog-main bg-light">
      <div className="container">
        <div className="blog-header section-header">
          <h2>Geography Blog</h2>
          <p>Free study guides, exam tips, and insights from Teacher Andrew — helping students worldwide succeed in GCSE Geography.</p>
        </div>

        {featuredPost && (
          <article className="blog-featured-card">
            <div
              className="blog-featured-image"
              style={{ backgroundImage: `url(${featuredPost.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            <div className="blog-featured-content">
              <span className="blog-featured-badge">Featured</span>
              <span className="blog-date">{featuredPost.date}</span>
              <h2 className="blog-featured-title">{featuredPost.title}</h2>
              <p className="blog-excerpt">{featuredPost.excerpt}</p>
              <Link href={`/blog/${featuredPost.slug}`} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                Read Article <i className="ph ph-arrow-right"></i>
              </Link>
            </div>
          </article>
        )}

        <div className="blog-grid">
          {regularPosts.map((post) => (
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

        <EmailSignup />
      </div>
    </div>
  );
}
