"use client";

import { useEffect, useRef } from "react";
import { Nav } from "./_components/Nav";
import { Hero } from "./_components/Hero";
import { QuickSetupSwitcher } from "./_components/QuickSetupSwitcher";
import { FeaturesSection } from "./_components/FeaturesSection";
import { ComparisonSection } from "./_components/ComparisonSection";
import { DarkSection } from "./_components/DarkSection";
import { EndToEndSection } from "./_components/EndToEndSection";
import { CTASection } from "./_components/CTASection";
import { Footer } from "./_components/Footer";

export default function Home() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fade-in observer
  useEffect(() => {
    const elements = document.querySelectorAll(".fade-in");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.15 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Scroll progress bar
  useEffect(() => {
    const bar = scrollRef.current;
    if (!bar) return;
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;
      bar.style.transform = `scaleX(${progress})`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-black">
      <div ref={scrollRef} className="scroll-progress w-full" style={{ transform: "scaleX(0)" }} />

      <Nav />
      <Hero />
      <QuickSetupSwitcher />
      <FeaturesSection />
      <ComparisonSection />
      <DarkSection />
      <EndToEndSection />
      <CTASection />
      <Footer />
    </div>
  );
}
