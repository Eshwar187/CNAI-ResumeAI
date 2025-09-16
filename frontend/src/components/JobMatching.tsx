import { useState } from "react";
import { Search, Brain, Target, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface Candidate {
  id: string;
  name: string;
  extractedSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  matchingScore: number;
  jobTitle: string;
}

export const JobMatching = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const mockCandidates: Candidate[] = [
    {
      id: "1",
      name: "Sarah Johnson",
      extractedSkills: ["JavaScript", "React", "Node.js", "Python", "SQL", "AWS", "Git", "Agile"],
      matchedSkills: ["JavaScript", "React", "Node.js", "Python"],
      missingSkills: ["TypeScript", "Docker", "Kubernetes"],
      matchingScore: 85,
      jobTitle: "Senior Full Stack Developer"
    },
    {
      id: "2", 
      name: "Michael Chen",
      extractedSkills: ["Python", "Django", "PostgreSQL", "Docker", "Git", "Linux", "Redis"],
      matchedSkills: ["Python", "Docker", "Git"],
      missingSkills: ["JavaScript", "React", "Node.js", "TypeScript"],
      matchingScore: 68,
      jobTitle: "Backend Developer"
    },
    {
      id: "3",
      name: "Emily Rodriguez",
      extractedSkills: ["JavaScript", "React", "TypeScript", "GraphQL", "MongoDB", "Jest", "Git"],
      matchedSkills: ["JavaScript", "React", "TypeScript"],
      missingSkills: ["Node.js", "Python", "AWS"],
      matchingScore: 72,
      jobTitle: "Frontend Developer"
    }
  ];

  const handleAnalyze = () => {
    if (!jobDescription.trim()) {
      toast({
        title: "Job description required",
        description: "Please enter a job description to analyze",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    // If a file is selected, call backend match API
    (async () => {
      try {
        if (!selectedFile) {
          toast({ title: 'Select a resume first', description: 'Please upload and select a resume to match', variant: 'destructive' });
          setIsAnalyzing(false);
          return;
        }

        // dynamic import to avoid cycle in some bundlers
        const api = await import('@/lib/api');
        const res = await api.matchJobWithFile(selectedFile, jobDescription);

        // convert response into candidates list with one candidate
        const match = res.match;
        const candidate: Candidate = {
          id: 'uploaded-1',
          name: selectedFile.name,
          extractedSkills: (res?.resume_skills || []).map((s: string) => s),
          matchedSkills: match.matched_skills || [],
          missingSkills: [],
          matchingScore: match.score || 0,
          jobTitle: 'Uploaded Resume'
        };

        setCandidates([candidate]);
        toast({ title: 'Analysis complete', description: `Matched resume: ${selectedFile.name}` });
      } catch (e) {
        toast({ title: 'Analysis failed', description: String(e), variant: 'destructive' });
      } finally {
        setIsAnalyzing(false);
      }
    })();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-success";
    if (score >= 60) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="space-y-8">
      {/* Job Description Input */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Job Description Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Paste your job description to find the best matching candidates
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Textarea
            placeholder="Paste your job description here. Include required skills, qualifications, and responsibilities..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="min-h-32 resize-none"
          />
            <div className="mt-2">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              {selectedFile && <div className="text-sm text-muted-foreground mt-1">Selected: {selectedFile.name}</div>}
            </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-gradient-primary hover:shadow-primary transition-all duration-300"
            >
              {isAnalyzing ? (
                <>
                  <Brain className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Match Skills
                </>
              )}
            </Button>
            
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Analysis Results */}
      {candidates.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Candidate Matches ({candidates.length})
              </h3>
              <p className="text-sm text-muted-foreground">
                Ranked by skill matching score
              </p>
            </div>
            
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Results
            </Button>
          </div>

          <div className="space-y-4">
            {candidates
              .sort((a, b) => b.matchingScore - a.matchingScore)
              .map((candidate) => (
                <div
                  key={candidate.id}
                  className="p-6 bg-card border border-border rounded-xl hover:shadow-card transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-foreground">
                        {candidate.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {candidate.jobTitle}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(candidate.matchingScore)}`}>
                        {candidate.matchingScore}%
                      </div>
                      <div className="text-xs text-muted-foreground">Match Score</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <Progress
                      value={candidate.matchingScore}
                      className="h-2"
                    />
                  </div>

                  {/* Skills Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Matched Skills */}
                    <div>
                      <h5 className="text-sm font-medium text-foreground mb-2 flex items-center">
                        ✅ Matched Skills ({candidate.matchedSkills.length})
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {candidate.matchedSkills.map((skill) => (
                          <Badge
                            key={skill}
                            className="bg-success/10 text-success border-success/20 hover:bg-success/20"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div>
                      <h5 className="text-sm font-medium text-foreground mb-2 flex items-center">
                        ❌ Missing Skills ({candidate.missingSkills.length})
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {candidate.missingSkills.map((skill) => (
                          <Badge
                            key={skill}
                            className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {/* action buttons removed per request */}
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {candidates.length === 0 && !isAnalyzing && (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Analysis Yet
          </h3>
          <p className="text-muted-foreground">
            Enter a job description above to see candidate matches and skill analysis
          </p>
        </Card>
      )}
    </div>
  );
};