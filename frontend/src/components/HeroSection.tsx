import { ArrowRight, Zap, Brain, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface HeroSectionProps {
  onUploadClick: () => void;
}

export const HeroSection = ({ onUploadClick }: HeroSectionProps) => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Advanced machine learning extracts key skills and qualifications",
    },
    {
      icon: Target,
      title: "Smart Matching",
      description: "Intelligent scoring system matches candidates to job requirements",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Process hundreds of resumes in seconds, not hours",
    },
  ];

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-background to-muted/30">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="container mx-auto text-center relative">
        {/* Main Hero Content */}
        <div className="max-w-4xl mx-auto mb-16 animate-fade-in">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            <span>AI-Powered Recruitment</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Smart Resume Screening &{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Skill Matching
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Upload resumes, extract key skills, and match them to job descriptions using 
            advanced AI. Streamline your hiring process with intelligent automation.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button
              onClick={onUploadClick}
              size="lg"
              className="bg-gradient-primary hover:shadow-primary transition-all duration-300 transform hover:scale-105 group"
            >
              <span>Upload Resume</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
  
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-6 text-center hover:shadow-card transition-all duration-300 transform hover:-translate-y-1 animate-slide-up border-border/50"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-primary rounded-xl mb-4 shadow-primary">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>

        {/* Stats section removed */}
      </div>
    </section>
  );
};