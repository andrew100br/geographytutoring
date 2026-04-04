import Link from 'next/link';

export const metadata = {
  title: 'Understanding Tectonic Hazards - Teacher Andrew',
  description: 'A deep dive into earthquakes, volcanoes, and tsunamis. Perfect for AQA and Edexcel students looking to master this core topic.',
};

export default function TectonicHazardsPost() {
  return (
    <div className="blog-post-main">
      <article className="container blog-post-container">
        <Link href="/blog" className="back-to-blog">
          <i className="ph ph-arrow-left"></i> Back to Blog
        </Link>

        <div className="post-header reveal">
          <div className="post-meta">
            <span><i className="ph ph-calendar-blank"></i> January 10, 2024</span>
            <span><i className="ph ph-clock"></i> 6 min read</span>
          </div>
          <h1 className="post-title">Understanding Tectonic Hazards</h1>
        </div>

        <div
          className="post-hero-image reveal reveal-delay-1"
          style={{
            background: 'linear-gradient(135deg, #7c2d12 0%, #dc2626 60%, #f97316 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '6rem',
          }}
        >
          🌋
        </div>

        <div className="post-content reveal reveal-delay-2">
          <p>Tectonic hazards—earthquakes, volcanoes, and tsunamis—are some of the most dramatic and devastating
            natural events on Earth. For GCSE students taking AQA or Edexcel, demonstrating a solid
            understanding of the physical processes behind these hazards, as well as their impacts and
            management, is a guaranteed way to score high marks.</p>

          <h2>The Basics: Plate Margins</h2>
          <p>The Earth&apos;s crust is broken into several tectonic plates which are constantly moving, driven by
            convection currents in the mantle. The places where these plates meet are called plate margins (or
            boundaries), and it is here that the majority of tectonic activity occurs.</p>
          <ul>
            <li><strong>Destructive margins:</strong> Where two plates are moving towards each other. If an
              oceanic plate meets a continental plate, the denser oceanic plate subducts (sinks), leading to
              severe earthquakes and explosive composite volcanoes.</li>
            <li><strong>Constructive margins:</strong> Where plates are moving apart (e.g., the Mid-Atlantic
              Ridge). Magma rises to fill the gap, forming shield volcanoes and causing minor earthquakes.</li>
            <li><strong>Conservative margins:</strong> Where plates slide past each other at different speeds or
              in different directions. The friction causes tension to build up, eventually releasing as a
              powerful earthquake (e.g., the San Andreas Fault). Interestingly, no volcanoes are found here
              because no magma is created.</li>
          </ul>

          <h2>Measuring the Impact</h2>
          <p>When evaluating the impact of a tectonic hazard, it&apos;s essential to categorize the effects into
            primary and secondary, as well as considering social, economic, and environmental impacts.</p>
          <ul>
            <li><strong>Primary effects</strong> happen immediately as a direct result of the event (e.g.,
              buildings collapsing, people injured, roads cracked).</li>
            <li><strong>Secondary effects</strong> happen hours, days, or weeks later as a consequence of the
              primary effects (e.g., fires starting from broken gas pipes, diseases spreading from
              contaminated water, businesses going bankrupt).</li>
          </ul>

          <blockquote>
            &quot;The severity of an earthquake&apos;s impact is not just determined by its magnitude on the Richter
            scale, but heavily influenced by a country&apos;s level of development and preparedness.&quot;
          </blockquote>

          <h2>Management and Mitigation</h2>
          <p>We cannot stop tectonic hazards from happening, but we can manage them to reduce their impact. This
            usually falls into four categories: monitoring, prediction, protection, and planning (the 4 Ps).</p>
          <p>For example, protecting buildings by installing cross-bracing and shock absorbers can prevent
            collapse during an earthquake. Planning entails zoning laws and organising regular earthquake drills
            so citizens know exactly what to do when disaster strikes.</p>

          <p>Make sure you have two distinct case studies prepared: one for an earthquake in a High-Income Country
            (HIC) like Japan or New Zealand, and one in a Low-Income Country (LIC) or Newly Emerging Economy
            (NEE) like Nepal or Haiti. Being able to compare their differing capacities to respond is crucial
            for top grades.</p>
        </div>
      </article>
    </div>
  );
}
