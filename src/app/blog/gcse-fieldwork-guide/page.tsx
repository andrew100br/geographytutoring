import Link from 'next/link';
import ShareButtons from '@/components/ShareButtons';

export const metadata = {
  title: 'GCSE Geography Fieldwork: What to Expect and How to Prepare - Teacher Andrew',
  description: 'Fieldwork is a compulsory part of GCSE Geography. Find out exactly what examiners expect, how to write up your investigation, and how to score top marks.',
  openGraph: {
    title: 'GCSE Geography Fieldwork: What to Expect and How to Prepare',
    description: 'Fieldwork is compulsory at GCSE. Find out what examiners expect, how to write it up, and how to score top marks.',
    url: 'https://teacherandrewgeo.com/blog/gcse-fieldwork-guide',
    images: [{ url: '/why_geography_matters.png', width: 1200, height: 630 }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GCSE Geography Fieldwork: What to Expect and How to Prepare',
    description: 'Everything you need to know about GCSE Geography fieldwork — from data collection to top-mark write-ups.',
    images: ['/why_geography_matters.png'],
  },
};

export default function FieldworkGuidePost() {
  return (
    <div className="blog-post-main">
      <article className="container blog-post-container">
        <Link href="/blog" className="back-to-blog">
          <i className="ph ph-arrow-left"></i> Back to Blog
        </Link>

        <div className="post-header">
          <div className="post-meta">
            <span><i className="ph ph-calendar-blank"></i> August 1, 2026</span>
            <span><i className="ph ph-clock"></i> 7 min read</span>
          </div>
          <h1 className="post-title">GCSE Geography Fieldwork: What to Expect and How to Prepare</h1>
        </div>

        <div className="post-hero-image" style={{ backgroundImage: 'url(/why_geography_matters.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} />

        <div className="post-content">
          <p>Fieldwork is not optional at GCSE — it is a compulsory part of the course for both AQA and
            Edexcel, and it is examined in the written papers. Many students underestimate how many marks
            fieldwork questions carry, and how predictable those questions actually are. With the right
            preparation, fieldwork is one of the most straightforward places to pick up marks in the entire
            exam.</p>

          <h2>What Is Fieldwork at GCSE?</h2>
          <p>You are required to complete at least two pieces of fieldwork — one in a physical environment
            (such as a river or coastline) and one in a human environment (such as a town centre or
            residential area). Your school will organise these trips, but you are responsible for
            understanding them well enough to answer exam questions about them.</p>
          <p>The key point most students miss: <strong>you will be asked about your own fieldwork
            investigation in the exam</strong>. This means you need to have memorised the specific details
            of what you did, where you did it, and what you found. Vague answers score poorly here.</p>

          <h2>The Fieldwork Enquiry Process</h2>
          <p>Both AQA and Edexcel structure fieldwork questions around the enquiry process. Know these
            stages and be ready to answer questions on any of them:</p>
          <ul>
            <li><strong>Question / Hypothesis</strong> — What were you investigating? (e.g. &quot;Does river
              velocity increase downstream?&quot;)</li>
            <li><strong>Data Collection</strong> — How did you collect your data? What equipment did you
              use? Why was this method appropriate? What were its limitations?</li>
            <li><strong>Data Presentation</strong> — How did you display your results? Why did you choose
              that method (e.g. scatter graph, choropleth map, proportional symbols)?</li>
            <li><strong>Data Analysis</strong> — What patterns did you identify? Were there any anomalies?</li>
            <li><strong>Conclusion</strong> — Did your findings support your hypothesis? What do they
              suggest about the geography of the location?</li>
            <li><strong>Evaluation</strong> — How reliable was your data? How could the investigation be
              improved? Were there any sources of error?</li>
          </ul>

          <blockquote>
            &quot;The evaluation section is where students most often lose marks. &apos;We could have collected more
            data&apos; is not a good evaluation. You need to explain why specific limitations affected your
            results and exactly how you would address them.&quot;
          </blockquote>

          <h2>Data Collection Methods You Should Know</h2>
          <p>Depending on the type of fieldwork, you should be familiar with the following:</p>
          <ul>
            <li><strong>River fieldwork:</strong> measuring velocity using a flow meter or floating object
              and stopwatch, measuring channel width and depth using a tape measure and ranging poles,
              recording bedload size and shape using a calliper and Powers&apos; roundness index.</li>
            <li><strong>Coastal fieldwork:</strong> beach profile surveys using ranging poles and a
              clinometer, measuring pebble size and shape, counting tourist footfall.</li>
            <li><strong>Urban/human fieldwork:</strong> pedestrian counts, environmental quality surveys
              (EQS), questionnaires, land use mapping.</li>
          </ul>

          <h2>Presenting Data in the Exam</h2>
          <p>You may be asked why you chose a particular method to present your data, or to suggest a
            better method. Common presentation methods and when to use them:</p>
          <ul>
            <li><strong>Scatter graphs</strong> — to show correlation between two variables (e.g. distance
              downstream vs velocity)</li>
            <li><strong>Bar charts</strong> — to compare data at different locations or times</li>
            <li><strong>Proportional symbols on a map</strong> — to show spatial variation in quantity</li>
            <li><strong>Choropleth maps</strong> — to show spatial variation in data that covers areas
              (e.g. environmental quality by zone)</li>
          </ul>

          <h2>Unfamiliar Fieldwork Questions</h2>
          <p>As well as questions about your own fieldwork, both AQA and Edexcel include questions based on
            an <em>unfamiliar</em> fieldwork scenario — a context you have not studied before. These are
            designed to test your geographical skills and understanding of the enquiry process rather than
            memory. Practise reading graphs, interpreting maps, and evaluating methods for scenarios you
            have not seen before. This is a transferable skill that improves with practice.</p>

          <p>If your fieldwork trip is coming up, or you are trying to make sense of what you did after
            the fact, a one-to-one session is the most efficient way to work through it. I can help you
            build a clear, exam-ready account of your investigation that will serve you well whatever
            fieldwork question comes up. Book a session through the portal.</p>
        </div>

        <ShareButtons
          url="https://teacherandrewgeo.com/blog/gcse-fieldwork-guide"
          title="GCSE Geography Fieldwork: What to Expect and How to Prepare"
        />
      </article>
    </div>
  );
}
