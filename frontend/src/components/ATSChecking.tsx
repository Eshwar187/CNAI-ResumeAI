import { useState, useCallback } from "react";
import {
    Search, Brain, Target, Upload, FileText,
    CheckCircle, XCircle, Info, BarChart2, Lightbulb, ChevronRight, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { matchJobWithFile, getAtsScore } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchResult {
    resumeFile: string;
    resumeSkills: string[];
    jobSkills: string[];
    matchedSkills: string[];
    missingSkills: string[];
    score: number;
    explanation: string;
    reasons: string[];
}

interface SectionScore { score: number; feedback: string; }
interface ATSResult {
    overall_score: number;
    grade: string;
    summary: string;
    sections: Record<string, SectionScore>;
    improvements: string[];
    keywords_found: string[];
    keywords_missing: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
    contact_info: "Contact Info",
    work_experience: "Work Experience",
    education: "Education",
    skills: "Skills",
    keywords: "Keywords",
    formatting: "Formatting",
};
const SECTION_ICONS: Record<string, string> = {
    contact_info: "📇", work_experience: "💼", education: "🎓",
    skills: "⚡", keywords: "🔑", formatting: "📄",
};

function scoreColor(s: number) {
    return s >= 80 ? "text-emerald-500" : s >= 60 ? "text-amber-500" : "text-rose-500";
}
function scoreBar(s: number) {
    return s >= 80 ? "bg-emerald-500" : s >= 60 ? "bg-amber-500" : "bg-rose-500";
}
function scoreBadge(s: number) {
    if (s >= 80) return { label: "Excellent Match", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" };
    if (s >= 60) return { label: "Good Match", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
    if (s >= 40) return { label: "Fair Match", cls: "bg-orange-500/10 text-orange-600 border-orange-500/30" };
    return { label: "Poor Match", cls: "bg-rose-500/10 text-rose-500 border-rose-500/30" };
}
function gradeBadge(grade: string) {
    if (grade.startsWith("A")) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
    if (grade.startsWith("B")) return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    if (grade.startsWith("C")) return "bg-amber-500/10 text-amber-500 border-amber-500/30";
    return "bg-rose-500/10 text-rose-500 border-rose-500/30";
}

// ─── Circular Gauge ───────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
    const r = 70;
    const circ = 2 * Math.PI * r;
    const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#f43f5e";
    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width="180" height="180" viewBox="0 0 180 180" className="rotate-[-90deg]">
                <circle cx="90" cy="90" r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/30" />
                <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="12"
                    strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 1s ease" }} />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-black" style={{ color }}>{score}</span>
                <span className="text-xs text-muted-foreground font-medium">/ 100</span>
            </div>
        </div>
    );
}

// ─── Shared File Upload Zone ──────────────────────────────────────────────────

function FileDropZone({ file, onFile, onClear }: {
    file: File | null;
    onFile: (f: File) => void;
    onClear: () => void;
}) {
    const [dragging, setDragging] = useState(false);
    const { toast } = useToast();

    const handle = (f: File) => {
        if (!f.name.endsWith(".pdf")) {
            toast({ title: "PDF only", variant: "destructive" });
            return;
        }
        onFile(f);
    };

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 flex flex-col items-center justify-center min-h-[160px]
        ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-primary/5"}`}
        >
            {file ? (
                <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                    <Button variant="ghost" size="sm" onClick={onClear} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-7 text-xs">
                        Remove
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Drag & drop your PDF resume</p>
                    <input type="file" accept=".pdf" className="hidden"
                        id="ats-file-unified"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }} />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById("ats-file-unified")?.click()}>
                        Browse PDF
                    </Button>
                </div>
            )}
        </div>
    );
}

// ─── Tab 1: Job Matching ──────────────────────────────────────────────────────

function JobMatchTab() {
    const [jobDescription, setJobDescription] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<MatchResult | null>(null);
    const { toast } = useToast();

    const handleAnalyze = async () => {
        if (!jobDescription.trim()) {
            toast({ title: "Job description required", variant: "destructive" }); return;
        }
        if (!file) {
            toast({ title: "Resume required", description: "Upload a PDF first", variant: "destructive" }); return;
        }
        setLoading(true); setResult(null);
        try {
            const res = await matchJobWithFile(file, jobDescription);
            const m = res.match;
            setResult({
                resumeFile: file.name,
                resumeSkills: res.resume_skills || [],
                jobSkills: res.job_skills || [],
                matchedSkills: m.matched_skills || [],
                missingSkills: m.missing_skills || [],
                score: m.score ?? 0,
                explanation: res.explain?.explanation || "",
                reasons: res.explain?.reasons || [],
            });
            toast({ title: "Analysis complete!", description: `Match: ${m.score}%` });
        } catch (e: unknown) {
            toast({ title: "Analysis failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
        } finally { setLoading(false); }
    };

    const { label, cls } = result ? scoreBadge(result.score) : { label: "", cls: "" };

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Job Description</label>
                        <Textarea
                            placeholder="Paste the job description here..."
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            className="min-h-[180px] resize-none"
                        />
                        <p className="text-xs text-muted-foreground">{jobDescription.length} characters</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Your Resume (PDF)</label>
                        <FileDropZone file={file} onFile={setFile} onClear={() => setFile(null)} />
                    </div>
                </div>
                <div className="mt-6 flex justify-center">
                    <Button
                        onClick={handleAnalyze}
                        disabled={loading || !file || !jobDescription.trim()}
                        size="lg"
                        className="bg-gradient-primary hover:shadow-primary transition-all duration-300 min-w-[200px]"
                    >
                        {loading ? (
                            <><Brain className="w-4 h-4 mr-2 animate-spin" />Analysing with Gemini…</>
                        ) : (
                            <><Target className="w-4 h-4 mr-2" />Match Skills</>
                        )}
                    </Button>
                </div>
            </Card>

            {result && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-6 text-center">
                            <div className={`text-5xl font-black mb-2 ${scoreColor(result.score)}`}>{result.score}%</div>
                            <Badge className={`border ${cls} font-semibold`}>{label}</Badge>
                            <p className="text-xs text-muted-foreground mt-2">Skill Match Score</p>
                            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${scoreBar(result.score)} transition-all duration-700`} style={{ width: `${result.score}%` }} />
                            </div>
                        </Card>
                        <Card className="p-6 text-center">
                            <div className="text-4xl font-bold text-foreground mb-1">{result.matchedSkills.length}</div>
                            <p className="text-sm text-emerald-600 font-medium">Skills Matched</p>
                            <div className="mt-2 text-xs text-muted-foreground">of {result.jobSkills.length} required</div>
                            <Progress value={(result.matchedSkills.length / Math.max(result.jobSkills.length, 1)) * 100} className="mt-3 h-2" />
                        </Card>
                        <Card className="p-6 text-center">
                            <div className="text-4xl font-bold text-foreground mb-1">{result.missingSkills.length}</div>
                            <p className="text-sm text-rose-500 font-medium">Skills Missing</p>
                            <div className="mt-2 flex flex-wrap justify-center gap-1">
                                {result.missingSkills.slice(0, 3).map((s) => (
                                    <Badge key={s} className="bg-rose-500/10 text-rose-500 text-xs border-rose-500/20 capitalize">{s}</Badge>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {result.explanation && (
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Brain className="w-5 h-5 text-primary" />Gemini AI Analysis
                            </h3>
                            <p className="text-muted-foreground leading-relaxed mb-4">{result.explanation}</p>
                            {result.reasons.length > 0 && (
                                <div className="space-y-2">
                                    {result.reasons.map((r, i) => (
                                        <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/40">
                                            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                            <p className="text-sm text-foreground">{r}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    )}

                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-6">Skills Breakdown</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />Matched ({result.matchedSkills.length})
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.matchedSkills.length > 0
                                        ? result.matchedSkills.map((s) => (
                                            <Badge key={s} className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 capitalize">{s}</Badge>
                                        ))
                                        : <p className="text-sm text-muted-foreground">No skills matched</p>}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                    <XCircle className="w-4 h-4 text-rose-500" />Missing ({result.missingSkills.length})
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.missingSkills.length > 0
                                        ? result.missingSkills.map((s) => (
                                            <Badge key={s} className="bg-rose-500/10 text-rose-500 border-rose-500/20 capitalize">{s}</Badge>
                                        ))
                                        : <p className="text-sm text-emerald-600 font-medium">🎉 You have all required skills!</p>}
                                </div>
                            </div>
                        </div>
                        {result.resumeSkills.length > 0 && (
                            <div className="mt-6 pt-5 border-t border-border">
                                <h4 className="text-sm font-semibold text-foreground mb-3">All Skills from Resume</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {result.resumeSkills.map((s) => (
                                        <Badge key={s} variant="secondary" className="capitalize text-xs">{s}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </>
            )}

            {!result && !loading && (
                <Card className="p-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Target className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Analysis Yet</h3>
                    <p className="text-sm text-muted-foreground">Paste a job description and upload your resume, then click <strong>Match Skills</strong></p>
                </Card>
            )}
        </div>
    );
}

// ─── Tab 2: ATS Score ─────────────────────────────────────────────────────────

function ATSScoreTab() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ATSResult | null>(null);
    const { toast } = useToast();

    const analyse = useCallback(async (f: File) => {
        setFile(f); setResult(null); setLoading(true);
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
        } finally { setLoading(false); }
    }, [toast]);

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <div className="max-w-md mx-auto space-y-4">
                    <div className="text-center">
                        <h3 className="font-semibold text-foreground mb-1">Upload Your Resume</h3>
                        <p className="text-sm text-muted-foreground">Get an AI-powered ATS compatibility score</p>
                    </div>
                    <FileDropZone
                        file={file}
                        onFile={(f) => { setFile(f); setResult(null); }}
                        onClear={() => { setFile(null); setResult(null); }}
                    />
                    {file && !loading && (
                        <div className="flex justify-center">
                            <Button
                                onClick={() => analyse(file)}
                                className="bg-gradient-primary hover:shadow-primary transition-all duration-300"
                            >
                                <BarChart2 className="w-4 h-4 mr-2" />
                                Analyse ATS Score
                            </Button>
                        </div>
                    )}
                    {loading && (
                        <div className="flex flex-col items-center gap-2 py-4">
                            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <p className="text-sm text-muted-foreground animate-pulse">Gemini is analysing your resume…</p>
                        </div>
                    )}
                </div>
            </Card>

            {result && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-8 flex flex-col items-center justify-center text-center">
                            <ScoreGauge score={result.overall_score} />
                            <div className="mt-4 space-y-2">
                                <Badge className={`text-base px-4 py-1 font-bold border ${gradeBadge(result.grade)}`}>
                                    Grade: {result.grade}
                                </Badge>
                                <p className="text-xs text-muted-foreground">ATS Compatibility</p>
                            </div>
                        </Card>
                        <Card className="p-6 md:col-span-2">
                            <h3 className="text-lg font-semibold text-foreground mb-3">Summary</h3>
                            <p className="text-muted-foreground leading-relaxed mb-6">{result.summary}</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                                        <CheckCircle className="w-4 h-4 text-emerald-500" />Keywords Found
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                        {result.keywords_found.slice(0, 8).map((kw) => (
                                            <Badge key={kw} className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">{kw}</Badge>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4 text-rose-500" />Keywords Missing
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                        {result.keywords_missing.slice(0, 8).map((kw) => (
                                            <Badge key={kw} className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-xs">{kw}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-6">Section-by-Section Breakdown</h3>
                        <div className="space-y-5">
                            {Object.entries(result.sections).map(([key, sec]) => (
                                <div key={key}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                                            <span>{SECTION_ICONS[key] || "📌"}</span>{SECTION_LABELS[key] || key}
                                        </span>
                                        <span className={`text-sm font-bold ${scoreColor(sec.score)}`}>{sec.score}/100</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                                        <div className={`h-full rounded-full ${scoreBar(sec.score)} transition-all duration-700`} style={{ width: `${sec.score}%` }} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">{sec.feedback}</p>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-amber-500" />Improvement Suggestions
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

            {!result && !loading && !file && (
                <Card className="p-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart2 className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Resume Uploaded</h3>
                    <p className="text-sm text-muted-foreground">Upload a PDF resume above to see your ATS score</p>
                </Card>
            )}
        </div>
    );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export const ATSChecking = () => {
    const [activeTab, setActiveTab] = useState<"match" | "ats">("match");

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl font-bold text-foreground">ATS Checking</h2>
                <p className="text-muted-foreground text-sm mt-1">
                    Match your resume against a job description or check your ATS compatibility score
                </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex space-x-1 bg-muted/50 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab("match")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200
            ${activeTab === "match"
                            ? "bg-white dark:bg-card shadow text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <Search className="w-4 h-4" />Job Match
                </button>
                <button
                    onClick={() => setActiveTab("ats")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200
            ${activeTab === "ats"
                            ? "bg-white dark:bg-card shadow text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <BarChart2 className="w-4 h-4" />ATS Score
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === "match" ? <JobMatchTab /> : <ATSScoreTab />}
        </div>
    );
};
