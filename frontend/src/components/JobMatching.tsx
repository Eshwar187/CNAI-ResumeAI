import { useState, useCallback } from "react";
import { Search, Brain, Target, Upload, FileText, CheckCircle, XCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { matchJobWithFile } from "@/lib/api";

interface MatchResult {
  resumeFile: string;
  resumeSkills: string[];
  jobSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  score: number;
  precision: number;
  recall: number;
  f1: number;
  explanation: string;
  reasons: string[];
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-rose-500";
}

function getScoreBarColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

function getScoreLabel(score: number) {
  if (score >= 80) return { label: "Excellent Match", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" };
  if (score >= 60) return { label: "Good Match", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
  if (score >= 40) return { label: "Fair Match", cls: "bg-orange-500/10 text-orange-600 border-orange-500/30" };
  return { label: "Poor Match", cls: "bg-rose-500/10 text-rose-500 border-rose-500/30" };
}

export const JobMatching = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const { toast } = useToast();

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".pdf")) setSelectedFile(f);
    else toast({ title: "PDF only", variant: "destructive" });
  }, [toast]);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      toast({ title: "Job description required", description: "Paste a job description first", variant: "destructive" });
      return;
    }
    if (!selectedFile) {
      toast({ title: "Resume required", description: "Upload a PDF resume first", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    try {
      const res = await matchJobWithFile(selectedFile, jobDescription);
      const match = res.match;
      setResult({
        resumeFile: selectedFile.name,
        resumeSkills: res.resume_skills || [],
        jobSkills: res.job_skills || [],
        matchedSkills: match.matched_skills || [],
        missingSkills: match.missing_skills || [],
        score: match.score ?? 0,
        precision: match.precision ?? 0,
        recall: match.recall ?? 0,
        f1: match.f1 ?? 0,
        explanation: res.explain?.explanation || "",
        reasons: res.explain?.reasons || [],
      });
      toast({ title: "Analysis complete!", description: `Match score: ${match.score}%` });
    } catch (e: unknown) {
      toast({
        title: "Analysis failed",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const { label: scoreLabel, cls: scoreCls } = result ? getScoreLabel(result.score) : { label: "", cls: "" };

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Job Description Analysis</h3>
            <p className="text-sm text-muted-foreground">Paste a job description and upload your resume to see how well you match</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Job Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Job Description</label>
            <Textarea
              placeholder="Paste the job description here. Include required skills, qualifications, and responsibilities..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[180px] resize-none"
            />
            <p className="text-xs text-muted-foreground">{jobDescription.length} characters</p>
          </div>

          {/* Resume Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Resume (PDF)</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 flex flex-col items-center justify-center min-h-[180px]
                ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-primary/5"}`}
            >
              {selectedFile ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Drag & drop or browse</p>
                  <input type="file" accept=".pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} className="hidden" id="match-file-upload" />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById("match-file-upload")?.click()}>
                    Browse PDF
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !selectedFile || !jobDescription.trim()}
            size="lg"
            className="bg-gradient-primary hover:shadow-primary transition-all duration-300 min-w-[200px]"
          >
            {isAnalyzing ? (
              <>
                <Brain className="w-4 h-4 mr-2 animate-spin" />
                Analysing with Gemini…
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Match Skills
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 text-center">
              <div className={`text-5xl font-black mb-2 ${getScoreColor(result.score)}`}>{result.score}%</div>
              <Badge className={`border ${scoreCls} font-semibold`}>{scoreLabel}</Badge>
              <p className="text-xs text-muted-foreground mt-2">Skill Match Score</p>
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${getScoreBarColor(result.score)} transition-all duration-700`} style={{ width: `${result.score}%` }} />
              </div>
            </Card>

            <Card className="p-6 text-center">
              <div className="text-4xl font-bold text-foreground mb-1">{result.matchedSkills.length}</div>
              <p className="text-sm text-emerald-600 font-medium">Skills Matched</p>
              <div className="mt-2 text-xs text-muted-foreground">out of {result.jobSkills.length} required skills</div>
              <Progress value={(result.matchedSkills.length / Math.max(result.jobSkills.length, 1)) * 100} className="mt-3 h-2" />
            </Card>

            <Card className="p-6 text-center">
              <div className="text-4xl font-bold text-foreground mb-1">{result.missingSkills.length}</div>
              <p className="text-sm text-rose-500 font-medium">Skills Missing</p>
              <div className="mt-2 text-xs text-muted-foreground">from job requirements</div>
              <div className="mt-3 flex justify-center gap-1 flex-wrap">
                {result.missingSkills.slice(0, 3).map((s) => (
                  <Badge key={s} className="bg-rose-500/10 text-rose-500 text-xs border-rose-500/20">{s}</Badge>
                ))}
              </div>
            </Card>
          </div>

          {/* AI Explanation */}
          {result.explanation && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Gemini AI Analysis
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">{result.explanation}</p>
              {result.reasons.length > 0 && (
                <div className="space-y-2">
                  {result.reasons.map((reason, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/40">
                      <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm text-foreground">{reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Skills Breakdown */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Skills Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Matched Skills ({result.matchedSkills.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.matchedSkills.length > 0 ? result.matchedSkills.map((skill) => (
                    <Badge key={skill} className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 capitalize">
                      {skill}
                    </Badge>
                  )) : (
                    <p className="text-sm text-muted-foreground">No skills matched</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-500" />
                  Missing Skills ({result.missingSkills.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.missingSkills.length > 0 ? result.missingSkills.map((skill) => (
                    <Badge key={skill} className="bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20 capitalize">
                      {skill}
                    </Badge>
                  )) : (
                    <p className="text-sm text-emerald-600 font-medium">🎉 You have all required skills!</p>
                  )}
                </div>
              </div>
            </div>

            {/* All Resume Skills */}
            {result.resumeSkills.length > 0 && (
              <div className="mt-6 pt-5 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">All Skills from Your Resume</h4>
                <div className="flex flex-wrap gap-1.5">
                  {result.resumeSkills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="capitalize text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Empty State */}
      {!result && !isAnalyzing && (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Analysis Yet</h3>
          <p className="text-muted-foreground text-sm">
            Paste a job description and upload your resume above, then click <strong>Match Skills</strong>
          </p>
        </Card>
      )}
    </div>
  );
};