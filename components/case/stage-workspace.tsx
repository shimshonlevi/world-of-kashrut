'use client';

import type { ProjectStage, ProjectRequirement } from '@/lib/types';
import { stageProgress, isStageComplete } from '@/lib/templates';
import { RequirementItem } from './requirement-item';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StageWorkspaceProps {
  stage: ProjectStage;
  onRequirementUpdate: (reqId: string, patch: Partial<ProjectRequirement>) => void;
  onUploadDocument: (reqId: string, file: File) => Promise<void> | void;
  onCompleteStage: () => void;
  busy?: boolean;
}

export function StageWorkspace({
  stage,
  onRequirementUpdate,
  onUploadDocument,
  onCompleteStage,
  busy,
}: StageWorkspaceProps) {
  const progress = stageProgress(stage);
  const complete = isStageComplete(stage);
  const remaining = stage.requirements.filter((r) => r.required && r.status !== 'approved' && r.status !== 'done').length;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold">{stage.name}</h2>
          {stage.status === 'completed' && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              שלב הושלם
            </Badge>
          )}
          {stage.estimatedDays != null && (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              ~{stage.estimatedDays} ימים
            </Badge>
          )}
        </div>
        {stage.description && <p className="text-sm text-muted-foreground mt-1">{stage.description}</p>}

        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full transition-all', complete ? 'bg-emerald-500' : 'bg-primary')}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium tabular-nums">{progress}%</span>
        </div>
        {remaining > 0 && (
          <p className="text-xs text-muted-foreground mt-1">{remaining} דרישות חובה פתוחות</p>
        )}
      </div>

      <div className="space-y-3">
        {stage.requirements.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg border-dashed">
            אין דרישות מוגדרות לשלב זה.
          </p>
        ) : (
          stage.requirements.map((req) => (
            <RequirementItem
              key={req.id}
              requirement={req}
              busy={busy}
              onUpdate={(patch) => onRequirementUpdate(req.id, patch)}
              onUploadDocument={(file) => onUploadDocument(req.id, file)}
            />
          ))
        )}
      </div>

      {stage.status !== 'completed' && (
        <div className="flex items-center gap-3 border-t pt-4">
          <Button onClick={onCompleteStage} disabled={busy || !complete} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            סמן שלב כהושלם ועבור לשלב הבא
          </Button>
          {!complete && <span className="text-xs text-muted-foreground">השלם את כל דרישות החובה כדי לסגור את השלב</span>}
        </div>
      )}
    </div>
  );
}
