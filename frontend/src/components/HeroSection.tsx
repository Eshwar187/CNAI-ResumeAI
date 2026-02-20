import { ArrowRight, Zap, Brain, Target, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  const features = [
    {
      icon: Brain,
      title: "AI Skill Extraction",
      description: "Gemini AI reads your resume and automatically identifies every technical skill",
    },
    {
      icon: Target,
      title: "Job Skill Matching",
      description: "Paste a job description and instantly see how well your resume skills match",
    },
    {
      icon: BarChart2,
      title: "ATS Score",
      description: "Get a section-by-section ATS compatibility score before you apply",
    },
  ];

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-background to-muted/30">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />

      <div className="container mx-auto text-center relative">
        <div className="max-w-4xl mx-auto mb-16 animate-fade-in">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            <span>Powered by Google Gemini AI</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Smart Resume Screening &{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              ATS Scoring
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Upload your resume to match it against job descriptions and get a full ATS compatibility
            score — all powered by Gemini AI.
          </p>

          <Button
            onClick={onGetStarted}
            size="lg"
            className="bg-gradient-primary hover:shadow-primary transition-all duration-300 transform hover:scale-105 group"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              onClick={onGetStarted}
              className="p-6 text-center hover:shadow-card transition-all duration-300 transform hover:-translate-y-1 animate-slide-up border-border/50 cursor-pointer group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-primary rounded-xl mb-4 shadow-primary group-hover:scale-110 transition-transform duration-200">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};