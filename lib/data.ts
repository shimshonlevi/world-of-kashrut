import { Project, DashboardStats, TimelineEvent, Document, ChatMessage, FlightInfo, HotelInfo, WorkflowStage, WorkflowTemplate, TemplateStage, TemplateRequirement, FieldDataType, CoreBindKey, RequirementSource } from './types';

// Helper: Get template by ID
export function getTemplateById(templateId?: string): WorkflowTemplate | undefined {
  if (!templateId) return undefined;
  return defaultTemplates.find(t => t.id === templateId);
}

// Helper: Get stages from template
export function getTemplateStages(templateId?: string): TemplateStage[] {
  const template = getTemplateById(templateId);
  if (!template) return [];
  return template.stages;
}

// Helper: Get stage names as array (for compatibility with WORKFLOW_STAGES usage)
export function getStageNames(templateId?: string): string[] {
  const stages = getTemplateStages(templateId);
  return stages.map(s => s.name);
}

// ---- Requirement builders (keep template definitions compact & readable) ----
let reqCounter = 0;
const rid = () => `r${(++reqCounter).toString(36)}`;

const doc = (label: string, required = true, acceptedFormats = ['pdf', 'jpg', 'png'], bindKey?: CoreBindKey, source?: RequirementSource): TemplateRequirement =>
  ({ id: rid(), type: 'document', label, required, acceptedFormats, bindKey, source });
const field = (label: string, dataType: FieldDataType, required = true, options?: string[]): TemplateRequirement =>
  ({ id: rid(), type: 'field', label, required, dataType, options });
const question = (label: string, required = true): TemplateRequirement =>
  ({ id: rid(), type: 'question', label, required, dataType: 'longtext' });
const task = (label: string, required = true, bindKey?: CoreBindKey): TemplateRequirement =>
  ({ id: rid(), type: 'task', label, required, bindKey });
const approval = (label: string, approverRole: string): TemplateRequirement =>
  ({ id: rid(), type: 'approval', label, required: true, approverRole });

const stage = (
  id: string,
  name: string,
  description: string,
  order: number,
  estimatedDays: number,
  requirements: TemplateRequirement[]
): TemplateStage => ({ id, name, description, order, estimatedDays, requirements });

// Shared opening / approval stages reused across templates.
const openingStage = () =>
  stage('s1', 'פתיחת תיק', 'קבלת פרטי היבואן ופתיחת תיק במערכת', 1, 1, [
    // Factory contact lives in "פרטי התיק" — not restated as a checklist item.
    doc('חוזה התקשרות חתום'),
    task('נפתח תיק מסמכים לפרויקט'),
  ]);

const logisticsStage = (order: number) =>
  stage(`s${order}`, 'תיאום לוגיסטי', 'תיאום טיסות ומלון למשגיח', order, 5, [
    field('תאריך יציאת המשגיח', 'date'),
    field('תאריך חזרה', 'date'),
    task('הוזמנה טיסה'),
    task('הוזמן מלון'),
    question('האם נדרשת ויזה/אישור כניסה למדינה?'),
  ]);

const finalApprovalStage = (order: number, extraDocs: TemplateRequirement[] = []) =>
  stage(`s${order}`, 'אישור סופי', 'בדיקת הדוחות והנפקת תעודת כשרות', order, 2, [
    doc('דוח משגיח'),
    ...extraDocs,
    approval('אישור מנהל להנפקת תעודה', 'מנהל'),
    task('תעודת הכשרות הונפקה ונשלחה ליבואן'),
  ]);

// Default Workflow Templates
export const defaultTemplates: WorkflowTemplate[] = [
  {
    id: 'tpl-wok',
    name: 'תהליך כשרות מלא (WK)',
    description: 'תהליך העבודה המלא של המשרד — מפתיחת התיק ועד התשלום, לפי שלבי הסליפ',
    icon: 'FileText',
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    category: 'כללי',
    stages: [
      // Reference facts (kosher body, supervisor, factory, price) live in the
      // case's "פרטי התיק" — the checklist only tracks work that progresses.
      stage('p1', 'פתיחת תיק וחיוב', 'קליטת היבואן, גוף הכשרות, המשגיח והחיוב', 1, 1, [
        task('הצעת מחיר נשלחה ללקוח', false),
      ]),
      stage('p2', 'דו״ח ייצור מהמשגיח', 'קבלת דוח הייצור מהמשגיח', 2, 3, [
        doc('דו״ח ייצור מהמשגיח', true, ['pdf', 'jpg', 'png'], 'reportReceived', 'supervisor'),
        field('תאריך קבלת הדוח', 'date', false),
      ]),
      stage('p3', 'בדיקת חיים', 'העברת הדוח לחיים לבדיקה ואישור', 3, 2, [
        task('נשלח לחיים לבדיקה', true, 'sentToChaim'),
        field('תאריך שליחה', 'date', false),
      ]),
      stage('p4', 'הגשה לגוף הכשרות', 'העברת דו״ח + תווית לגוף הכשרות', 4, 2, [
        task('הועבר דו״ח + תווית לגוף הכשרות', true, 'sentToKosherBody'),
        field('תאריך העברה', 'date', false),
      ]),
      stage('p5', 'קבלת תעודת כשרות', 'קבלת התעודה מגוף הכשרות', 5, 5, [
        doc('תעודת כשרות מגוף הכשרות', true, ['pdf', 'jpg', 'png'], 'certReceived'),
        field('תאריך קבלת התעודה', 'date', false),
      ]),
      stage('p6', 'הגשה לרבנות', 'הגשת התעודה לרבנות וקבלת אסמכתא', 6, 3, [
        task('הוגש לרבנות', true, 'submittedToRabbinate'),
        field('מספר אסמכתא', 'text', false),
      ]),
      stage('p7', 'תשלום', 'הגשה לתשלום וקבלת התשלום', 7, 7, [
        task('הוגש לתשלום', false, 'submittedForPayment'),
        field('תאריך הגשה לתשלום', 'date', false),
        task('התקבל תשלום', false, 'paid'),
        field('תאריך תשלום', 'date', false),
        approval('אישור מנהל לסגירת התיק', 'מנהל'),
      ]),
    ],
    enabledTools: ['supervision', 'production', 'approvals'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isDefault: true,
    usageCount: 0,
  },
  {
    id: 'tpl-dairy',
    name: 'חלבי',
    description: 'תהליך הסמכה למוצרי חלב - כולל בדיקת ציוד ומרכיבים',
    icon: 'Milk',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    category: 'חלבי',
    stages: [
      openingStage(),
      stage('s2', 'בדיקת מרכיבים', 'בדיקת רשימת המרכיבים ואישורם', 2, 3, [
        doc('רשימת מרכיבים מלאה'),
        doc('תעודות כשרות של הספקים'),
        question('האם כל המרכיבים מאושרים על ידי גוף הכשרות?'),
      ]),
      stage('s3', 'בדיקת ציוד', 'בדיקת הכשרת הציוד והכלים', 3, 2, [
        question('האם הציוד משמש גם לייצור לא-כשר?'),
        task('בוצעה הגעלה/הכשרה לציוד'),
        doc('תרשים קווי ייצור', false),
      ]),
      stage('s4', 'ייצור ופיקוח', 'נוכחות משגיח בזמן הייצור', 4, 5, [
        field('כמות צפויה (טון)', 'number'),
        field('שעות ייצור ביום', 'number'),
        task('המשגיח נכח לאורך כל הייצור'),
      ]),
      finalApprovalStage(5, [doc('תוצאות מעבדה')]),
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isDefault: true,
    usageCount: 45,
  },
  {
    id: 'tpl-meat',
    name: 'בשרי',
    description: 'תהליך הסמכה למוצרי בשר - כולל בדיקת שחיטה וניקור',
    icon: 'Beef',
    color: 'bg-red-50 border-red-200 text-red-700',
    category: 'בשרי',
    stages: [
      openingStage(),
      stage('s2', 'בדיקת שחיטה', 'אישור תהליך השחיטה והשוחט', 2, 3, [
        doc('אישור שוחט'),
        doc('תעודת בית מטבחיים'),
        field('שם השוחט', 'text'),
      ]),
      stage('s3', 'בדיקת ניקור', 'בדיקת תהליך הניקור וההכשרה', 3, 2, [
        task('אומת תהליך ניקור תקין'),
        question('מי המנקר האחראי ומה הסמכתו?'),
      ]),
      stage('s4', 'עיבוד ואריזה', 'פיקוח על תהליך העיבוד והאריזה', 4, 4, [
        task('פיקוח על העיבוד הושלם'),
        task('סימון האריזות אומת'),
      ]),
      finalApprovalStage(5, [doc('אישור וטרינר')]),
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isDefault: true,
    usageCount: 32,
  },
  {
    id: 'tpl-parve',
    name: 'פרווה',
    description: 'תהליך הסמכה למוצרים פרווה - תהליך סטנדרטי',
    icon: 'Cookie',
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    category: 'פרווה',
    stages: [
      openingStage(),
      stage('s2', 'איסוף מסמכים', 'קבלת כל המסמכים הנדרשים', 2, 3, [
        doc('רשימת מרכיבים'),
        doc('תעודות ספקים'),
        doc('תרשים מפעל'),
      ]),
      logisticsStage(3),
      stage('s4', 'ייצור ופיקוח', 'נוכחות משגיח בזמן הייצור', 4, 5, [
        task('המשגיח נכח בייצור'),
        field('כמות צפויה (טון)', 'number'),
      ]),
      finalApprovalStage(5),
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isDefault: true,
    usageCount: 78,
  },
  {
    id: 'tpl-wine',
    name: 'יין',
    description: 'תהליך הסמכה ליין - כולל בדיקת כרם ויקב',
    icon: 'Wine',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    category: 'יין',
    stages: [
      openingStage(),
      stage('s2', 'בדיקת כרם', 'בדיקת הכרם ותנאי הגידול', 2, 2, [
        question('מהו גיל הכרם והאם חלה עליו ערלה?'),
        task('אומת מקור הענבים'),
      ]),
      stage('s3', 'בדיקת יקב', 'בדיקת היקב והציוד', 3, 3, [
        doc('תרשים יקב'),
        doc('רשימת ציוד'),
      ]),
      stage('s4', 'פיקוח בציר', 'נוכחות משגיח בזמן הבציר והייצור', 4, 7, [
        task('המשגיח נכח בבציר ובייצור'),
        field('תאריך בציר', 'date'),
      ]),
      finalApprovalStage(5, [doc('תוצאות מעבדה')]),
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isDefault: true,
    usageCount: 23,
  },
  {
    id: 'tpl-fish',
    name: 'דגים',
    description: 'תהליך הסמכה לדגים - כולל בדיקת סוג וסנפירים',
    icon: 'Fish',
    color: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    category: 'דגים',
    stages: [
      openingStage(),
      stage('s2', 'בדיקת סוג', 'זיהוי סוג הדג ואישור כשרותו', 2, 2, [
        doc('מפרט מוצר'),
        doc('תמונות הדג (סנפיר וקשקשת)'),
        field('שם הדג (מדעי)', 'text'),
      ]),
      stage('s3', 'בדיקת עיבוד', 'בדיקת תהליך העיבוד והניקוי', 3, 3, [
        task('אומת ניקיון קו העיבוד'),
      ]),
      stage('s4', 'פיקוח אריזה', 'פיקוח על תהליך האריזה', 4, 3, [
        task('פיקוח אריזה הושלם'),
      ]),
      finalApprovalStage(5),
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isDefault: true,
    usageCount: 18,
  },
  {
    id: 'tpl-vegetables',
    name: 'ירקות',
    description: 'תהליך הסמכה לירקות - כולל בדיקת תולעים',
    icon: 'Leaf',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    category: 'ירקות',
    stages: [
      openingStage(),
      stage('s2', 'בדיקת תולעים', 'בדיקת נגיעות ותולעים', 2, 3, [
        doc('דוח חקלאי'),
        doc('תוצאות בדיקת נגיעות'),
        field('אחוז נגיעות שנמצא', 'number'),
      ]),
      stage('s3', 'בדיקת שטיפה', 'בדיקת תהליך השטיפה והניקוי', 3, 2, [
        task('אומת תהליך שטיפה תקני'),
      ]),
      stage('s4', 'פיקוח אריזה', 'פיקוח על תהליך האריזה', 4, 2, [
        task('פיקוח אריזה הושלם'),
      ]),
      finalApprovalStage(5),
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    isDefault: true,
    usageCount: 34,
  },
];

const createTimeline = (stage: WorkflowStage): TimelineEvent[] => {
  const stages: Record<WorkflowStage, TimelineEvent[]> = {
    'פתיחה': [
      { id: '1', date: '2024-01-15', title: 'פתיחת תיק', description: 'התיק נפתח במערכת', type: 'milestone', completed: true },
    ],
    'מסמכים': [
      { id: '1', date: '2024-01-15', title: 'פתיחת תיק', description: 'התיק נפתח במערכת', type: 'milestone', completed: true },
      { id: '2', date: '2024-01-18', title: 'קבלת מסמכים', description: 'התקבלו מסמכי היבואן', type: 'document', completed: true },
    ],
    'לוגיסטיקה': [
      { id: '1', date: '2024-01-15', title: 'פתיחת תיק', description: 'התיק נפתח במערכת', type: 'milestone', completed: true },
      { id: '2', date: '2024-01-18', title: 'קבלת מסמכים', description: 'התקבלו מסמכי היבואן', type: 'document', completed: true },
      { id: '3', date: '2024-01-22', title: 'תיאום לוגיסטי', description: 'תיאום טיסות ומלון', type: 'milestone', completed: false },
    ],
    'ייצור': [
      { id: '1', date: '2024-01-15', title: 'פתיחת תיק', description: 'התיק נפתח במערכת', type: 'milestone', completed: true },
      { id: '2', date: '2024-01-18', title: 'קבלת מסמכים', description: 'התקבלו מסמכי היבואן', type: 'document', completed: true },
      { id: '3', date: '2024-01-22', title: 'תיאום לוגיסטי', description: 'תיאום טיסות ומלון', type: 'milestone', completed: true },
      { id: '4', date: '2024-02-01', title: 'פיקוח בייצור', description: 'המשגיח נמצא במפעל', type: 'milestone', completed: false },
    ],
    'אישור': [
      { id: '1', date: '2024-01-15', title: 'פתיחת תיק', description: 'התיק נפתח במערכת', type: 'milestone', completed: true },
      { id: '2', date: '2024-01-18', title: 'קבלת מסמכים', description: 'התקבלו מסמכי היבואן', type: 'document', completed: true },
      { id: '3', date: '2024-01-22', title: 'תיאום לוגיסטי', description: 'תיאום טיסות ומלון', type: 'milestone', completed: true },
      { id: '4', date: '2024-02-01', title: 'פיקוח בייצור', description: 'המשגיח נמצא במפעל', type: 'milestone', completed: true },
      { id: '5', date: '2024-02-15', title: 'אישור סופי', description: 'התעודה אושרה', type: 'milestone', completed: true },
    ],
  };
  return stages[stage];
};

const createDocuments = (hasAllDocs: boolean): Document[] => {
  return [
    { id: 'd1', name: 'תוצאות מעבדה', type: 'lab_results', status: hasAllDocs ? 'approved' : 'pending', uploadDate: '2024-01-20' },
    { id: 'd2', name: 'רשימת רכיבים', type: 'ingredients', status: hasAllDocs ? 'approved' : 'pending', uploadDate: '2024-01-18' },
    { id: 'd3', name: 'חוזה התקשרות', type: 'contract', status: 'approved', uploadDate: '2024-01-15' },
  ];
};

const createChatHistory = (): ChatMessage[] => [
  { id: 'c1', sender: 'נחמה', message: 'שלום, האם קיבלת את המסמכים?', timestamp: '2024-01-20 09:30', isInternal: true },
  { id: 'c2', sender: 'שירה', message: 'כן, הכל התקבל. מעביר לבדיקה', timestamp: '2024-01-20 09:45', isInternal: true },
  { id: 'c3', sender: 'יבואן', message: 'בוקר טוב, מה הסטטוס של התעודה?', timestamp: '2024-01-21 08:00', isInternal: false },
  { id: 'c4', sender: 'נחמה', message: 'שלום, אנחנו בשלב הבדיקה. נעדכן בקרוב', timestamp: '2024-01-21 10:30', isInternal: false },
];

export const mockProjects: Project[] = [
  {
    id: 'PRJ-001',
    responsible: 'נחמה',
    projectName: 'תעודת כשרות מפעל שוקולד',
    importer: 'חברת מתוקים בע"מ',
    importerPhone: '+972-50-1234567',
    importerEmail: 'info@metukim.co.il',
    country: 'בלגיה',
    startDate: '2024-01-15',
    endDate: '2024-02-28',
    kosherBody: 'OU',
    supervisor: 'הרב משה כהן',
    supervisorPhone: '+32-478-123456',
    factoryName: 'Belgian Chocolate Factory',
    factoryAddress: 'Brussels, Belgium',
    status: 'בתהליך',
    currentStage: 'לוגיסטיקה',
    reportReceived: false,
    sentToChaim: false,
    paid: false,
    profitDaily: 850,
    kosherFee: 2500,
    submissionFee: 500,
    quotedPrice: 4500,
    actualExpenses: 3200,
    daysDelayed: 4,
    timeline: createTimeline('לוגיסטיקה'),
    chatHistory: createChatHistory(),
    flight: { status: 'not_booked' },
    hotel: { status: 'not_booked' },
    needsFlightBooking: true,
    clientAwaitingResponse: true,
  },
  {
    id: 'PRJ-002',
    responsible: 'שירה',
    projectName: 'אישור כשרות מוצרי חלב',
    importer: 'מחלבות הצפון',
    importerPhone: '+972-52-9876543',
    importerEmail: 'dairy@north.co.il',
    country: 'צרפת',
    startDate: '2024-01-20',
    endDate: '2024-03-15',
    kosherBody: 'OK',
    supervisor: 'הרב דוד לוי',
    supervisorPhone: '+33-612-345678',
    factoryName: 'French Dairy Co.',
    factoryAddress: 'Lyon, France',
    status: 'הוגש',
    currentStage: 'אישור',
    reportReceived: true,
    reportPhoto: '/reports/prj002.jpg',
    sentToChaim: true,
    paid: true,
    profitDaily: 1200,
    kosherFee: 3500,
    submissionFee: 750,
    quotedPrice: 6000,
    actualExpenses: 5200,
    timeline: createTimeline('אישור'),
    chatHistory: createChatHistory(),
    flight: { flightNumber: 'AF1234', departureDate: '2024-02-01', arrivalDate: '2024-02-05', airline: 'Air France', status: 'confirmed' },
    hotel: { hotelName: 'Hotel Lyon', checkIn: '2024-02-01', checkOut: '2024-02-05', status: 'confirmed' },
    needsFlightBooking: false,
    clientAwaitingResponse: false,
  },
  {
    id: 'PRJ-003',
    responsible: 'נחמה',
    projectName: 'בדיקת כשרות מפעל תבלינים',
    importer: 'טעמים מהמזרח',
    importerPhone: '+972-54-1112223',
    importerEmail: 'spices@east.co.il',
    country: 'סין',
    startDate: '2024-02-01',
    endDate: '2024-04-30',
    kosherBody: 'Star-K',
    supervisor: 'הרב יעקב שטיין',
    supervisorPhone: '+86-138-12345678',
    factoryName: 'Oriental Spices Ltd.',
    factoryAddress: 'Shanghai, China',
    status: 'בתהליך',
    currentStage: 'מסמכים',
    reportReceived: false,
    sentToChaim: false,
    paid: false,
    profitDaily: 950,
    kosherFee: 4000,
    submissionFee: 600,
    quotedPrice: 6500,
    actualExpenses: 0,
    daysDelayed: 7,
    timeline: createTimeline('מסמכים'),
    chatHistory: createChatHistory(),
    flight: { status: 'not_booked' },
    hotel: { status: 'not_booked' },
    needsFlightBooking: true,
    clientAwaitingResponse: true,
  },
  {
    id: 'PRJ-004',
    responsible: 'שירה',
    projectName: 'הסמכת כשרות מאפייה',
    importer: 'לחם הארץ',
    importerPhone: '+972-53-4445556',
    importerEmail: 'bread@land.co.il',
    country: 'איטליה',
    startDate: '2024-01-10',
    endDate: '2024-02-15',
    kosherBody: 'OU',
    supervisor: 'הרב אברהם רוזן',
    supervisorPhone: '+39-347-1234567',
    factoryName: 'Italian Bakery Roma',
    factoryAddress: 'Rome, Italy',
    status: 'הסתיים',
    currentStage: 'אישור',
    reportReceived: true,
    reportPhoto: '/reports/prj004.jpg',
    sentToChaim: true,
    paid: true,
    profitDaily: 750,
    kosherFee: 2000,
    submissionFee: 400,
    quotedPrice: 3500,
    actualExpenses: 3100,
    timeline: createTimeline('אישור'),
    chatHistory: createChatHistory(),
    flight: { flightNumber: 'AZ789', departureDate: '2024-01-20', arrivalDate: '2024-01-25', airline: 'Alitalia', status: 'confirmed' },
    hotel: { hotelName: 'Hotel Roma', checkIn: '2024-01-20', checkOut: '2024-01-25', status: 'confirmed' },
    needsFlightBooking: false,
    clientAwaitingResponse: false,
  },
  {
    id: 'PRJ-005',
    responsible: 'נחמה',
    projectName: 'פיקוח כשרות יין',
    importer: 'יקבי הגליל',
    importerPhone: '+972-50-7778889',
    importerEmail: 'wine@galil.co.il',
    country: 'ארגנטינה',
    startDate: '2024-02-15',
    endDate: '2024-05-01',
    kosherBody: 'OK',
    supervisor: 'הרב שמעון גולדשטיין',
    supervisorPhone: '+54-11-12345678',
    factoryName: 'Mendoza Winery',
    factoryAddress: 'Mendoza, Argentina',
    status: 'בתהליך',
    currentStage: 'ייצור',
    reportReceived: true,
    reportPhoto: '/reports/prj005.jpg',
    sentToChaim: false,
    paid: false,
    profitDaily: 1500,
    kosherFee: 5000,
    submissionFee: 1000,
    quotedPrice: 8000,
    actualExpenses: 6500,
    timeline: createTimeline('ייצור'),
    chatHistory: createChatHistory(),
    flight: { flightNumber: 'AR456', departureDate: '2024-03-01', arrivalDate: '2024-03-10', airline: 'Aerolineas', status: 'confirmed' },
    hotel: { hotelName: 'Hotel Mendoza', checkIn: '2024-03-01', checkOut: '2024-03-10', status: 'pending' },
    needsFlightBooking: false,
    clientAwaitingResponse: false,
  },
  {
    id: 'PRJ-006',
    responsible: 'שירה',
    projectName: 'אישור כשרות שימורים',
    importer: 'מזון טרי בע"מ',
    importerPhone: '+972-52-3334445',
    importerEmail: 'fresh@food.co.il',
    country: 'תאילנד',
    startDate: '2024-01-25',
    endDate: '2024-03-20',
    kosherBody: 'CRC',
    supervisor: 'הרב נתן ברקוביץ',
    supervisorPhone: '+66-812-345678',
    factoryName: 'Thai Canning Corp.',
    factoryAddress: 'Bangkok, Thailand',
    status: 'הוגש',
    currentStage: 'לוגיסטיקה',
    reportReceived: false,
    sentToChaim: true,
    paid: false,
    profitDaily: 680,
    kosherFee: 2200,
    submissionFee: 450,
    quotedPrice: 4000,
    actualExpenses: 2800,
    daysDelayed: 2,
    timeline: createTimeline('לוגיסטיקה'),
    chatHistory: createChatHistory(),
    flight: { status: 'pending' },
    hotel: { status: 'pending' },
    needsFlightBooking: true,
    clientAwaitingResponse: true,
  },
  {
    id: 'PRJ-007',
    responsible: 'נחמה',
    projectName: 'בדיקת מפעל דגים',
    importer: 'ים התיכון יבוא',
    importerPhone: '+972-54-6667778',
    importerEmail: 'fish@sea.co.il',
    country: 'נורבגיה',
    startDate: '2024-02-10',
    endDate: '2024-04-15',
    kosherBody: 'OU',
    supervisor: 'הרב חיים פרידמן',
    supervisorPhone: '+47-912-34567',
    factoryName: 'Nordic Fish AS',
    factoryAddress: 'Oslo, Norway',
    status: 'בתהליך',
    currentStage: 'ייצור',
    reportReceived: true,
    reportPhoto: '/reports/prj007.jpg',
    sentToChaim: true,
    paid: true,
    profitDaily: 1100,
    kosherFee: 3800,
    submissionFee: 700,
    quotedPrice: 6200,
    actualExpenses: 5800,
    timeline: createTimeline('ייצור'),
    chatHistory: createChatHistory(),
    flight: { flightNumber: 'SK123', departureDate: '2024-02-20', arrivalDate: '2024-02-28', airline: 'SAS', status: 'confirmed' },
    hotel: { hotelName: 'Hotel Oslo', checkIn: '2024-02-20', checkOut: '2024-02-28', status: 'confirmed' },
    needsFlightBooking: false,
    clientAwaitingResponse: false,
  },
  {
    id: 'PRJ-008',
    responsible: 'שירה',
    projectName: 'הסמכת ממתקים',
    importer: 'קנדי לנד',
    importerPhone: '+972-50-8889990',
    importerEmail: 'candy@land.co.il',
    country: 'גרמניה',
    startDate: '2024-01-05',
    endDate: '2024-02-20',
    kosherBody: 'Star-K',
    supervisor: 'הרב יוסף הירש',
    supervisorPhone: '+49-170-1234567',
    factoryName: 'German Sweets GmbH',
    factoryAddress: 'Munich, Germany',
    status: 'הסתיים',
    currentStage: 'אישור',
    reportReceived: true,
    reportPhoto: '/reports/prj008.jpg',
    sentToChaim: true,
    paid: true,
    profitDaily: 900,
    kosherFee: 2800,
    submissionFee: 550,
    quotedPrice: 4800,
    actualExpenses: 4200,
    timeline: createTimeline('אישור'),
    chatHistory: createChatHistory(),
    flight: { flightNumber: 'LH567', departureDate: '2024-01-15', arrivalDate: '2024-01-22', airline: 'Lufthansa', status: 'confirmed' },
    hotel: { hotelName: 'Hotel Munich', checkIn: '2024-01-15', checkOut: '2024-01-22', status: 'confirmed' },
    needsFlightBooking: false,
    clientAwaitingResponse: false,
  },
];

export const calculateStats = (projects: Project[]): DashboardStats => {
  const totalProfit = projects.reduce(
    (sum, p) => sum + p.profitDaily + p.kosherFee + p.submissionFee,
    0
  );
  const pendingReports = projects.filter(p => !p.reportReceived && p.status !== 'הסתיים').length;
  const projectsInProgress = projects.filter(p => p.status === 'בתהליך').length;
  const completedProjects = projects.filter(p => p.status === 'הסתיים').length;
  const urgentTasks = projects.filter(p => p.daysDelayed && p.daysDelayed > 3).length;
  const needsFlightBooking = projects.filter(p => p.needsFlightBooking).length;
  const clientsAwaitingResponse = projects.filter(p => p.clientAwaitingResponse).length;

  return {
    totalProfit,
    pendingReports,
    projectsInProgress,
    monthlyGrowth: 12.5,
    totalProjects: projects.length,
    completedProjects,
    urgentTasks,
    needsFlightBooking,
    clientsAwaitingResponse,
  };
};

export const getUnpaidProjectsFinancials = (projects: Project[]) => {
  const unpaidProjects = projects.filter(p => !p.paid);
  return {
    totalDaily: unpaidProjects.reduce((sum, p) => sum + p.profitDaily, 0),
    totalKosherFee: unpaidProjects.reduce((sum, p) => sum + p.kosherFee, 0),
    totalSubmissionFee: unpaidProjects.reduce((sum, p) => sum + p.submissionFee, 0),
    count: unpaidProjects.length,
    projects: unpaidProjects,
  };
};

export const getWorkloadBySecretary = (projects: Project[]) => {
  const workload: Record<string, { total: number; inProgress: number; completed: number }> = {};
  
  projects.forEach(p => {
    if (!workload[p.responsible]) {
      workload[p.responsible] = { total: 0, inProgress: 0, completed: 0 };
    }
    workload[p.responsible].total++;
    if (p.status === 'בתהליך') workload[p.responsible].inProgress++;
    if (p.status === 'הסתיים') workload[p.responsible].completed++;
  });
  
  return workload;
};

export const getProfitabilityData = (projects: Project[]) => {
  return projects
    .filter(p => p.quotedPrice && p.actualExpenses)
    .map(p => ({
      id: p.id,
      name: p.projectName,
      quoted: p.quotedPrice!,
      actual: p.actualExpenses!,
      profit: p.quotedPrice! - p.actualExpenses!,
      profitMargin: ((p.quotedPrice! - p.actualExpenses!) / p.quotedPrice!) * 100,
    }));
};
