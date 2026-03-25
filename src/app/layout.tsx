import type { Metadata } from "next";
import "./globals.css";
import "./style.css";
import "./admin.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Teacher Andrew - Geography Tutoring",
  description: "Expert Geography Tutoring with Teacher Andrew. 14+ years experience preparing students for GCSEs and beyond.",
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
