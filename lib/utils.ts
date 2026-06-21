import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getTemplateStages } from './data';
import { WORKFLOW_STAGES } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Calculate progress percentage based on current stage
export function calculateProgress(currentStage: string, templateId?: string): number {
  const stages = templateId ? getTemplateStages(templateId) : [];
  const stageNames = stages.length > 0 
    ? stages.map(s => s.name) 
    : WORKFLOW_STAGES;
  
  const index = stageNames.indexOf(currentStage);
  if (index === -1) return 0;
  return ((index + 1) / stageNames.length) * 100;
}

// Get stage index for display purposes
export function getStageIndex(currentStage: string, templateId?: string): number {
  const stages = templateId ? getTemplateStages(templateId) : [];
  const stageNames = stages.length > 0 
    ? stages.map(s => s.name) 
    : WORKFLOW_STAGES;
  
  const index = stageNames.indexOf(currentStage);
  return index === -1 ? 0 : index + 1;
}

// Get total stages count
export function getTotalStages(templateId?: string): number {
  const stages = templateId ? getTemplateStages(templateId) : [];
  return stages.length > 0 ? stages.length : WORKFLOW_STAGES.length;
}
