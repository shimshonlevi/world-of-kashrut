import type { Project, ProjectApprover, ProjectStage } from './types'

export type DbProject = Omit<Project, 'chatHistory' | 'flight' | 'hotel' | 'productionDetails' | 'approvers' | 'stages' | 'enabledTools'> & {
  chatHistory: string
  flight: string
  hotel: string
  productionDetails?: string | null
  approvers?: string | null
  stages?: string
  enabledTools?: string
  templateId?: string | null
}

function toJsonString(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return 'null'
  }
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

// Only these keys are real Project columns. Anything else (performedBy,
// currency, paymentStatus, localContact, reportNotes, …) is dropped so Prisma
// never receives an unknown argument.
const PROJECT_COLUMNS = new Set<string>([
  'responsible', 'projectName', 'importer', 'importerPhone', 'importerEmail',
  'country', 'startDate', 'endDate', 'kosherBody', 'supervisor', 'supervisorPhone',
  'factoryName', 'factoryAddress', 'status', 'currentStage', 'templateId',
  'importerId', 'supervisorId', 'kosherBodyId', 'stages',
  'reportReceived', 'reportPhoto', 'sentToChaim', 'sentToKosherBody', 'certReceived',
  'submittedToRabbinate', 'submittedForPayment', 'paid',
  'actualExpenses', 'quotedPrice',
  'chatHistory', 'flight', 'hotel', 'needsFlightBooking',
  'clientAwaitingResponse', 'productionDetails', 'approvers', 'enabledTools',
])

export function serializeProjectForDb(project: Partial<Project>): Partial<DbProject> {
  const serialized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(project)) {
    if (PROJECT_COLUMNS.has(key)) serialized[key] = value;
  }

  if ('chatHistory' in project) {
    serialized.chatHistory = project.chatHistory ? toJsonString(project.chatHistory) : toJsonString([]);
  }

  if ('flight' in project) {
    serialized.flight = project.flight ? toJsonString(project.flight) : toJsonString({ status: 'not_booked' });
  }

  if ('hotel' in project) {
    serialized.hotel = project.hotel ? toJsonString(project.hotel) : toJsonString({ status: 'not_booked' });
  }

  if ('productionDetails' in project) {
    serialized.productionDetails = project.productionDetails ? toJsonString(project.productionDetails) : undefined;
  }

  if ('approvers' in project) {
    serialized.approvers = project.approvers ? toJsonString(project.approvers) : toJsonString([]);
  }

  if ('stages' in project) {
    serialized.stages = project.stages ? toJsonString(project.stages) : toJsonString([]);
  }

  if ('enabledTools' in project) {
    serialized.enabledTools = project.enabledTools ? toJsonString(project.enabledTools) : toJsonString([]);
  }

  return serialized as Partial<DbProject>;
}

export function deserializeProjectFromDb(dbProject: DbProject): Project {
  return {
    ...dbProject,
    chatHistory: parseJson(dbProject.chatHistory, []),
    flight: parseJson(dbProject.flight, { status: 'not_booked' }),
    hotel: parseJson(dbProject.hotel, { status: 'not_booked' }),
    productionDetails: dbProject.productionDetails ? parseJson(dbProject.productionDetails, {}) : undefined,
    approvers: parseJson(dbProject.approvers, []) as ProjectApprover[] | undefined,
    stages: parseJson(dbProject.stages, []) as ProjectStage[],
    enabledTools: parseJson(dbProject.enabledTools, []),
  } as Project
}

