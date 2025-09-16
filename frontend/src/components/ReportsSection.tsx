import { useState } from "react";
import { BarChart3, TrendingUp, Users, Filter, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SkillAnalytics {
  skill: string;
  coverage: number;
  frequency: number;
  trend: 'up' | 'down' | 'stable';
}

interface CandidateStats {
  totalResumes: number;
  avgMatchScore: number;
  topSkills: SkillAnalytics[];
  scoreDistribution: { range: string; count: number; percentage: number }[];
}

export const ReportsSection = () => {
  const [timeFilter, setTimeFilter] = useState("7d");
  const [jobFilter, setJobFilter] = useState("all");

  const mockStats: CandidateStats = {
    totalResumes: 156,
    avgMatchScore: 73.2,
    topSkills: [
      { skill: "JavaScript", coverage: 89, frequency: 139, trend: 'up' },
      { skill: "Python", coverage: 76, frequency: 118, trend: 'up' },
      { skill: "React", coverage: 68, frequency: 106, trend: 'stable' },
      { skill: "SQL", coverage: 61, frequency: 95, trend: 'down' },
      { skill: "Node.js", coverage: 54, frequency: 84, trend: 'up' },
      { skill: "AWS", coverage: 47, frequency: 73, trend: 'up' },
      { skill: "Git", coverage: 92, frequency: 143, trend: 'stable' },
      { skill: "Docker", coverage: 38, frequency: 59, trend: 'up' },
    ],
    scoreDistribution: [
      { range: "90-100%", count: 12, percentage: 8 },
      { range: "80-89%", count: 28, percentage: 18 },
      { range: "70-79%", count: 47, percentage: 30 },
      { range: "60-69%", count: 41, percentage: 26 },
      { range: "50-59%", count: 20, percentage: 13 },
      { range: "Below 50%", count: 8, percentage: 5 },
    ]
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-destructive rotate-180" />;
      default:
        return <div className="w-4 h-4 bg-muted-foreground rounded-full" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-success';
      case 'down':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-8">
      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Analytics Dashboard</h3>
            <p className="text-sm text-muted-foreground">
              Comprehensive insights into your resume screening data
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-32">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 3 months</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                <SelectItem value="frontend">Frontend Developer</SelectItem>
                <SelectItem value="backend">Backend Developer</SelectItem>
                <SelectItem value="fullstack">Full Stack Developer</SelectItem>
                <SelectItem value="devops">DevOps Engineer</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 text-center">
          <div className="w-12 h-12 bg-gradient-primary rounded-xl mx-auto mb-4 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-foreground mb-1">
            {mockStats.totalResumes.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">Total Resumes</div>
          <div className="flex items-center justify-center mt-2 text-success text-sm">
            <TrendingUp className="w-4 h-4 mr-1" />
            +12% vs last period
          </div>
        </Card>

        <Card className="p-6 text-center">
          <div className="w-12 h-12 bg-gradient-primary rounded-xl mx-auto mb-4 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-foreground mb-1">
            {mockStats.avgMatchScore}%
          </div>
          <div className="text-sm text-muted-foreground">Avg Match Score</div>
          <div className="flex items-center justify-center mt-2 text-success text-sm">
            <TrendingUp className="w-4 h-4 mr-1" />
            +2.3% vs last period
          </div>
        </Card>

        <Card className="p-6 text-center">
          <div className="w-12 h-12 bg-gradient-primary rounded-xl mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-foreground mb-1">
            {mockStats.scoreDistribution[0].count + mockStats.scoreDistribution[1].count}
          </div>
          <div className="text-sm text-muted-foreground">High Scorers (80%+)</div>
          <div className="flex items-center justify-center mt-2 text-success text-sm">
            <TrendingUp className="w-4 h-4 mr-1" />
            +8% vs last period
          </div>
        </Card>
      </div>

      {/* Top Skills Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">
          Skill Coverage Analysis
        </h3>
        
        <div className="space-y-4">
          {mockStats.topSkills.map((skill, index) => (
            <div
              key={skill.skill}
              className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-4 flex-1">
                <div className="text-sm font-medium text-muted-foreground w-6">
                  #{index + 1}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-foreground">{skill.skill}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {skill.frequency} candidates
                    </Badge>
                    {getTrendIcon(skill.trend)}
                  </div>
                  <Progress value={skill.coverage} className="h-2" />
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-semibold text-foreground">
                    {skill.coverage}%
                  </div>
                  <div className="text-xs text-muted-foreground">coverage</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Score Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">
          Match Score Distribution
        </h3>
        
        <div className="space-y-4">
          {mockStats.scoreDistribution.map((range) => (
            <div key={range.range} className="flex items-center space-x-4">
              <div className="w-20 text-sm font-medium text-foreground">
                {range.range}
              </div>
              
              <div className="flex-1">
                <Progress value={range.percentage} className="h-4" />
              </div>
              
              <div className="flex items-center space-x-3 text-sm">
                <span className="text-foreground font-medium w-8 text-right">
                  {range.count}
                </span>
                <span className="text-muted-foreground w-12 text-right">
                  ({range.percentage}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">
          Recent Activity
        </h3>
        
        <div className="space-y-4">
          {[
            { action: "Resume processed", candidate: "John Smith", score: 87, time: "2 minutes ago" },
            { action: "Job matching completed", candidate: "Sarah Johnson", score: 92, time: "15 minutes ago" },
            { action: "Resume uploaded", candidate: "Mike Chen", score: 74, time: "1 hour ago" },
            { action: "Skills extracted", candidate: "Emily Rodriguez", score: 81, time: "2 hours ago" },
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 hover:bg-muted/30 rounded-lg transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {activity.action}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activity.candidate} • Score: {activity.score}%
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                {activity.time}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};