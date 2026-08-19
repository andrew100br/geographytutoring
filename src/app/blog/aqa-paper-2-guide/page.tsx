import Link from 'next/link';
import ShareButtons from '@/components/ShareButtons';

export const metadata = {
  title: 'How to Ace AQA GCSE Geography Paper 2: Human Geography - Teacher Andrew',
  description: 'Your complete guide to AQA GCSE Geography Paper 2. Master urban issues, the changing economic world, and resource management to hit top grades.',
  openGraph: {
    title: 'How to Ace AQA GCSE Geography Paper 2: Human Geography',
    description: 'Your complete guide to AQA GCSE Geography Paper 2. Master urban issues, the changing economic world, and resource management to hit top grades.',
    url: 'https://teacherandrewgeo.com/blog/aqa-paper-2-guide',
    images: [{ url: '/blog_exam_study2.jpg', width: 1200, height: 630 }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Ace AQA GCSE Geography Paper 2: Human Geography',
    description: 'Your complete guide to AQA GCSE Geography Paper 2. Master urban issues, the changing economic world, and resource management.',
    images: ['/blog_exam_study2.jpg'],
  },
};

export default function AqaPaper2Post() {
  return (
    <div className="blog-post-main">
      <article className="container blog-post-container">
        <Link href="/blog" className="back-to-blog">
          <i className="ph ph-arrow-left"></i> Back to Blog
        </Link>

        <div className="post-header">
          <div className="post-meta">
            <span><i className="ph ph-calendar-blank"></i> April 2, 2026</span>
            <span><i className="ph ph-clock"></i> 7 min read</span>
          </div>
          <h1 className="post-title">How to Ace AQA GCSE Geography Paper 2: Human Geography</h1>
        </div>

        <div
          className="post-hero-image"
          style={{
            backgroundImage: 'url(/blog_exam_study2.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        <div className="post-content">
          <p>AQA GCSE Geography Paper 2 focuses entirely on Human Geography — and for many students, this is
            where the most marks are won or lost. Unlike the physical world, human geography requires you to
            engage with real data, complex social patterns, and nuanced arguments about development and
            resource use. The good news? With a clear strategy, Paper 2 is very learnable.</p>

          <h2>Section A: Urban Issues and Challenges</h2>
          <p>This section demands that you understand urban change at a global scale as well as in a specific
            UK city. There are two layers to master:</p>
          <ul>
            <li><strong>Global urbanisation:</strong> Know the difference between urbanisation trends in HICs
              and LICs/NEEs. Be prepared to explain why cities in the developing world are growing so rapidly
              — push and pull factors, rural-to-urban migration, and the role of natural increase.</li>
            <li><strong>Your UK city case study (e.g. London or Bristol):</strong> You need to know specific
              facts about how this city has changed — social, economic, and environmental — and what
              regeneration or improvement strategies have been put in place. Vague answers will not score
              well. Aim for specific street names, statistics, and named schemes.</li>
            <li><strong>A named LIC/NEE city (e.g. Rio de Janeiro or Lagos):</strong> Understand its rapid
              growth, the challenges this brings (housing, traffic, pollution, inequality) and how urban
              planning has tried to address them.</li>
          </ul>

          <blockquote>
            &quot;In geography exams, your case study is your argument. Without specific data, your answer is
            just an opinion.&quot;
          </blockquote>

          <h2>Section B: The Changing Economic World</h2>
          <p>This section is one of the richest in the entire GCSE course because it connects economic theory
            with real-world injustice and opportunity. Key areas to focus on:</p>
          <ul>
            <li><strong>Measuring development:</strong> Know your indicators — GNI per capita, HDI, literacy
              rate, birth rate, death rate, infant mortality. Understand why no single measure is sufficient
              and why composite measures like the HDI are more useful.</li>
            <li><strong>The Demographic Transition Model (DTM):</strong> This is a favourite for exam
              questions. Be able to describe each stage and link it to a real country. Understand how birth
              rates and death rates change — and why.</li>
            <li><strong>Strategies for reducing the development gap:</strong> Aid, tourism, trade, debt
              relief, and intermediate technology — weigh up each one&apos;s effectiveness with real examples.</li>
            <li><strong>Your NEE case study (e.g. Nigeria or India):</strong> Know how TNCs, political
              change, and globalisation have impacted economic growth, and the social and environmental
              consequences that come with it.</li>
            <li><strong>UK economic change:</strong> The shift from manufacturing to service industries,
              the north-south divide, and strategies for regional development are all examinable.</li>
          </ul>

          <h2>Section C: The Challenge of Resource Management</h2>
          <p>This section splits into two parts. First, you must know the overview — how food, water, and
            energy are distributed globally and why demand is rising. Then you answer a detailed question on
            one of the three resources (whichever your teacher covered in depth).</p>
          <ul>
            <li><strong>Food:</strong> Agribusiness, the impacts of the food trade, and sustainable food
              production techniques (organic farming, seasonal eating, urban farming, appropriate technology
              in LICs).</li>
            <li><strong>Water:</strong> Water insecurity — physical and economic scarcity. Water transfer
              schemes, desalination, groundwater management, and water conservation.</li>
            <li><strong>Energy:</strong> The global energy mix, the move towards renewables, energy
              insecurity, and the role of technology in bridging the energy gap.</li>
          </ul>

          <h2>Exam Technique That Makes the Difference</h2>
          <p>Knowing the content is only half the job. The other half is expressing it in a way that matches
            the mark scheme.</p>
          <ul>
            <li><strong>For &apos;describe&apos; questions (1-4 marks):</strong> State what you see using data
              where possible. Do not explain — just describe with precision.</li>
            <li><strong>For &apos;explain&apos; questions (4-6 marks):</strong> Use a clear chain of reasoning:
              &quot;X happens because Y, which leads to Z.&quot; Aim for developed points rather than many shallow ones.</li>
            <li><strong>For 9-mark &apos;evaluate&apos; or &apos;assess&apos; questions:</strong> Structure your answer with
              a clear argument for, a clear argument against, and a well-reasoned conclusion. These are where
              A* students separate themselves.</li>
          </ul>

          <p>Paper 2 is often underestimated because it feels &apos;less scientific&apos; than Paper 1. In reality, the
            human geography paper rewards students who can construct a real argument supported by precise,
            well-chosen evidence. If you&apos;d like to work through these topics with a structured approach and
            personalised feedback, I&apos;d love to help. Feel free to reach out or book a trial lesson.</p>
        </div>

        <ShareButtons
          url="https://teacherandrewgeo.com/blog/aqa-paper-2-guide"
          title="How to Ace AQA GCSE Geography Paper 2: Human Geography"
        />
      </article>
    </div>
  );
}
