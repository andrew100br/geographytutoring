import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://teacherandrewgeo.com';
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/booking`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/blog/development-gap-gcse`, lastModified: new Date('2026-10-01'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog/urban-issues-gcse`, lastModified: new Date('2026-09-01'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog/gcse-fieldwork-guide`, lastModified: new Date('2026-08-01'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog/rivers-and-coasts-guide`, lastModified: new Date('2026-07-01'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog/how-to-write-9-mark-answer`, lastModified: new Date('2026-06-01'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog/gcse-exam-topics`, lastModified: new Date('2026-05-01'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog/benefits-of-online-tutoring`, lastModified: new Date('2026-04-08'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog/aqa-paper-2-guide`, lastModified: new Date('2026-04-02'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog/climate-change-gcse`, lastModified: new Date('2026-03-20'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog/gcse-study-tips`, lastModified: new Date('2024-03-15'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog/why-geography-matters`, lastModified: new Date('2024-02-28'), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog/tectonic-hazards`, lastModified: new Date('2024-01-10'), changeFrequency: 'monthly', priority: 0.7 },
  ];
}
