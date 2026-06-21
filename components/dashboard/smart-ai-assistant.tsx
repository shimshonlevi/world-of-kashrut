'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  X,
  Zap,
  MessageSquare,
} from 'lucide-react';

interface SmartAIAssistantProps {
  projects: Project[];
  selectedProject: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

interface AIInsight {
  id: string;
  type: 'urgent' | 'tip' | 'warning' | 'success';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function SmartAIAssistant({
  projects,
  selectedProject,
  isOpen,
  onClose,
}: SmartAIAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Generate insights based on projects
  const generateInsights = (): AIInsight[] => {
    const insights: AIInsight[] = [];

    // Urgent tasks
    const urgentProjects = projects.filter(p => p.daysDelayed && p.daysDelayed > 3);
    if (urgentProjects.length > 0) {
      insights.push({
        id: 'urgent-delays',
        type: 'urgent',
        title: `${urgentProjects.length} תיקים בעיכוב משמעותי`,
        description: `התיקים ${urgentProjects.slice(0, 2).map(p => p.projectName).join(', ')} מצריכים טיפול מיידי`,
        action: {
          label: 'צפה בתיקים',
          onClick: () => {},
        },
      });
    }

    // Clients awaiting response
    const awaitingResponse = projects.filter(p => p.clientAwaitingResponse);
    if (awaitingResponse.length > 0) {
      insights.push({
        id: 'awaiting-response',
        type: 'warning',
        title: `${awaitingResponse.length} יבואנים ממתינים למענה`,
        description: 'מומלץ לחזור אליהם תוך 24 שעות לשמירה על שביעות רצון',
      });
    }

    // Missing reports
    const missingReports = projects.filter(p => !p.reportReceived && p.status !== 'הסתיים');
    if (missingReports.length > 0) {
      insights.push({
        id: 'missing-reports',
        type: 'tip',
        title: `${missingReports.length} דוחות משגיח חסרים`,
        description: 'שלח תזכורת למשגיחים להגשת הדוחות',
      });
    }

    // Positive insight
    const completedThisWeek = projects.filter(p => p.status === 'הסתיים').length;
    if (completedThisWeek > 0) {
      insights.push({
        id: 'completed',
        type: 'success',
        title: `${completedThisWeek} תיקים הושלמו`,
        description: 'עבודה מצוינת! התיקים הושלמו בהצלחה',
      });
    }

    // Daily tip
    const tips = [
      'טיפ: מומלץ להתחיל את היום בטיפול בתיקים הדחופים ביותר',
      'טיפ: שליחת עדכון שבועי ליבואנים משפרת את שביעות הרצון',
      'טיפ: תיעוד כל שיחה בתיק עוזר לשמור על רצף עבודה',
    ];
    insights.push({
      id: 'daily-tip',
      type: 'tip',
      title: tips[new Date().getDay() % tips.length],
      description: '',
    });

    return insights;
  };

  const insights = generateInsights();

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'tip':
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getInsightBg = (type: AIInsight['type']) => {
    switch (type) {
      case 'urgent':
        return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900';
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900';
      case 'tip':
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900';
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="fixed bottom-4 left-4 w-80 shadow-xl border-primary/20 z-50 overflow-hidden">
      {/* Header */}
      <CardHeader className="py-3 px-4 bg-gradient-to-l from-primary/10 to-transparent border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold">עוזר חכם</CardTitle>
            <Badge variant="secondary" className="text-[10px] h-5">AI</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0">
          {/* Selected Project Context */}
          {selectedProject && (
            <div className="p-3 bg-muted/50 border-b">
              <p className="text-xs text-muted-foreground mb-1">תיק נבחר:</p>
              <p className="text-sm font-medium">{selectedProject.projectName}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[10px]">
                  {selectedProject.status}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {selectedProject.currentStage}
                </Badge>
              </div>
            </div>
          )}

          {/* Insights */}
          <ScrollArea className="h-64">
            <div className="p-3 space-y-2">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-3 rounded-lg border ${getInsightBg(insight.type)}`}
                >
                  <div className="flex items-start gap-2">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{insight.title}</p>
                      {insight.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {insight.description}
                        </p>
                      )}
                      {insight.action && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 mt-1 text-xs"
                          onClick={insight.action.onClick}
                        >
                          {insight.action.label}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <div className="p-3 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">פעולות מהירות:</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5">
                <Zap className="h-3 w-3" />
                טיפול בדחופים
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5">
                <MessageSquare className="h-3 w-3" />
                שלח תזכורות
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
