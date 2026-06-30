import Link from 'next/link';
import ShareButtons from '@/components/ShareButtons';

export const metadata = {
  title: 'Top 5 Geography Topics That Appear Every Year in GCSE Exams - Teacher Andrew',
  description: 'Find out which Geography topics are guaranteed to appear in your GCSE exam every year — and how to make sure you score maximum marks on each one.',
  openGraph: {
    title: 'Top 5 Geography Topics That Appear Every Year in GCSE Exams',
    description: 'Find out which Geography topics are guaranteed to appear in your GCSE exam every year — and how to score maximum marks on each one.',
    url: 'https://teacherandrewgeo.com/blog/gcse-exam-topics',
    images: [{ url: '/gcse_study_tips.png', width: 1200, height: 630 }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Top 5 Geography Topics That Appear Every Year in GCSE Exams',
    description: 'The guaranteed GCSE Geography topics and how to score maximum marks on each one.',
    images: ['/gcse_study_tips.png'],
  },
};

export default function GcseExamTopicsPost() {
  return (
    <div className="blog-post-main">
      <article className="container blog-post-container">
        <Link href="/blog" className="back-to-blog">
          <i className="ph ph-arrow-left"></i> Back to Blog
        </Link>

        <div className="post-header">
          <div className="post-meta">
            <span><i className="ph ph-calendar-blank"></i> May 1, 2026</span>
            <span><i className="ph ph-clock"></i> 6 min read</span>
          </div>
          <h1 className="post-title">Top 5 Geography Topics That Appear Every Year in GCSE Exams</h1>
        </div>

        <div className="post-hero-image" style={{ backgroundImage: 'url(/gcse_study_tips.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />

        <div className="post-content">
          <p>After 14+ years of teaching GCSE Geography and studying past papers across AQA and Edexcel, there
            are certain topics that appear in some form every single year. These are not flukes — they are
            the cornerstones of the course, the concepts that examiners return to because they sit at the
            heart of what Geography is about. If you master these five topics, you are giving yourself the
            best possible foundation for a top grade.</p>

          <h2>1. Natural Hazards — Tectonic and Weather</h2>
          <p>Tectonic hazards (earthquakes, volcanoes, tsunamis) and extreme weather events appear on virtually
            every paper. The examiners expect you to do more than describe these events — they want you to
            explain the processes behind them, evaluate their impacts using real case studies, and discuss how
            management can reduce risk.</p>
          <ul>
            <li><strong>Know your plate boundaries</strong> — destructive, constructive, and conservative — and
              what hazards each produces.</li>
            <li><strong>Have two contrasting case studies</strong> prepared: one from a High-Income Country
              (HIC) such as Japan, and one from a Low-Income Country (LIC) such as Nepal or Haiti. Be able
              to compare them in terms of cause, impact, and response.</li>
            <li><strong>For weather hazards</strong>, understand tropical storms — their formation, structure,
              and effects — and be familiar with the increasing trend of extreme weather linked to climate
              change.</li>
          </ul>

          <h2>2. Urban Issues and Challenges</h2>
          <p>Global urbanisation, and its consequences, is examined every year. You need both a big-picture
            understanding of why cities are growing and a detailed knowledge of two specific urban areas —
            one in the UK and one in an LIC or NEE.</p>
          <ul>
            <li>Know the push and pull factors driving rural-to-urban migration in developing countries.</li>
            <li>For your UK city case study, memorise specific statistics and named regeneration projects.
              Vague answers do not score well here.</li>
            <li>For your LIC/NEE city (e.g. Rio de Janeiro), understand the challenges of rapid growth
              — informal housing, traffic congestion, pollution, inequality — and the specific strategies
              used to address them.</li>
          </ul>

          <h2>3. The Changing Economic World</h2>
          <p>Questions about development, inequality, and the global economy come up every year across both
            AQA and Edexcel. This topic spans the full range of question types — from 1-mark definitions to
            9-mark evaluations.</p>
          <ul>
            <li>Understand how development is measured (GNI, HDI, life expectancy, literacy rate) and why
              no single indicator is sufficient.</li>
            <li>Be confident explaining the Demographic Transition Model (DTM) and linking each stage to
              a real country.</li>
            <li>Have a strong NEE case study (Nigeria, India, or China are most common) covering economic
              growth, the role of TNCs, and social and environmental consequences.</li>
          </ul>

          <blockquote>
            &quot;The students who score highest on the economic world questions are those who can link economic
            theory to real-world examples with specific data. Numbers and named places make the difference.&quot;
          </blockquote>

          <h2>4. Climate Change — Causes, Effects, and Responses</h2>
          <p>Climate change is arguably the defining geographical issue of the 21st century, and examiners
            reflect this. It appears both as a standalone topic and woven into questions on ecosystems,
            coasts, rivers, and urban areas. You must be able to:</p>
          <ul>
            <li>Explain the enhanced greenhouse effect clearly, naming specific greenhouse gases and their
              human sources.</li>
            <li>Distinguish between mitigation (reducing emissions) and adaptation (adjusting to effects),
              with examples of each.</li>
            <li>Evaluate the effectiveness of international agreements such as the Paris Agreement, including
              their limitations.</li>
          </ul>

          <h2>5. Rivers and Coastal Landscapes</h2>
          <p>Physical geography processes — erosion, transportation, deposition — underpin both river and
            coastal landscape questions. These appear on Paper 1 every year and often include photographic
            or map-based evidence to interpret.</p>
          <ul>
            <li>Know the landforms produced at each stage of a river&apos;s journey and the processes that
              create them: interlocking spurs, waterfalls, meanders, oxbow lakes, floodplains, deltas.</li>
            <li>For coasts, understand erosion landforms (headlands, bays, caves, arches, stacks, stumps)
              and depositional landforms (beaches, spits, bars).</li>
            <li>Be ready to interpret OS maps, cross-sections, and field sketches — these are regularly
              tested alongside the theoretical content.</li>
          </ul>

          <p>Mastering these five topic areas will not guarantee you cover everything, but it will ensure
            you are well prepared for the sections that carry the most marks each year. If any of these
            topics feel uncertain, working through them in a focused one-to-one session can make a
            significant difference in a short space of time. Get in touch if you&apos;d like to work on any
            of these together.</p>
        </div>

        <ShareButtons
          url="https://teacherandrewgeo.com/blog/gcse-exam-topics"
          title="Top 5 Geography Topics That Appear Every Year in GCSE Exams"
        />
      </article>
    </div>
  );
}
