import { useState } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ATSChecking } from "@/components/ATSChecking";

const Index = () => {
  const [activeSection, setActiveSection] = useState("home");

  return (
    <div className="min-h-screen bg-background">
      <Header activeSection={activeSection} onSectionChange={setActiveSection} />
      <main className="animate-fade-in">
        {activeSection === "home" ? (
          <HeroSection onGetStarted={() => setActiveSection("matching")} />
        ) : (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ATSChecking />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
