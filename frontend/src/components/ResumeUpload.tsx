import { useState, useCallback } from "react";
import { Upload, FileText, X, CheckCircle, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { extractSkillsFromFile } from "@/lib/api";

interface ResumeFile {
  id: string;
  name: string;
  size: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  extractedSkills?: string[];
  file?: File;
}

export const ResumeUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState<ResumeFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  }, []);

  const processFiles = (files: File[]) => {
    const validFiles = files.filter(file => 
      file.type === 'application/pdf' || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid file format",
        description: "Only PDF and DOCX files are supported",
        variant: "destructive",
      });
    }

    validFiles.forEach(file => {
      const resumeFile: ResumeFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        file,
        status: 'processing',
        progress: 0,
      };

      setUploadedFiles(prev => [...prev, resumeFile]);

      // Upload and request skill extraction
      (async () => {
        try {
          const json = await extractSkillsFromFile(file);
          setUploadedFiles(prev => prev.map(f => f.id === resumeFile.id ? {
            ...f,
            progress: 100,
            status: 'completed',
            extractedSkills: (json.skills || []).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
          } : f));
        } catch (e) {
          setUploadedFiles(prev => prev.map(f => f.id === resumeFile.id ? ({ ...f, status: 'error' }) : f));
        }
      })();
    });

    toast({
      title: "Files uploaded successfully",
      description: `Processing ${validFiles.length} resume(s)...`,
    });
  };

  // ...existing code...

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    toast({
      title: "File removed",
      duration: 2000,
    });
  };

  const downloadFile = (fileId: string) => {
    const f = uploadedFiles.find(f => f.id === fileId);
    if (!f || !f.file) {
      toast({ title: 'File not available for download', variant: 'destructive' });
      return;
    }

    const url = URL.createObjectURL(f.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportAllSkills = () => {
    const data = uploadedFiles.map(f => ({ name: f.name, skills: f.extractedSkills || [] }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted_skills.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const getStatusIcon = (status: ResumeFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <FileText className="w-5 h-5 text-primary" />;
    }
  };

  const getStatusColor = (status: ResumeFile['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success border-success/20';
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'processing':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Area */}
      <Card className="p-8">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
            ${isDragging 
              ? 'border-primary bg-primary/5 scale-102' 
              : 'border-border hover:border-primary/50 hover:bg-primary/5'
            }
          `}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300
              ${isDragging ? 'bg-primary text-white animate-pulse-glow' : 'bg-primary/10 text-primary'}
            `}>
              <Upload className="w-8 h-8" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Drop your resumes here
              </h3>
              <p className="text-muted-foreground mb-4">
                Support for PDF and DOCX files up to 10MB each
              </p>
              
              <input
                type="file"
                multiple
                accept=".pdf,.docx"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              
              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                variant="outline"
                className="border-primary/20 hover:border-primary/40 hover:bg-primary/5"
              >
                Browse Files
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              Uploaded Resumes ({uploadedFiles.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="text-primary hover:bg-primary/5"
              onClick={exportAllSkills}
            >
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
          </div>

          <div className="space-y-4">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:shadow-soft transition-all duration-200"
              >
                <div className="flex items-center space-x-4 flex-1">
                  {getStatusIcon(file.status)}
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-foreground">{file.name}</h4>
                      <span className="text-sm text-muted-foreground">{file.size}</span>
                      <Badge className={getStatusColor(file.status)}>
                        {file.status}
                      </Badge>
                    </div>
                    
                    {file.status === 'processing' && (
                      <Progress value={file.progress} className="h-2" />
                    )}
                    
                    {file.extractedSkills && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {file.extractedSkills.slice(0, 6).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {file.extractedSkills.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{file.extractedSkills.length - 6} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadFile(file.id)}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};