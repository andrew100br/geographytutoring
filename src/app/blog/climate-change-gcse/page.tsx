import Link from 'next/link';
import ShareButtons from '@/components/ShareButtons';

export const metadata = {
  title: 'Climate Change and Your GCSE Geography: Everything You Need to Know - Teacher Andrew',
  description: 'A complete GCSE Geography guide to climate change — causes, effects, and responses. Covering AQA and Edexcel with exam tips from Teacher Andrew.',
  openGraph: {
    title: 'Climate Change and Your GCSE Geography: Everything You Need to Know',
    description: 'A complete GCSE Geography guide to climate change — causes, effects, and responses. Covering AQA and Edexcel with exam tips.',
    url: 'https://teacherandrewgeo.com/blog/climate-change-gcse',
    images: [{ url: '/blog_climate_change.jpg', width: 1200, height: 630 }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Climate Change and Your GCSE Geography: Everything You Need to Know',
    description: 'A complete GCSE Geography guide to climate change — causes, effects, and responses.',
    images: ['/blog_climate_change.jpg'],
  },
};

export default function ClimateChangePost() {
  return (
    <div className="blog-post-main">
      <article className="container blog-post-container">
        <Link href="/blog" className="back-to-blog">
          <i className="ph ph-arrow-left"></i> Back to Blog
        </Link>

        <div className="post-header">
          <div className="post-meta">
            <span><i className="ph ph-calendar-blank"></i> March 20, 2026</span>
            <span><i className="ph ph-clock"></i> 8 min read</span>
          </div>
          <h1 className="post-title">Climate Change and Your GCSE Geography: Everything You Need to Know</h1>
        </div>

        <div
          className="post-hero-image"
          style={{
            backgroundImage: 'url(/blog_climate_change.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        <div className="post-content">
          <p>Climate change is one of the most important and frequently examined topics in GCSE Geography. It
            appears across multiple papers, connects with physical and human geography, and is directly
            relevant to students&apos; everyday lives. This guide covers everything you need to know — from the
            science behind it to the exam strategies that will get you the best possible grade.</p>

          <h2>Understanding the Causes</h2>
          <p>You need to understand both <strong>natural</strong> and <strong>human</strong> causes of climate
            change, and be clear about the distinction between them.</p>
          <ul>
            <li><strong>Natural causes:</strong> These include variations in the Earth&apos;s orbit (Milankovitch
              cycles), changes in solar output, and volcanic eruptions releasing ash and gases that temporarily
              cool the atmosphere. These explain long-term, historical climate shifts.</li>
            <li><strong>The enhanced greenhouse effect (human cause):</strong> This is the main focus for
              GCSE. The greenhouse effect is natural and essential for life — without it, the Earth would be
              too cold to survive. The <em>enhanced</em> greenhouse effect occurs because human activities
              have dramatically increased the concentration of greenhouse gases in the atmosphere, trapping
              more heat.</li>
          </ul>
          <p>Key greenhouse gases to know: carbon dioxide (CO₂) from burning fossil fuels, methane (CH₄)
            from agriculture and landfill, and nitrous oxide (N₂O) from fertilisers. Be specific — which
            human activities produce which gases?</p>

          <blockquote>
            &quot;The examiner wants to see that you understand the process, not just the result. Explain how
            greenhouse gases trap heat, don&apos;t just state that temperatures are rising.&quot;
          </blockquote>

          <h2>The Effects of Climate Change</h2>
          <p>Effects must be split into categories — the exam often rewards students who can distinguish
            between different types of impact:</p>
          <ul>
            <li><strong>Physical effects:</strong> Rising global temperatures (the global average has risen
              approximately 1.2°C since pre-industrial times), melting ice caps and glaciers, rising sea
              levels (currently rising at around 3.3mm per year), increased frequency and intensity of
              extreme weather events (droughts, floods, storms).</li>
            <li><strong>Social effects:</strong> Displacement of coastal communities, increased food and
              water insecurity, greater health risks from heat stress and the spread of tropical diseases
              like malaria into previously unaffected regions.</li>
            <li><strong>Economic effects:</strong> Damage to agriculture in vulnerable regions, increased
              cost of disaster response, threat to infrastructure in low-lying areas.</li>
            <li><strong>Effects on ecosystems:</strong> Coral bleaching due to warmer, more acidic oceans,
              shifts in the range and behaviour of species, disruption of migration patterns, and the
              accelerating risk of species extinction.</li>
          </ul>

          <h2>Responses: Mitigation vs Adaptation</h2>
          <p>This distinction is crucial and almost always tested. Make sure you can define and apply both:</p>
          <ul>
            <li><strong>Mitigation</strong> means tackling the cause of climate change — reducing the
              amount of greenhouse gases we emit. Examples include switching to renewable energy (solar,
              wind, tidal), improving energy efficiency in buildings and vehicles, carbon capture and
              storage technology, and planting trees to act as carbon sinks.</li>
            <li><strong>Adaptation</strong> means adjusting to the effects of climate change that are
              already locked in. Examples include building sea walls and flood defences, developing
              drought-resistant crops, relocating communities away from vulnerable coastlines, and
              redesigning cities to cope with extreme heat (green roofs, urban tree planting).</li>
          </ul>

          <h2>International Agreements and Their Limitations</h2>
          <p>You need to know about key global agreements — and crucially, why they are difficult to
            implement effectively.</p>
          <ul>
            <li><strong>The Paris Agreement (2015):</strong> Nearly 200 countries agreed to limit global
              warming to well below 2°C above pre-industrial levels, aiming for 1.5°C. Countries submit
              their own nationally determined contributions (NDCs).</li>
            <li><strong>Limitations:</strong> The targets are voluntary, not legally binding. Some major
              emitting nations have withdrawn at various points. There is a tension between economic
              development (especially in LICs and NEEs) and reducing emissions.</li>
          </ul>

          <h2>Exam Tips Specific to Climate Change Questions</h2>
          <ul>
            <li>Always distinguish between <em>weather</em> (short-term atmospheric conditions) and
              <em>climate</em> (long-term patterns) — confusing these is a very common and costly mistake.</li>
            <li>Include specific data wherever possible: named places, statistics, dates. &quot;Temperatures have
              risen&quot; is weaker than &quot;global average temperatures have risen by approximately 1.2°C since
              the pre-industrial era.&quot;</li>
            <li>For evaluation questions, consider the argument that some areas may experience short-term
              benefits from climate change (e.g. longer growing seasons in northern latitudes, new shipping
              routes through the Arctic) before concluding that the overall impact is overwhelmingly
              negative.</li>
            <li>Connect to other topics: climate change links to coastal management, glaciation, ecosystems,
              food security, and migration — examiners often reward students who make these connections.</li>
          </ul>

          <p>Climate change is a topic that can be genuinely fascinating when you engage with the real data
            and human stories behind it. If your child is finding this topic — or any other part of their
            GCSE Geography — challenging to grasp, a one-to-one lesson with me can make all the difference.
            Feel free to get in touch or book a trial session today.</p>
        </div>

        <ShareButtons
          url="https://teacherandrewgeo.com/blog/climate-change-gcse"
          title="Climate Change and Your GCSE Geography: Everything You Need to Know"
        />
      </article>
    </div>
  );
}
