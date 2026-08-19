import Link from 'next/link';
import ShareButtons from '@/components/ShareButtons';

export const metadata = {
  title: 'Urban Issues and Challenges: The Complete GCSE Guide - Teacher Andrew',
  description: 'Master the Urban Issues topic for GCSE Geography — urbanisation, UK cities, LIC/NEE cities, and sustainable urban living — with exam technique built in.',
  openGraph: {
    title: 'Urban Issues and Challenges: The Complete GCSE Guide',
    description: 'Master Urban Issues for GCSE Geography — urbanisation, UK cities, LIC/NEE cities, and sustainable living.',
    url: 'https://teacherandrewgeo.com/blog/urban-issues-gcse',
    images: [{ url: '/blog_urban_cities.jpg', width: 1200, height: 630 }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Urban Issues and Challenges: The Complete GCSE Guide',
    description: 'Master Urban Issues for GCSE Geography — case studies, processes, and exam technique.',
    images: ['/blog_urban_cities.jpg'],
  },
};

export default function UrbanIssuesPost() {
  return (
    <div className="blog-post-main">
      <article className="container blog-post-container">
        <Link href="/blog" className="back-to-blog">
          <i className="ph ph-arrow-left"></i> Back to Blog
        </Link>

        <div className="post-header">
          <div className="post-meta">
            <span><i className="ph ph-calendar-blank"></i> September 1, 2026</span>
            <span><i className="ph ph-clock"></i> 8 min read</span>
          </div>
          <h1 className="post-title">Urban Issues and Challenges: The Complete GCSE Guide</h1>
        </div>

        <div className="post-hero-image" style={{ backgroundImage: 'url(/blog_urban_cities.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />

        <div className="post-content">
          <p>Urban Issues and Challenges is one of the most mark-rich topics on the AQA GCSE Geography Paper 2.
            It covers how and why cities are growing, the problems that growth creates, and the solutions being
            used to make cities more sustainable. This guide walks through every section of the topic with the
            exam technique built in.</p>

          <h2>Global Urbanisation — The Big Picture</h2>
          <p>The world is urbanising rapidly. For the first time in history, more than half the world&apos;s
            population now lives in cities, and that proportion is growing. The key term is the
            <strong> urban population</strong> — the percentage of a country&apos;s people living in towns and
            cities.</p>
          <ul>
            <li><strong>HICs</strong> (High-Income Countries) are already highly urbanised — the UK, USA,
              and Japan all have urbanisation rates above 80%. Growth here is slow.</li>
            <li><strong>LICs and NEEs</strong> (Low-Income Countries and Newly Emerging Economies) are
              urbanising fastest. Countries like Nigeria, India, and Brazil have massive rural-to-urban
              migration driven by economic opportunity, better services, and the pull of city life.</li>
          </ul>
          <p>Be ready to explain the difference between urbanisation (the process) and urban growth (the
            result), and to name specific megacities — cities with over 10 million people. Examples include
            Lagos, Mumbai, São Paulo, and Tokyo.</p>

          <h2>Case Study 1 — A UK City (Liverpool or Manchester)</h2>
          <p>You need a detailed UK city case study. AQA students most commonly use Liverpool or Manchester,
            but check what your school has taught you. Whatever city you use, know these themes:</p>
          <ul>
            <li><strong>Urban change and inequality</strong> — different parts of the city have very
              different levels of deprivation. Know specific named areas and their characteristics.</li>
            <li><strong>Urban regeneration</strong> — what specific projects have been used to improve
              deprived areas? (e.g. Liverpool ONE shopping centre, the Granby Four Streets community-led
              regeneration, Manchester&apos;s MediaCityUK)</li>
            <li><strong>Transport issues</strong> — urban sprawl, congestion, and solutions such as
              tram systems (Manchester Metrolink) or cycle infrastructure.</li>
            <li><strong>Environmental sustainability</strong> — urban greening, waste management, renewable
              energy in the city.</li>
          </ul>

          <blockquote>
            &quot;Named examples and statistics are what separate a Level 2 answer from a Level 3. &apos;Liverpool has
            regenerated its docklands&apos; is worth 0 marks on its own. &apos;The Albert Dock regeneration in
            Liverpool attracted over £100 million of investment and now welcomes 5 million visitors per year&apos;
            earns marks.&quot;
          </blockquote>

          <h2>Case Study 2 — A City in an LIC or NEE (Rio de Janeiro)</h2>
          <p>Rio de Janeiro in Brazil is the most commonly used LIC/NEE city case study at GCSE. Know it
            across these themes:</p>
          <ul>
            <li><strong>Growth causes</strong> — rural-to-urban migration driven by rural poverty, drought,
              and the pull of economic opportunity in the city.</li>
            <li><strong>Social challenges</strong> — inequality, crime, lack of formal housing. Around
              22% of Rio&apos;s population lives in <em>favelas</em> (informal settlements), such as
              Rocinha — the largest favela in South America, home to around 70,000 people.</li>
            <li><strong>Economic challenges</strong> — the informal economy (unregistered workers), high
              unemployment, and the concentration of wealth among a small elite.</li>
            <li><strong>Environmental challenges</strong> — air and water pollution, deforestation on the
              hillsides where favelas are built, flood risk.</li>
            <li><strong>Solutions</strong> — the Favela-Bairro project (upgrading services in favelas
              rather than demolishing them), cable car systems to improve access, policing programmes
              (UPP — Police Pacification Units).</li>
          </ul>

          <h2>Sustainable Urban Living</h2>
          <p>The final section of Urban Issues asks you to evaluate strategies for making cities more
            sustainable. A sustainable city meets the needs of the present without compromising the ability
            of future generations to meet theirs. Strategies include:</p>
          <ul>
            <li><strong>Renewable energy</strong> — solar panels on public buildings, wind turbines</li>
            <li><strong>Green spaces</strong> — parks, urban forests, and green roofs that reduce flooding
              and improve air quality</li>
            <li><strong>Integrated transport</strong> — reducing car dependency through bus rapid transit,
              cycling infrastructure, and park-and-ride</li>
            <li><strong>Waste reduction</strong> — recycling schemes, composting, reducing landfill use</li>
          </ul>
          <p>A useful case study for sustainable urban living is <strong>Freiburg, Germany</strong> — a city
            that generates more energy from solar power than it consumes, has one of Europe&apos;s best cycling
            networks, and kept car use out of its city centre. It is an effective comparison with less
            sustainable cities.</p>

          <p>Urban Issues is a topic that rewards organised thinking and specific knowledge. If your case
            study detail feels thin, or you struggle to structure longer answers on this topic, I can work
            through the key examples and exam questions with you in a focused one-to-one session. Book
            through the portal and let&apos;s get it locked in.</p>
        </div>

        <ShareButtons
          url="https://teacherandrewgeo.com/blog/urban-issues-gcse"
          title="Urban Issues and Challenges: The Complete GCSE Guide"
        />
      </article>
    </div>
  );
}
