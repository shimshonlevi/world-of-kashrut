export type ProjectStatus = 'בתהליך' | 'הוגש' | 'הסתיים';
export type ResponsiblePerson = 'נחמה' | 'שירה';

// Workflow stages for the progress stepper
export type WorkflowStage = 'פתיחה' | 'מסמכים' | 'לוגיסטיקה' | 'ייצור' | 'אישור';

export const WORKFLOW_STAGES: WorkflowStage[] = ['פתיחה', 'מסמכים', 'לוגיסטיקה', 'ייצור', 'אישור'];

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'milestone' | 'note' | 'communication' | 'document' | 'custom';
  completed: boolean;
}

export interface Document {
  id: string;
  name: string;
  type: 'lab_results' | 'ingredients' | 'certificate' | 'contract' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  uploadDate: string;
  thumbnailUrl?: string;
  fileUrl?: string;
}

// The central document index row (metadata; bytes live in object storage).
export interface StoredDocument {
  id: string;
  projectId: string;
  requirementId?: string | null;
  fileName: string;
  originalName: string;
  mimeType?: string | null;
  size?: number | null;
  category?: string | null;
  url: string;
  storage: string;
  uploadedBy?: string | null;
  createdAt: string;
}

export const DOCUMENT_CATEGORIES: { value: string; label: string }[] = [
  { value: 'report', label: 'דו״ח משגיח' },
  { value: 'certificate', label: 'תעודה' },
  { value: 'invoice', label: 'חשבונית' },
  { value: 'contract', label: 'חוזה' },
  { value: 'photo', label: 'תמונה' },
  { value: 'other', label: 'אחר' },
];

export interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
  isInternal: boolean;
  direction?: 'out' | 'in'; // out = we sent it, in = a reply we received
  via?: 'whatsapp' | 'email' | 'manual';
  requirementId?: string; // ties a request/reply to the requirement it concerns
}

export interface FlightInfo {
  flightNumber?: string;
  departureDate?: string;
  arrivalDate?: string;
  airline?: string;
  status: 'not_booked' | 'pending' | 'confirmed';
}

export interface HotelInfo {
  hotelName?: string;
  checkIn?: string;
  checkOut?: string;
  status: 'not_booked' | 'pending' | 'confirmed';
}

export interface ProjectApprover {
  userId: string;
  approverName: string;
  stage: WorkflowStage;
  status: 'pending' | 'approved' | 'rejected';
  approvalDate?: string;
  rejectionReason?: string;
}

export interface Project {
  id: string;
  responsible: ResponsiblePerson;
  projectName: string;
  importer: string;
  importerPhone?: string;
  importerEmail?: string;
  country: string;
  startDate: string;
  endDate: string;
  kosherBody: string;
  supervisor: string;
  supervisorPhone?: string;
  factoryName: string;
  factoryAddress: string;
  status: ProjectStatus;
  currentStage: string;
  templateId?: string;
  // Snapshot of the template's stages + per-requirement progress.
  // Single source of truth for the case side-menu and progress stepper.
  stages?: ProjectStage[];
  enabledTools?: ToolKey[]; // optional tools active for this case (from its template)
  reportReceived: boolean;
  reportPhoto?: string;
  sentToChaim: boolean;
  // Kosher-certification pipeline milestones (mirror the office Excel).
  sentToKosherBody?: boolean;
  certReceived?: boolean;
  submittedToRabbinate?: boolean;
  submittedForPayment?: boolean;
  paid: boolean;
  profitDaily: number;
  kosherFee: number;
  submissionFee: number;
  actualExpenses?: number;
  quotedPrice?: number;
  driveLink: string;
  daysDelayed?: number;
  timeline: TimelineEvent[];
  documents: Document[];
  chatHistory: ChatMessage[];
  flight: FlightInfo;
  hotel: HotelInfo;
  approvers?: ProjectApprover[];
  productionDetails?: {
    productionHoursPerDay: number;
    expectedQuantityTons: number;
    kosherCategory: string;
    factoryName: string;
    localContact: string;
    localContactPhone: string;
  };
  needsFlightBooking: boolean;
  clientAwaitingResponse: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  totalProfit: number;
  pendingReports: number;
  projectsInProgress: number;
  monthlyGrowth: number;
  totalProjects: number;
  completedProjects: number;
  urgentTasks: number;
  needsFlightBooking: number;
  clientsAwaitingResponse: number;
}

export interface FilterState {
  responsible: ResponsiblePerson | 'all';
  status: ProjectStatus | 'all';
  searchQuery: string;
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'secretary';
  avatar: string;
}

// First-class CRM entities (replace free-text importer/supervisor names)
export interface Importer {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  country?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Supervisor {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  kosherBodies?: string; // comma-separated bodies they work with
  regions?: string; // comma-separated areas/countries willing to travel to
  availability?: string; // free-text schedule / לו״ז
  active?: boolean; // currently taking assignments
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Template System — single source of truth for what a case requires
// ============================================================================

// A requirement is one concrete thing the office worker must DO in a stage.
export type RequirementType =
  | 'document' // upload / collect a file
  | 'question' // answer a Q&A prompt
  | 'field' // fill a typed data field
  | 'task' // a checkbox / action to complete
  | 'approval'; // a sign-off by an approver

// How a 'field' / 'question' answer is captured & rendered.
export type FieldDataType = 'text' | 'longtext' | 'number' | 'date' | 'select' | 'boolean';

// A stage step can be BOUND to a core project field, so completing the step and
// the dashboard flag stay in sync (single source of truth).
export type CoreBindKey =
  | 'reportReceived'
  | 'sentToChaim'
  | 'sentToKosherBody'
  | 'certReceived'
  | 'submittedToRabbinate'
  | 'submittedForPayment'
  | 'paid';

// Who is responsible for providing a requirement (drives "request from…" actions).
export type RequirementSource = 'office' | 'supervisor' | 'importer' | 'factory';

// Optional, per-template case tools (always-on: overview, opening, requirements, chat, history).
export type ToolKey = 'supervision' | 'production' | 'approvals';

export interface TemplateRequirement {
  id: string;
  type: RequirementType;
  label: string; // what is asked of the worker
  description?: string; // optional helper text / instructions
  required: boolean;
  // For 'field' and 'question':
  dataType?: FieldDataType;
  options?: string[]; // choices when dataType === 'select'
  // For 'document':
  acceptedFormats?: string[]; // e.g. ['pdf', 'jpg']
  // For 'approval':
  approverRole?: string; // who needs to approve (free text / role)
  approverName?: string; // the specific user assigned to approve (set at case time)
  sentForApprovalAt?: string; // when it was sent to the approver
  // Who provides this item (drives "request from…" actions).
  source?: RequirementSource;
  // Sync: when set, this step mirrors a core boolean field on the project.
  bindKey?: CoreBindKey;
}

export interface TemplateStage {
  id: string;
  name: string;
  description: string;
  order: number;
  estimatedDays?: number;
  requirements: TemplateRequirement[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // tailwind color classes for the card
  category?: string; // חלבי / בשרי / פרווה ...
  stages: TemplateStage[];
  enabledTools?: ToolKey[]; // optional tools active for cases from this template
  isDefault: boolean;
  isArchived?: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Project instances — a snapshot of a template's stages + live progress.
// This is the single source of truth for the case side-menu and progress.
// ============================================================================

export type RequirementStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'done';

export type StageStatus = 'pending' | 'active' | 'completed';

export interface ProjectRequirement extends TemplateRequirement {
  status: RequirementStatus;
  value?: string; // captured answer / field value
  documentId?: string; // link to an uploaded Document, for type === 'document'
  note?: string; // worker / approver note (e.g. rejection reason)
  updatedAt?: string;
  updatedBy?: string;
}

export interface ProjectStage {
  id: string;
  name: string;
  description: string;
  order: number;
  estimatedDays?: number;
  status: StageStatus;
  requirements: ProjectRequirement[];
  completedAt?: string;
}
