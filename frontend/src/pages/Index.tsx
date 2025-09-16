import { useState } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ResumeUpload } from "@/components/ResumeUpload";
import { JobMatching } from "@/components/JobMatching";
import { ReportsSection } from "@/components/ReportsSection";

const Index = () => {
  const [activeSection, setActiveSection] = useState("home");

  const handleUploadClick = () => {
    setActiveSection("upload");
  };

  const renderContent = () => {
    switch (activeSection) {
      case "upload":
        return <ResumeUpload />;
      case "matching":
        return <JobMatching />;
      case "reports":
        return <ReportsSection />;
      default:
        return <HeroSection onUploadClick={handleUploadClick} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <main className="animate-fade-in">
        {activeSection === "home" ? (
          renderContent()
        ) : (
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderContent()}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
