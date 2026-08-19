import Link from 'next/link';
import ShareButtons from '@/components/ShareButtons';

export const metadata = {
  title: 'How to Write a Perfect Extended Answer: AQA, Edexcel & Cambridge IGCSE - Teacher Andrew',
  description: 'Master the top-mark extended writing question for your Geography exam — whether you\'re sitting AQA (9 marks), Edexcel (8 marks), or Cambridge IGCSE (7 marks).',
  openGraph: {
    title: 'How to Write a Perfect Extended Answer: AQA, Edexcel & Cambridge IGCSE',
    description: 'The exact structure and technique to score maximum marks on extended writing — for AQA, Edexcel, and Cambridge IGCSE Geography.',
    url: 'https://teacherandrewgeo.com/blog/how-to-write-9-mark-answer',
    images: [{ url: '/blog_exam_guide.jpg', width: 1200, height: 630 }],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Write a Perfect Extended Answer: AQA, Edexcel & Cambridge IGCSE',
    description: 'Score maximum marks on extended writing — structure and technique for AQA, Edexcel, and Cambridge IGCSE Geography.',
    images: ['/blog_exam_guide.jpg'],
  },
};

export default function ExtendedAnswerPost() {
  return (
    <div className="blog-post-main">
      <article className="container blog-post-container">
        <Link href="/blog" className="back-to-blog">
          <i className="ph ph-arrow-left"></i> Back to Blog
        </Link>

        <div className="post-header">
          <div className="post-meta">
            <span><i className="ph ph-calendar-blank"></i> June 1, 2026</span>
            <span><i className="ph ph-clock"></i> 8 min read</span>
          </div>
          <h1 className="post-title">How to Write a Perfect Extended Answer: AQA, Edexcel &amp; Cambridge IGCSE</h1>
        </div>

        <div className="post-hero-image" style={{ backgroundImage: 'url(/blog_exam_guide.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />

        <div className="post-content">
          <p>The extended writing question is the highest-value question on every Geography exam — and it is
            the question most students answer least effectively. Whether you are sitting AQA, Pearson Edexcel,
            or Cambridge IGCSE, the principle is the same: examiners want to see geographical thinking, not
            just geographical knowledge. This guide breaks down exactly what each curriculum expects and
            gives you a structure to follow every time.</p>

          <h2>Know Your Exam — What Are You Actually Answering?</h2>
          <p>The first thing to understand is that the mark allocation and marking approach differ between
            curricula. Make sure you know which one applies to you:</p>

          <ul>
            <li><strong>AQA GCSE Geography (9-1)</strong> — Extended writing questions are worth
              <strong> 9 marks</strong>, with an additional <strong>3 marks for SPaG</strong>
              (Spelling, Punctuation and Grammar) on selected questions. Marked using a 3-level
              holistic mark scheme. Command words: <em>assess</em>, <em>evaluate</em>,
              <em>to what extent</em>.</li>
            <li><strong>Pearson Edexcel GCSE Geography (A &amp; B)</strong> — Top extended writing
              questions are worth <strong>8 marks</strong>, also marked using a levels-based approach.
              SPaG marks are allocated across the paper separately. Command words: <em>assess</em>,
              <em>evaluate</em>.</li>
            <li><strong>Cambridge IGCSE Geography (0460 / 0976)</strong> — The highest-mark extended
              response questions are worth <strong>7 marks</strong>. Unlike AQA and Edexcel, Cambridge
              uses a <strong>points-based mark scheme</strong> — marks are awarded for each valid,
              developed geographical point rather than a holistic level judgement. Command words:
              <em>describe</em>, <em>explain</em>, <em>suggest</em>, <em>discuss</em>.</li>
          </ul>

          <blockquote>
            &quot;The most common mistake I see is students writing the same way for every exam. AQA and
            Edexcel reward evaluation and a clear conclusion. Cambridge rewards developed, evidence-backed
            points. These are different skills — train for the one you are actually being examined on.&quot;
          </blockquote>

          <h2>AQA (9 Marks) — Evaluate Both Sides, Then Conclude</h2>
          <p>AQA marks holistically across three levels. The difference between Level 2 and Level 3 is
            almost always whether you have evaluated (not just described) and whether you have a clear
            conclusion.</p>

          <p><strong>Structure for every AQA extended answer:</strong></p>
          <ul>
            <li><strong>Point</strong> — make a clear, relevant geographical claim</li>
            <li><strong>Evidence</strong> — support it with a named case study and specific data</li>
            <li><strong>Explain</strong> — develop it using geographical reasoning</li>
            <li><strong>Evaluate</strong> — consider the other side or a limitation</li>
          </ul>
          <p>Write 2–3 paragraphs using this structure (covering both sides of the argument), then finish
            with a conclusion that directly answers the question. Your conclusion must be justified by
            your evidence — do not introduce new information.</p>
          <p>On SPaG questions, write in full sentences with accurate spelling and punctuation throughout.
            These 3 marks are straightforward to secure and are often left on the table by students who
            write carelessly.</p>

          <h2>Edexcel (8 Marks) — Same Principle, Slightly Fewer Marks</h2>
          <p>Edexcel&apos;s extended writing follows the same levels-based approach as AQA. The structure advice
            is identical — evaluate both sides, use named case studies with specific data, and conclude
            clearly. The slightly lower mark total (8 vs 9) means one well-developed evaluative paragraph
            per side, plus a conclusion, is the target. Do not sacrifice depth for length.</p>
          <p>Edexcel questions often include a resource (map, graph, or photograph) as part of the
            question. Make sure your answer references that resource explicitly — students who ignore it
            limit themselves to Level 2 at best.</p>

          <h2>Cambridge IGCSE (7 Marks) — Points-Based, Not Holistic</h2>
          <p>Cambridge marks differently to AQA and Edexcel, and this trips up students who have been
            trained for one style and are then sitting the other. Marks are awarded for each valid
            developed point — which means you need to write more individual points, each one supported
            with a geographical reason or example.</p>

          <p><strong>Structure for Cambridge 7-mark answers:</strong></p>
          <ul>
            <li>Aim for <strong>at least 4–5 developed points</strong> — a simple statement alone earns
              1 mark; a statement plus a reason or example earns 2 marks for that point</li>
            <li>Use command words carefully:
              <strong> &apos;Describe&apos;</strong> means say what something is like (patterns, amounts,
              locations); <strong>&apos;Explain&apos;</strong> means give reasons why; <strong>&apos;Discuss&apos;</strong> means
              present more than one viewpoint; <strong>&apos;Suggest&apos;</strong> means apply your knowledge to
              a context you may not have studied directly</li>
            <li>You do not always need a formal conclusion — but for &apos;Discuss&apos; and &apos;Evaluate&apos; questions,
              a brief concluding statement that weighs up the points strengthens your answer</li>
            <li>Geographical terminology matters — use it accurately and consistently</li>
          </ul>

          <p>A common mistake on Cambridge papers is writing in vague generalities. &quot;Flooding causes damage
            to homes&quot; earns 1 mark. &quot;Flooding causes structural damage to homes, particularly in LICs
            where buildings are not constructed to withstand high water levels, leaving families without
            shelter for extended periods&quot; earns 2 marks for that point. That difference, multiplied across
            5–6 points, is what separates a top grade from a mid-grade answer.</p>

          <h2>What All Three Have in Common</h2>
          <p>Despite the differences in mark allocation and marking approach, there are three things that
            improve extended writing on every curriculum:</p>
          <ul>
            <li><strong>Specific evidence</strong> — named places, real events, and actual statistics
              always score better than vague generalisations</li>
            <li><strong>Geographical vocabulary</strong> — use the correct technical terms confidently
              and accurately</li>
            <li><strong>Planning before you write</strong> — spend 2 minutes noting the key points,
              both sides (where relevant), and your conclusion before you start. Students who plan
              consistently write more focused, higher-scoring answers</li>
          </ul>

          <p>Extended writing is a skill that improves significantly with guided practice and personalised
            feedback. Whether you are sitting AQA, Edexcel, or Cambridge IGCSE, working through past
            paper questions with a teacher who can show you exactly where marks are being missed makes a
            real difference. Book a session through the portal and we can focus on whichever curriculum
            and question type you need most.</p>
        </div>

        <ShareButtons
          url="https://teacherandrewgeo.com/blog/how-to-write-9-mark-answer"
          title="How to Write a Perfect Extended Answer: AQA, Edexcel & Cambridge IGCSE"
        />
      </article>
    </div>
  );
}
