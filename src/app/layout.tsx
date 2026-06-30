import type { Metadata } from "next";
import "./globals.css";
import "./style.css";
import "./admin.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL('https://teacherandrewgeo.com'),
  title: {
    default: "Teacher Andrew - Expert GCSE Geography Tutoring Online",
    template: "%s | Teacher Andrew Geography Tutoring",
  },
  description: "Expert one-to-one GCSE Geography tutoring online with Teacher Andrew. 14+ years experience, MSc qualified, covering AQA and Edexcel. Students worldwide welcome.",
  keywords: ["GCSE Geography tutor", "online geography tutoring", "AQA Geography", "Edexcel Geography", "GCSE tutor online", "geography revision", "Teacher Andrew"],
  authors: [{ name: "Teacher Andrew" }],
  openGraph: {
    type: 'website',
    siteName: 'Teacher Andrew Geography Tutoring',
    title: 'Teacher Andrew - Expert GCSE Geography Tutoring Online',
    description: 'Expert one-to-one GCSE Geography tutoring online with Teacher Andrew. 14+ years experience, MSc qualified, covering AQA and Edexcel. Students worldwide welcome.',
    url: 'https://teacherandrewgeo.com',
    images: [{ url: '/hero-globe.png', width: 1200, height: 630, alt: 'Teacher Andrew Geography Tutoring' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Teacher Andrew - Expert GCSE Geography Tutoring Online',
    description: 'Expert one-to-one GCSE Geography tutoring online. 14+ years experience, AQA & Edexcel, students worldwide.',
    images: ['/hero-globe.png'],
  },
  robots: { index: true, follow: true },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "Teacher Andrew Geography Tutoring",
  "url": "https://teacherandrewgeo.com",
  "description": "Expert one-to-one GCSE Geography tutoring online with Teacher Andrew. 14+ years teaching experience.",
  "image": "https://teacherandrewgeo.com/hero-globe.png",
  "address": { "@type": "PostalAddress", "addressCountry": "TH" },
  "offers": {
    "@type": "Offer",
    "description": "Online GCSE Geography tutoring sessions",
    "priceCurrency": "GBP",
    "price": "25"
  },
  "founder": {
    "@type": "Person",
    "name": "Teacher Andrew",
    "jobTitle": "Geography Tutor & Head of Humanities",
    "knowsAbout": ["GCSE Geography", "AQA Geography", "Edexcel Geography", "Environmental Hazards", "Crisis Management"]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap"
            rel="stylesheet"
        />
        <script src="https://unpkg.com/@phosphor-icons/web" async></script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>
        <Navbar />
        <main>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
