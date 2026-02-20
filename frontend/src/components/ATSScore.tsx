import { useState, useCallback } from "react";
import { Upload, FileText, BarChart2, CheckCircle, AlertCircle, Lightbulb, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { getAtsScore } from "@/lib/api";

interface SectionScore {
    score: number;
    feedback: string;
}

interface ATSResult {
    overall_score: number;
    grade: string;
    summary: string;
    sections: {
        contact_info: SectionScore;
        work_experience: SectionScore;
        education: SectionScore;
        skills: SectionScore;
        keywords: SectionScore;
        formatting: SectionScore;
    };
    improvements: string[];
    keywords_found: string[];
    keywords_missing: string[];
}

const SECTION_LABELS: Record<string, string> = {
    contact_info: "Contact Info",
    work_experience: "Work Experience",
    education: "Education",
    skills: "Skills",
    keywords: "Keywords",
    formatting: "Formatting",
};

const SECTION_ICONS: Record<string, string> = {
    contact_info: "📇",
    work_experience: "💼",
    education: "🎓",
    skills: "⚡",
    keywords: "🔑",
    formatting: "📄",
};

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

function getGradeColor(grade: string) {
    if (grade.startsWith("A")) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
    if (grade.startsWith("B")) return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    if (grade.startsWith("C")) return "bg-amber-500/10 text-amber-500 border-amber-500/30";
    return "bg-rose-500/10 text-rose-500 border-rose-500/30";
}

// Circular SVG gauge
function ScoreGauge({ score }: { score: number }) {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const strokeDash = (score / 100) * circumference;
    const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#f43f5e";

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width="180" height="180" viewBox="0 0 180 180" className="rotate-[-90deg]">
                <circle cx="90" cy="90" r={radius} fill="none" stroke="currentColor" strokeWidth="12"
                    className="text-muted/30" />
                <circle
                    cx="90" cy="90" r={radius} fill="none"
                    stroke={color} strokeWidth="12"
                    strokeDasharray={`${strokeDash} ${circumference}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 1s ease" }}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-black" style={{ color }}>{score}</span>
                <span className="text-xs text-muted-foreground font-medium">/ 100</span>
            </div>
        </div>
    );
}

export const ATSScore = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ATSResult | null>(null);
    const { toast } = useToast();

    const processFile = useCallback(async (f: File) => {
        if (!f.name.endsWith(".pdf")) {
            toast({ title: "PDF only", description: "Please upload a PDF resume", variant: "destructive" });
            return;
        }
        setFile(f);
        setResult(null);
        setIsLoading(true);
        try {
            const data = await getAtsScore(f);
            setResult(data);
            toast({ title: "ATS analysis complete!", description: `Score: ${data.overall_score}/100 (${data.grade})` });
        } catch (e: unknown) {
            toast({
                title: "Analysis failed",
                description: e instanceof Error ? e.message : "Could not analyse resume",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) processFile(f);
    }, [processFile]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) processFile(f);
    };

    return (
        <div className="space-y-8">
            {/* Upload Zone */}
            <Card className="p-8">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <BarChart2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">ATS Score Analyser</h3>
                        <p className="text-sm text-muted-foreground">Upload your resume to get an AI-powered ATS score breakdown</p>
                    </div>
                </div>

                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300
            ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-primary/5"}`}
                >
                    <div className="flex flex-col items-center space-y-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
              ${isDragging ? "bg-primary text-white animate-pulse" : "bg-primary/10 text-primary"}`}>
                            <Upload className="w-8 h-8" />
                        </div>
                        {file ? (
                            <div className="flex items-center space-x-2 text-primary">
                                <FileText className="w-5 h-5" />
                                <span className="font-medium">{file.name}</span>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <h4 className="text-lg font-semibold text-foreground mb-1">Drop your resume here</h4>
                                    <p className="text-sm text-muted-foreground">PDF files up to 10 MB</p>
                                </div>
                            </>
                        )}
                        <input type="file" accept=".pdf" onChange={handleFileInput} className="hidden" id="ats-file-upload" />
                        <Button
                            variant="outline"
                            onClick={() => document.getElementById("ats-file-upload")?.click()}
                            className="border-primary/20 hover:border-primary/50"
                        >
                            {file ? "Change File" : "Browse Files"}
                        </Button>
                    </div>
                </div>

                {file && !isLoading && !result && (
                    <div className="mt-4 flex justify-center">
                        <Button
                            onClick={() => processFile(file)}
                            className="bg-gradient-primary hover:shadow-primary transition-all duration-300"
                        >
                            <BarChart2 className="w-4 h-4 mr-2" />
                            Analyse ATS Score
                        </Button>
                    </div>
                )}

                {isLoading && (
                    <div className="mt-6 flex flex-col items-center space-y-3">
                        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground animate-pulse">Gemini is analysing your resume…</p>
                    </div>
                )}
            </Card>

            {/* Result */}
            {result && (
                <>
                    {/* Overall Score Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-8 flex flex-col items-center justify-center text-center md:col-span-1">
                            <ScoreGauge score={result.overall_score} />
                            <div className="mt-4 space-y-2">
                                <Badge className={`text-lg px-4 py-1 font-bold border ${getGradeColor(result.grade)}`}>
                                    Grade: {result.grade}
                                </Badge>
                                <p className="text-sm text-muted-foreground">ATS Compatibility Score</p>
                            </div>
                        </Card>

                        <Card className="p-6 md:col-span-2">
                            <h3 className="text-lg font-semibold text-foreground mb-3">Summary</h3>
                            <p className="text-muted-foreground leading-relaxed mb-6">{result.summary}</p>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                                        <CheckCircle className="w-4 h-4 text-emerald-500" /> Keywords Found
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                        {result.keywords_found.slice(0, 8).map((kw) => (
                                            <Badge key={kw} className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                                                {kw}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4 text-rose-500" /> Keywords Missing
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                        {result.keywords_missing.slice(0, 8).map((kw) => (
                                            <Badge key={kw} className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-xs">
                                                {kw}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Section Breakdown */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-6">Section-by-Section Breakdown</h3>
                        <div className="space-y-5">
                            {Object.entries(result.sections).map(([key, sec]) => (
                                <div key={key}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                                            <span>{SECTION_ICONS[key]}</span>
                                            {SECTION_LABELS[key] || key}
                                        </span>
                                        <span className={`text-sm font-bold ${getScoreColor(sec.score)}`}>{sec.score}/100</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${getScoreBarColor(sec.score)}`}
                                            style={{ width: `${sec.score}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">{sec.feedback}</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Improvement Suggestions */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-amber-500" />
                            Improvement Suggestions
                        </h3>
                        <div className="space-y-3">
                            {result.improvements.map((tip, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                                    <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                    <p className="text-sm text-foreground">{tip}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};
