import Link from 'next/link';
import ShareButtons from '@/components/ShareButtons';

export const metadata = {
  title: 'Rivers and Coasts: The Complete GCSE Geography Guide - Teacher Andrew',
  description: 'Master the physical geography of rivers and coasts for your GCSE exam. Processes, landforms, case studies, and exam technique — all in one guide.',
  openGraph: {
    title: 'Rivers and Coasts: The Complete GCSE Geography Guide',
    description: 'Master the physical geography of rivers and coasts for your GCSE. Processes, landforms, case studies, and exam technique.',
    url: 'https://teacherandrewgeo.com/blog/rivers-and-coasts-guide',
    images: [{ url: '/blog_rivers_coasts.jpg', width: 1200, height: 630 }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rivers and Coasts: The Complete GCSE Geography Guide',
    description: 'Master rivers and coasts for your GCSE — processes, landforms, case studies, and exam tips.',
    images: ['/blog_rivers_coasts.jpg'],
  },
};

export default function RiversAndCoastsPost() {
  return (
    <div className="blog-post-main">
      <article className="container blog-post-container">
        <Link href="/blog" className="back-to-blog">
          <i className="ph ph-arrow-left"></i> Back to Blog
        </Link>

        <div className="post-header">
          <div className="post-meta">
            <span><i className="ph ph-calendar-blank"></i> July 1, 2026</span>
            <span><i className="ph ph-clock"></i> 8 min read</span>
          </div>
          <h1 className="post-title">Rivers and Coasts: The Complete GCSE Geography Guide</h1>
        </div>

        <div className="post-hero-image" style={{ backgroundImage: 'url(/blog_rivers_coasts.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />

        <div className="post-content">
          <p>Rivers and coasts together form the backbone of Paper 1 physical geography. Both topics share the
            same underlying framework — processes of erosion, transportation, and deposition — but apply them
            to different environments, producing distinct landforms. Students who understand these processes
            deeply, rather than memorising landforms in isolation, find the whole topic much easier to handle
            in the exam. This guide takes you through both topics systematically.</p>

          <h2>Rivers: The Three Processes</h2>
          <p>Every river landform is the product of three processes, working in different proportions at
            different stages of the river&apos;s journey:</p>
          <ul>
            <li><strong>Erosion</strong> — the wearing away of the river bed and banks. There are four types:
              hydraulic action (force of water), abrasion (sediment scraping the bed), attrition (rocks
              colliding and breaking down), and solution (minerals dissolving in the water). Hydraulic action
              and abrasion are the most powerful.</li>
            <li><strong>Transportation</strong> — how the river moves its load. Traction (rolling large
              boulders), saltation (bouncing smaller stones), suspension (fine particles carried in the
              water), and solution (dissolved minerals).</li>
            <li><strong>Deposition</strong> — when the river drops its load as its velocity falls. The
              heaviest material is deposited first, the lightest last.</li>
          </ul>

          <h2>River Landforms You Must Know</h2>
          <p>These are the landforms you are most likely to be asked about in the exam:</p>
          <ul>
            <li><strong>Upper course:</strong> Interlocking spurs (the river bends around resistant rock),
              V-shaped valleys (dominance of vertical erosion), waterfalls and gorges (resistant rock over
              softer rock, with plunge pool erosion undercutting the overhang).</li>
            <li><strong>Middle course:</strong> Meanders (lateral erosion creates river cliffs on the outside
              bends; deposition creates slip-off slopes on the inside), oxbow lakes (meanders that become
              cut off when the river breaks through the neck during a flood).</li>
            <li><strong>Lower course:</strong> Floodplains (flat, fertile land either side of the river built
              from deposited alluvium), levées (raised banks from repeated flooding), deltas (deposition at
              the river mouth where velocity falls — examples: Nile Delta, Mississippi Delta).</li>
          </ul>

          <blockquote>
            &quot;A waterfall question is not just asking you to describe the feature. It wants you to explain
            the process. Walk the examiner through each step: resistant rock, undercutting, overhang,
            collapse, plunge pool formation, retreat. That&apos;s what earns full marks.&quot;
          </blockquote>

          <h2>Flooding: Causes and Management</h2>
          <p>Flooding case studies are regularly tested. You need to know both the physical and human causes
            of flooding, and the range of management strategies.</p>
          <ul>
            <li><strong>Physical causes:</strong> prolonged or intense rainfall, impermeable rock, steep
              slopes, snowmelt, low-lying land.</li>
            <li><strong>Human causes:</strong> urbanisation (tarmac and concrete increase surface runoff),
              deforestation (less interception and infiltration), building on floodplains.</li>
            <li><strong>Hard engineering:</strong> dams, flood walls, channel straightening. Effective but
              expensive and often environmentally damaging downstream.</li>
            <li><strong>Soft engineering:</strong> floodplain zoning, afforestation, river restoration,
              flood warnings. More sustainable and often cheaper, but slower to take effect.</li>
          </ul>

          <h2>Coasts: The Same Processes, Different Environment</h2>
          <p>Coastal processes mirror river processes. Erosion, transportation, and deposition all occur,
            driven by wave energy rather than gravity.</p>
          <ul>
            <li><strong>Destructive waves</strong> — high frequency, strong backwash, responsible for
              erosion. Common on exposed coastlines with strong prevailing winds.</li>
            <li><strong>Constructive waves</strong> — low frequency, strong swash, responsible for deposition.
              Build beaches and other depositional landforms.</li>
            <li><strong>Longshore drift</strong> — the zig-zag movement of sediment along the coast, driven
              by waves arriving at an angle. This is the key process linking erosional and depositional
              landforms.</li>
          </ul>

          <h2>Coastal Landforms You Must Know</h2>
          <ul>
            <li><strong>Erosional:</strong> Headlands and bays (differential erosion of hard and soft rock),
              caves (weaknesses in the cliff face eroded by hydraulic action), arches (caves eroded through
              a headland), stacks (arch collapses, leaving an isolated column), stumps (stacks eroded to
              the waterline at low tide).</li>
            <li><strong>Depositional:</strong> Beaches (constructive waves deposit material), spits (longshore
              drift extends a beach beyond a change in the coastline direction, e.g. Spurn Point), bars
              (spits that grow across a bay), tombolos (a bar that connects an island to the mainland).</li>
          </ul>

          <h2>Coastal Management: Hard vs Soft Engineering</h2>
          <p>As with rivers, you need to be able to evaluate hard and soft engineering approaches to coastal
            management, with specific case study examples:</p>
          <ul>
            <li><strong>Hard engineering:</strong> sea walls (reflect wave energy, very expensive, can
              increase erosion at their base), groynes (trap sediment, protect one section but starve
              beaches further along), rock armour/rip rap (cheaper but unsightly).</li>
            <li><strong>Soft engineering:</strong> beach nourishment (adds sand to replace eroded material —
              sustainable but requires regular maintenance), managed retreat (allowing the coastline to
              erode and creating new habitats — controversial but increasingly used), dune stabilisation.</li>
          </ul>

          <p>Rivers and coasts may feel like a lot of content, but they follow a logical, process-driven
            structure that makes them very learnable with the right approach. If you are finding either topic
            difficult to visualise or apply in exam conditions, I can work through the key processes and
            past paper questions with you in a one-to-one session. Book your lesson through the portal and
            let&apos;s get this topic locked in before your exam.</p>
        </div>

        <ShareButtons
          url="https://teacherandrewgeo.com/blog/rivers-and-coasts-guide"
          title="Rivers and Coasts: The Complete GCSE Geography Guide"
        />
      </article>
    </div>
  );
}
