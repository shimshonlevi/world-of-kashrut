'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowRight,
  ListTodo,
  FileText,
  Plane,
  MessageCircle,
  History,
  AlertTriangle,
  Phone,
  Mail,
  MessageSquare,
  Plus,
  Check,
  X,
  Edit2,
  Trash2,
  Upload,
  Eye,
  Download,
  Send,
  GripVertical,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Building2,
  CalendarDays,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  FileCheck,
  FileMinus,
  Hotel,
  Save,
  Factory,
  Pencil,
  Files,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Document, TimelineEvent, Project, ProjectRequirement, Supervisor } from '@/lib/types';
import { RequirementItem } from '@/components/case/requirement-item';
import { CaseOverview } from '@/components/case/case-overview';
import { CaseDocuments } from '@/components/case/case-documents';
import { inferDocumentCategory } from '@/lib/documents';
import { cn } from '@/lib/utils';
import { overallProgress, stageProgress, corePatchFromRequirement } from '@/lib/templates';
import { deadlineInfo } from '@/lib/dates';
import { exportProjectCsv, downloadCsv } from '@/lib/export';
import { FolderOpen, LayoutDashboard } from 'lucide-react';

// A section is either a tool id or a stage id (stage ids are dynamic).
type ToolSection =
  | 'overview'
  | 'details'
  | 'requirements'
  | 'approvals'
  | 'communication';
type ActiveSection = ToolSection;
const TOOL_SECTIONS: ToolSection[] = ['overview', 'details', 'requirements', 'approvals', 'communication'];
type ChatTab = 'internal' | 'external';

export default function CasePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [auditLog, setAuditLog] = useState<Array<{ id: string; action: string; user: string; fieldName?: string; oldValue?: string; newValue?: string; timestamp: string }>>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    setLoadingProject(true);
    fetch(`/api/projects/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Project not found');
        return res.json();
      })
      .then((data) => setProject(data.project))
      .catch((error) => {
        console.error('Failed to load project:', error);
        toast({ title: 'שגיאה', description: 'לא ניתן לטעון את הפרויקט', variant: 'destructive' });
        setProject(null);
      })
      .finally(() => setLoadingProject(false));
  }, [params.id, toast]);

  useEffect(() => {
    if (!project?.id) {
      setAuditLog([]);
      setLoadingAudit(false);
      return;
    }

    setLoadingAudit(true);
    fetch(`/api/projects/${project.id}/audit`)
      .then((res) => {
        if (!res.ok) throw new Error('Audit log not found');
        return res.json();
      })
      .then((data) => setAuditLog(data.auditLog || []))
      .catch((error) => {
        console.error('Failed to load audit log:', error);
        setAuditLog([]);
      })
      .finally(() => setLoadingAudit(false));
  }, [project]);

  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  // Within the unified "מסמכים ודרישות" tool: the checklist vs the files archive.
  const [docView, setDocView] = useState<'requirements' | 'files'>('requirements');
  // Within the unified "תקשורת" tool: the live chat vs the activity log.
  const [commView, setCommView] = useState<'chat' | 'log'>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [chatTab, setChatTab] = useState<ChatTab>('internal');

  // Supervisor roster — powers the assignment picker in the supervision tool.
  const [roster, setRoster] = useState<Supervisor[]>([]);
  useEffect(() => {
    fetch('/api/supervisors')
      .then((r) => r.json())
      .then((d) => setRoster(d.supervisors || []))
      .catch(() => {});
  }, []);

  // Team members — powers the "send for approval" picker in the approvals tool.
  const [team, setTeam] = useState<{ id: string; name: string; role: string }[]>([]);
  useEffect(() => {
    fetch('/api/users/names')
      .then((r) => r.json())
      .then((d) => setTeam(d.users || []))
      .catch(() => {});
  }, []);

  const [supervisorForm, setSupervisorForm] = useState({
    supervisor: '',
    supervisorPhone: '',
    reportReceived: false,
    reportPhoto: '',
    sentToChaim: false,
    reportNotes: '',
  });

  // Editable Form States - Logistics
  const [flightForm, setFlightForm] = useState({
    airline: '',
    flightNumber: '',
    departureDate: '',
    departureTime: '',
    arrivalDate: '',
    arrivalTime: '',
  });
  
  const [hotelForm, setHotelForm] = useState({
    hotelName: '',
    hotelAddress: '',
    checkIn: '',
    checkOut: '',
    status: 'pending',
  });

  // Editable Form States - Production Details
  const [productionForm, setProductionForm] = useState({
    productionHoursPerDay: 8,
    expectedQuantityTons: 5,
    kosherCategory: 'פרווה',
    factoryName: '',
    localContact: '',
    localContactPhone: '',
  });

  // Editable Form States - Financial
  const [financialForm, setFinancialForm] = useState({
    quotePrice: 0,
    actualCost: 0,
    currency: 'USD',
    paymentStatus: 'pending',
    paymentTerms: '',
  });
  
  const [isFinancialEditing, setIsFinancialEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize forms when project loads
  useEffect(() => {
    if (project) {
      setFlightForm({
        airline: project.flight?.airline || '',
        flightNumber: project.flight?.flightNumber || '',
        departureDate: project.flight?.departureDate || '',
        departureTime: '',
        arrivalDate: project.flight?.arrivalDate || '',
        arrivalTime: '',
      });
      setHotelForm({
        hotelName: project.hotel?.hotelName || '',
        hotelAddress: '',
        checkIn: project.hotel?.checkIn || '',
        checkOut: project.hotel?.checkOut || '',
        status: project.hotel?.status || 'pending',
      });
      setProductionForm(prev => ({
        ...prev,
        kosherCategory: project.kosherBody || 'פרווה',
      }));
      setFinancialForm(prev => ({
        ...prev,
        quotePrice: project.quotedPrice || 0,
        actualCost: project.actualExpenses || 0,
      }));
      setSupervisorForm({
        supervisor: project.supervisor || '',
        supervisorPhone: project.supervisorPhone || '',
        reportReceived: project.reportReceived ?? false,
        reportPhoto: project.reportPhoto || '',
        sentToChaim: project.sentToChaim ?? false,
        reportNotes: '',
      });
    }
  }, [project]);

  if (loadingProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-foreground text-lg font-medium">טוען את התיק...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">התיק לא נמצא</p>
          <Button asChild>
            <Link href="/">חזרה לדשבורד</Link>
          </Button>
        </div>
      </div>
    );
  }

  const openDocCount = (project.stages ?? [])
    .flatMap((s) => s.requirements)
    .filter((r) => r.type === 'document' && r.status !== 'approved' && r.status !== 'done').length;

  // Empty enabledTools = show all (back-compat); otherwise only the listed optional tools.
  const toolOn = (key: 'supervision' | 'production' | 'approvals') =>
    !project.enabledTools?.length || project.enabledTools.includes(key);

  const allToolItems: { id: ToolSection; icon: typeof ListTodo; label: string; badge?: number; optional?: 'supervision' | 'production' | 'approvals' }[] = [
    { id: 'details', icon: Building2, label: 'פרטי התיק' },
    { id: 'requirements', icon: FileText, label: 'מסמכים ודרישות', badge: openDocCount },
    { id: 'approvals', icon: CheckCircle2, label: 'אישורים', optional: 'approvals' },
    { id: 'communication', icon: MessageCircle, label: 'תקשורת', badge: project.chatHistory.filter((msg) => !msg.isInternal).length },
  ];
  const toolItems = allToolItems.filter((t) => !t.optional || toolOn(t.optional));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'בתהליך':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'הוגש':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'הסתיים':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Save handlers
  const handleSaveLogistics = async () => {
    setIsSaving(true);
    toast({ title: 'שומר...', description: 'שומרים פרטי לוגיסטיקה...' });
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flight: { ...project.flight, ...flightForm },
          hotel: { ...project.hotel, ...hotelForm },
          performedBy: user?.name || 'מערכת',
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setProject(data.project);
      console.log('[v1] Saved logistics:', data);
      toast({ title: 'נשמר', description: 'פרטי לוגיסטיקה נשמרו בהצלחה' });
    } catch (err) {
      console.error(err);
      toast({ title: 'שגיאה', description: 'שמירת לוגיסטיקה נכשלה', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProduction = async () => {
    setIsSaving(true);
    toast({ title: 'שומר...', description: 'שומרים פרטי ייצור...' });
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productionDetails: productionForm,
          factoryName: productionForm.factoryName || project.factoryName,
          localContact: productionForm.localContact,
          performedBy: user?.name || 'מערכת',
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setProject(data.project);
      console.log('[v1] Saved production:', data);
      toast({ title: 'נשמר', description: 'פרטי הייצור נשמרו' });
    } catch (err) {
      console.error(err);
      toast({ title: 'שגיאה', description: 'שמירת פרטי ייצור נכשלה', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSupervisor = async () => {
    setIsSaving(true);
    toast({ title: 'שומר...', description: 'שומרים פרטי משגיח ודוח...' });
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisor: supervisorForm.supervisor,
          supervisorPhone: supervisorForm.supervisorPhone,
          reportReceived: supervisorForm.reportReceived,
          reportPhoto: supervisorForm.reportPhoto,
          performedBy: user?.name || 'מערכת',
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setProject(data.project);
      console.log('[v1] Saved supervisor/report:', data);
      toast({ title: 'נשמר', description: 'פרטי המשגיח והדוח נשמרו' });
    } catch (err) {
      console.error(err);
      toast({ title: 'שגיאה', description: 'שמירת דוח המשגיח נכשלה', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFinancial = async () => {
    setIsSaving(true);
    toast({ title: 'שומר...', description: 'שומרים נתונים פיננסיים...' });
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotedPrice: financialForm.quotePrice,
          actualExpenses: financialForm.actualCost,
          currency: financialForm.currency,
          paymentStatus: financialForm.paymentStatus,
          paymentTerms: financialForm.paymentTerms,
          performedBy: user?.name || 'מערכת',
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setProject(data.project);
      console.log('[v1] Saved financial:', data);
      toast({ title: 'נשמר', description: 'הנתונים הפיננסיים עודכנו' });
      setIsFinancialEditing(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'שגיאה', description: 'שמירת נתונים פיננסיים נכשלה', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Stage / requirement persistence (single source of truth) ----
  const persistProject = async (patch: Record<string, unknown>, successMsg?: string) => {
    if (!project) return;
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patch, performedBy: user?.name || 'מערכת' }),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setProject(data.project);
      if (successMsg) toast({ title: 'נשמר', description: successMsg });
    } catch (err) {
      console.error(err);
      toast({ title: 'שגיאה', description: 'השמירה נכשלה', variant: 'destructive' });
    }
  };

  const updateRequirement = (stageId: string, reqId: string, patch: Partial<ProjectRequirement>) => {
    if (!project?.stages) return;
    let changed: ProjectRequirement | null = null;
    const stages = project.stages.map((s) =>
      s.id === stageId
        ? {
            ...s,
            requirements: s.requirements.map((r) => {
              if (r.id !== reqId) return r;
              const merged = { ...r, ...patch, updatedAt: new Date().toISOString(), updatedBy: user?.name };
              changed = merged;
              return merged;
            }),
          }
        : s
    );
    // Sync: a bound step mirrors a core flag (reportReceived / sentToChaim / paid).
    const corePatch = changed ? corePatchFromRequirement(changed) : {};
    setProject((prev) => (prev ? { ...prev, stages, ...corePatch } : prev)); // optimistic
    void persistProject({ stages, ...corePatch });
  };

  const uploadRequirementDocument = async (stageId: string, reqId: string, file: File) => {
    if (!project) return;
    // Vercel serverless functions cap the request body at ~4.5MB. Give a clear
    // message instead of a generic failure for larger files.
    if (file.size > 4.4 * 1024 * 1024) {
      toast({ title: 'הקובץ גדול מדי', description: 'מקסימום 4.5MB כרגע. כווץ את הקובץ או פצל אותו (בקרוב נתמוך בקבצים גדולים).', variant: 'destructive' });
      return;
    }
    const reqLabel = (project.stages ?? []).flatMap((s) => s.requirements).find((r) => r.id === reqId)?.label;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('requirementId', reqId);
    fd.append('uploadedBy', user?.name || 'מערכת');
    // Smart default category from the requirement label + file type (overridable).
    fd.append('category', inferDocumentCategory(reqLabel, file.type));
    try {
      const res = await fetch(`/api/projects/${project.id}/documents`, { method: 'POST', body: fd });
      if (res.status === 503) {
        // Storage not configured yet — friendly "coming soon" instead of a scary error.
        toast({ title: '📎 העלאת מסמכים — בקרוב', description: 'אחסון הקבצים בהגדרה אחרונה ויופעל בקרוב.' });
        return;
      }
      if (!res.ok) throw new Error('upload failed');
      const { url, name } = await res.json();
      updateRequirement(stageId, reqId, { value: url, note: name, status: 'submitted' });
      toast({ title: 'הקובץ הועלה', description: name });
    } catch {
      toast({ title: 'שגיאה', description: 'העלאת הקובץ נכשלה', variant: 'destructive' });
    }
  };

  const sendChatMessage = (isInternal: boolean) => {
    if (!project || !newMessage.trim()) return;
    const text = newMessage.trim();
    const msg = {
      id: `m-${Date.now()}`,
      sender: user?.name || 'מערכת',
      message: text,
      timestamp: new Date().toLocaleString('he-IL'),
      isInternal,
    };
    const chatHistory = [...project.chatHistory, msg];
    setProject((prev) => (prev ? { ...prev, chatHistory } : prev));
    setNewMessage('');
    void persistProject({ chatHistory });
    // External messages also open WhatsApp to actually reach the importer.
    if (!isInternal && project.importerPhone) {
      window.open(`https://wa.me/${project.importerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    }
  };

  const stages = project.stages ?? [];
  const projectProgress = overallProgress(stages);
  const deadline = deadlineInfo(project.endDate, project.status);


  // Save a single core field (used by the Opening tool's inline inputs).
  const saveField = (field: keyof Project, value: string) => {
    if (String(project[field] ?? '') === value) return;
    void persistProject({ [field]: value } as Partial<Project>, 'נשמר');
  };

  // Request a requirement from the responsible party (WhatsApp / email, prefilled).
  const requestRequirement = (req: ProjectRequirement) => {
    let phone: string | undefined;
    let email: string | undefined;
    let name = '';
    if (req.source === 'supervisor') {
      phone = project.supervisorPhone;
      name = project.supervisor || '';
    } else if (req.source === 'importer') {
      phone = project.importerPhone;
      email = project.importerEmail;
      name = project.importer || '';
    } else if (req.source === 'factory') {
      phone = project.importerPhone; // best-available contact
      name = project.factoryName || '';
    }
    const action = req.type === 'document' ? 'נא לשלוח את המסמך' : 'נא למלא/לעדכן את הפרט';
    const msg = `שלום${name ? ' ' + name : ''}, עבור התיק "${project.projectName}" (${project.importer}) נדרש: ${req.label}. ${action}. תודה!`;
    if (phone) {
      window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    } else if (email) {
      window.open(`mailto:${email}?subject=${encodeURIComponent('בקשה — ' + project.projectName)}&body=${encodeURIComponent(msg)}`);
    } else {
      navigator.clipboard?.writeText(msg);
      toast({ title: 'אין איש קשר שמור', description: 'נוסח הבקשה הועתק — נא לשלוח ידנית' });
    }
  };

  // Open WhatsApp to a phone with a prefilled message (logs it to the case too).
  const openWhatsApp = (phone: string | undefined, text: string, isInternal = false) => {
    if (!phone) {
      navigator.clipboard?.writeText(text);
      toast({ title: 'אין מספר שמור', description: 'ההודעה הועתקה — נא לשלוח ידנית' });
      return;
    }
    const msg = {
      id: `m-${Date.now()}`,
      sender: user?.name || 'מערכת',
      message: text,
      timestamp: new Date().toLocaleString('he-IL'),
      isInternal,
    };
    const chatHistory = [...project.chatHistory, msg];
    setProject((prev) => (prev ? { ...prev, chatHistory } : prev));
    void persistProject({ chatHistory });
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  // Quick message templates (filled with this case's data).
  const messageTemplates = [
    { label: 'בקש דו״ח מהמשגיח', to: 'supervisor' as const, text: `שלום ${project.supervisor || ''}, עבור התיק "${project.projectName}" — נא לשלוח את דו״ח הייצור. תודה!` },
    { label: 'תזכורת תשלום ליבואן', to: 'importer' as const, text: `שלום ${project.importer}, תזכורת לתשלום עבור התיק "${project.projectName}". תודה!` },
    { label: 'בקש מסמכים מהיבואן', to: 'importer' as const, text: `שלום ${project.importer}, עבור התיק "${project.projectName}" — נא לשלוח את המסמכים הנדרשים. תודה!` },
    { label: 'עדכון סטטוס ליבואן', to: 'importer' as const, text: `שלום ${project.importer}, עדכון לגבי התיק "${project.projectName}": התיק בטיפול ונעדכן בהקדם.` },
  ];

  // All requirement-type items grouped for the tool sections.
  const requirementGroups = stages
    .map((s) => ({ stage: s, items: s.requirements.filter((r) => r.type !== 'approval') }))
    .filter((g) => g.items.length > 0);
  const approvalItems = stages.flatMap((s) =>
    s.requirements.filter((r) => r.type === 'approval').map((r) => ({ stage: s, req: r }))
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar - Internal Navigation */}
      <aside className="w-16 lg:w-60 border-l bg-card flex flex-col shrink-0 h-screen sticky top-0">
        <div className="p-4 border-b">
          <Button variant="ghost" size="sm" className="gap-2 w-full justify-start" asChild>
            <Link href="/">
              <ArrowRight className="h-4 w-4" />
              <span className="hidden lg:inline">חזרה לדשבורד</span>
            </Link>
          </Button>
        </div>
        
        {/* Project Quick Info */}
        <div className="p-4 border-b hidden lg:block">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span className="truncate">{project.importer}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>{project.responsible}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{project.endDate}</span>
            </div>
            {stages.length > 0 && (
              <div className="pt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">התקדמות התיק</span>
                  <span className="font-semibold tabular-nums">{projectProgress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-500 transition-all duration-500" style={{ width: `${projectProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <nav className="p-2">
            {/* Overview — the case document (default) */}
            <button
              onClick={() => setActiveSection('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all mb-1 ${
                activeSection === 'overview' ? 'bg-primary text-primary-foreground shadow-sm font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
              <span className="hidden lg:inline flex-1 text-right">סקירה כללית</span>
            </button>

            {/* Tools — the case is organized as a set of tools */}
            <p className="hidden lg:block px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              כלי התיק
            </p>
            {toolItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all mb-1 relative ${
                  activeSection === item.id
                    ? 'bg-primary text-primary-foreground shadow-sm font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="hidden lg:inline flex-1 text-right">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <Badge
                    variant="secondary"
                    className={`h-5 min-w-[20px] px-1.5 text-[10px] ${
                      activeSection === item.id
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
        </ScrollArea>
        
        {/* Financial Summary - Editable */}
        <div className="p-4 border-t hidden lg:block">
          <Popover open={isFinancialEditing} onOpenChange={setIsFinancialEditing}>
            <PopoverTrigger asChild>
              <button className="w-full p-3 rounded-lg bg-muted/50 space-y-2 hover:bg-muted transition-colors text-right group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">נתונים פיננסיים</span>
                  <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">הצעה:</span>
                  <span className="font-medium">${financialForm.quotePrice.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">עלות בפועל:</span>
                  <span className="font-medium">${financialForm.actualCost.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">רווח:</span>
                  <span className={`font-bold ${financialForm.quotePrice - financialForm.actualCost > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    ${(financialForm.quotePrice - financialForm.actualCost).toLocaleString()}
                  </span>
                </div>
                <Badge 
                  variant="outline" 
                  className={`w-full justify-center mt-2 text-[10px] ${
                    financialForm.paymentStatus === 'paid_full' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : financialForm.paymentStatus === 'advance_paid'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {financialForm.paymentStatus === 'paid_full' ? 'שולם במלואו' : 
                   financialForm.paymentStatus === 'advance_paid' ? 'מקדמה שולמה' : 'חוב פתוח'}
                </Badge>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">עריכת נתונים פיננסיים</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="quotePrice" className="text-xs">סכום הצעת מחיר</Label>
                    <Input
                      id="quotePrice"
                      type="number"
                      value={financialForm.quotePrice}
                      onChange={(e) => setFinancialForm({ ...financialForm, quotePrice: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="actualCost" className="text-xs">עלות בפועל</Label>
                    <Input
                      id="actualCost"
                      type="number"
                      value={financialForm.actualCost}
                      onChange={(e) => setFinancialForm({ ...financialForm, actualCost: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currency" className="text-xs">מטבע</Label>
                  <Select
                    value={financialForm.currency}
                    onValueChange={(value) => setFinancialForm({ ...financialForm, currency: value })}
                  >
                    <SelectTrigger id="currency" className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - דולר</SelectItem>
                      <SelectItem value="EUR">EUR - יורו</SelectItem>
                      <SelectItem value="ILS">ILS - שקל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentStatus" className="text-xs">סטטוס תשלום</Label>
                  <Select
                    value={financialForm.paymentStatus}
                    onValueChange={(value) => setFinancialForm({ ...financialForm, paymentStatus: value })}
                  >
                    <SelectTrigger id="paymentStatus" className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">חוב פתוח</SelectItem>
                      <SelectItem value="advance_paid">מקדמה שולמה</SelectItem>
                      <SelectItem value="paid_full">שולם במלואו</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentTerms" className="text-xs">תנאי תשלום</Label>
                  <Input
                    id="paymentTerms"
                    value={financialForm.paymentTerms}
                    onChange={(e) => setFinancialForm({ ...financialForm, paymentTerms: e.target.value })}
                    placeholder="שוטף + 30"
                    className="h-8 text-sm"
                  />
                </div>

                <Button size="sm" className="w-full gap-1" onClick={handleSaveFinancial} disabled={isSaving}>
                  <Save className="h-3.5 w-3.5" />
                  {isSaving ? 'שומר...' : 'שמור שינויים'}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="relative border-b bg-card/85 backdrop-blur-md p-4 lg:p-6 shrink-0 sticky top-0 z-20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-xl lg:text-2xl font-semibold">{project.projectName}</h1>
                <Badge variant="outline" className={getStatusColor(project.status)}>
                  {project.status}
                </Badge>
                {deadline.tone !== 'none' && deadline.tone !== 'done' && (
                  <Badge
                    variant="outline"
                    className={
                      deadline.tone === 'overdue'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : deadline.tone === 'soon'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-muted text-muted-foreground'
                    }
                  >
                    <Clock className="h-3 w-3 ml-1" />
                    {deadline.label}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{project.id}</span>
                <span>•</span>
                <span>{project.country}</span>
                <span>•</span>
                <span>{project.kosherBody}</span>
                <span>•</span>
                <span>{project.currentStage}</span>
              </div>
            </div>
            
            {/* Urgent Alerts */}
            {(deadline.tone === 'overdue' || project.clientAwaitingResponse) && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {deadline.tone === 'overdue' ? deadline.label : ''}
                  {deadline.tone === 'overdue' && project.clientAwaitingResponse ? ' | ' : ''}
                  {project.clientAwaitingResponse ? 'יבואן ממתין' : ''}
                </span>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportProjectCsv(project)}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">ייצוא לאקסל</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => { setActiveSection('requirements'); setDocView('files'); }}
              >
                <Files className="h-4 w-4" />
                <span className="hidden sm:inline">מסמכי התיק</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={`https://wa.me/${project.importerPhone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer noopener">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={`tel:${project.importerPhone}`}>
                  <Phone className="h-4 w-4 text-blue-600" />
                  <span className="hidden sm:inline">טלפון</span>
                </a>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={`mailto:${project.importerEmail}`}>
                  <Mail className="h-4 w-4 text-amber-600" />
                  <span className="hidden sm:inline">אימייל</span>
                </a>
              </Button>
            </div>
          </div>

          {/* Slim overall-progress rail along the header's bottom edge */}
          {stages.length > 0 && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-muted/60">
              <div
                className="h-full bg-gradient-to-l from-emerald-400 to-emerald-500 transition-all duration-500"
                style={{ width: `${projectProgress}%` }}
              />
            </div>
          )}
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto fade-up">
          {/* Case document overview */}
          {activeSection === 'overview' && <CaseOverview project={project} onNavigate={setActiveSection} />}

          {/* Opening tool — importer & initial details */}
          {activeSection === 'details' && (
            <div className="max-w-4xl space-y-4">
              <div>
                <h2 className="text-2xl font-bold">פרטי התיק</h2>
                <p className="text-sm text-muted-foreground mt-1">כל נתוני הקבע של התיק במקום אחד — יבואן, כשרות ומשגיח, לוגיסטיקה וייצור.</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">יבואן ומוצר</h3>
              <Card>
                <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {([
                    ['importer', 'שם יבואן'],
                    ['importerPhone', 'טלפון יבואן'],
                    ['importerEmail', 'אימייל יבואן'],
                    ['country', 'מדינה'],
                    ['kosherBody', 'גוף כשרות'],
                    ['factoryName', 'שם המפעל'],
                    ['factoryAddress', 'כתובת / איש קשר במפעל'],
                  ] as [keyof Project, string][]).map(([field, label]) => (
                    <div key={field} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Input
                        defaultValue={String(project[field] ?? '')}
                        onBlur={(e) => saveField(field, e.target.value)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground mt-2">השינויים נשמרים אוטומטית ביציאה מהשדה.</p>
              </div>
            </div>
          )}

          {/* Requirements & documents tool — checklist + files archive in one place */}
          {activeSection === 'requirements' && (
            <div className="max-w-3xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">מסמכים ודרישות</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {docView === 'requirements'
                      ? 'כל המסמכים, השדות והמשימות שהתיק דורש — מלא, העלה ואשר כאן.'
                      : 'כל הקבצים שהועלו לתיק, במקום אחד.'}
                  </p>
                </div>
                <div className="inline-flex rounded-lg border bg-card p-0.5 text-sm shrink-0">
                  <button
                    onClick={() => setDocView('requirements')}
                    className={cn('rounded-md px-3 py-1 transition-colors', docView === 'requirements' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                  >
                    דרישות
                  </button>
                  <button
                    onClick={() => setDocView('files')}
                    className={cn('rounded-md px-3 py-1 transition-colors', docView === 'files' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                  >
                    קבצים
                  </button>
                </div>
              </div>

              {docView === 'files' && <CaseDocuments project={project} />}

              {docView === 'requirements' && requirementGroups.length === 0 && (
                <p className="text-muted-foreground py-8 text-center border rounded-lg border-dashed">
                  לתיק זה לא הוגדרו דרישות (לא נבחרה תבנית).
                </p>
              )}
              {docView === 'requirements' && requirementGroups.map(({ stage, items }) => (
                <div key={stage.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{stage.name}</h3>
                    <span className="text-xs text-muted-foreground tabular-nums">{stageProgress(stage)}%</span>
                  </div>
                  {items.map((req) => (
                    <RequirementItem
                      key={req.id}
                      requirement={req}
                      onUpdate={(patch) => updateRequirement(stage.id, req.id, patch)}
                      onUploadDocument={(file) => uploadRequirementDocument(stage.id, req.id, file)}
                      onRequest={() => requestRequirement(req)}
                      onAnalyzeAI={() =>
                        toast({
                          title: '🔍 ניתוח מסמך ב-AI — בקרוב',
                          description:
                            'המערכת תקרא את המסמך (OCR), תחלץ תאריכים, אסמכתאות ושמות, ותמלא את שדות הדרישה אוטומטית — עם אישור שלך לפני שמירה.',
                        })
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Approvals tool */}
          {activeSection === 'approvals' && (
            <div className="max-w-3xl space-y-3">
              <div>
                <h2 className="text-2xl font-bold">אישורים</h2>
                <p className="text-sm text-muted-foreground mt-1">שלח כל אישור לאדם הנכון — הוא יראה אותו בתיבת "לאישורי".</p>
              </div>
              {approvalItems.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center border rounded-lg border-dashed">אין אישורים מוגדרים בתיק.</p>
              ) : (
                approvalItems.map(({ stage, req }) => {
                  const decided = req.status === 'approved' || req.status === 'rejected';
                  const sent = req.status === 'submitted' && !!req.approverName;
                  const canDecide = decided || sent
                    ? user?.name === req.approverName || user?.role === 'admin'
                    : false;
                  return (
                    <Card key={req.id} className={cn(
                      'border',
                      req.status === 'approved' ? 'border-emerald-200 bg-emerald-50/40' :
                      req.status === 'rejected' ? 'border-red-200 bg-red-50/40' : 'border-border/60'
                    )}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className={cn('h-4 w-4', req.status === 'approved' ? 'text-emerald-600' : 'text-muted-foreground')} />
                            <span className="font-medium text-sm">{req.label}</span>
                          </div>
                          <Badge variant="outline" className={cn('text-[10px]',
                            req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            sent ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-muted text-muted-foreground'
                          )}>
                            {req.status === 'approved' ? 'אושר' : req.status === 'rejected' ? 'נדחה' : sent ? `ממתין ל${req.approverName}` : 'טרם נשלח'}
                          </Badge>
                        </div>

                        {!decided && (
                          <div className="flex flex-wrap items-end gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">מאשר{req.approverRole ? ` (${req.approverRole})` : ''}</Label>
                              <Select
                                value={req.approverName || ''}
                                onValueChange={(v) => updateRequirement(stage.id, req.id, { approverName: v })}
                              >
                                <SelectTrigger className="h-9 w-48 text-sm"><SelectValue placeholder="בחר איש צוות" /></SelectTrigger>
                                <SelectContent>
                                  {team.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              size="sm"
                              disabled={!req.approverName}
                              onClick={() => updateRequirement(stage.id, req.id, { status: 'submitted', sentForApprovalAt: new Date().toISOString() })}
                              className="gap-1"
                            >
                              <Send className="h-3.5 w-3.5" />
                              {sent ? 'שלח שוב' : 'שלח לאישור'}
                            </Button>
                          </div>
                        )}

                        {sent && canDecide && (
                          <div className="flex items-center gap-2 pt-1 border-t">
                            <span className="text-xs text-muted-foreground">האישור מחכה לך:</span>
                            <Button size="sm" variant="outline" className="h-8 gap-1 text-emerald-700 border-emerald-200" onClick={() => updateRequirement(stage.id, req.id, { status: 'approved' })}>
                              <Check className="h-3.5 w-3.5" /> אשר
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive border-red-200" onClick={() => updateRequirement(stage.id, req.id, { status: 'rejected' })}>
                              <X className="h-3.5 w-3.5" /> דחה
                            </Button>
                          </div>
                        )}

                        {decided && (
                          <div className="flex items-center gap-2 pt-1 border-t">
                            <span className="text-xs text-muted-foreground">
                              {req.status === 'approved' ? 'אושר' : 'נדחה'} על ידי {req.approverName || '—'}
                            </span>
                            {(user?.role === 'admin' || user?.name === req.approverName) && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => updateRequirement(stage.id, req.id, { status: 'submitted' })}>
                                בטל החלטה
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Supervision & flights tool */}
          {activeSection === 'details' && toolOn('supervision') && (
            <div className="max-w-4xl space-y-6 mt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">לוגיסטיקה — טיסה ומלון</h3>
                <Button onClick={handleSaveLogistics} disabled={isSaving} size="sm" variant="outline" className="gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? 'שומר...' : 'שמור'}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Flight Info - Editable Form */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Plane className="h-4 w-4" />
                      פרטי טיסה
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="airline">חברת תעופה</Label>
                        <Select
                          value={flightForm.airline}
                          onValueChange={(value) => setFlightForm({ ...flightForm, airline: value })}
                        >
                          <SelectTrigger id="airline">
                            <SelectValue placeholder="בחר חברה" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="אל על">אל על</SelectItem>
                            <SelectItem value="לופטהנזה">לופטהנזה</SelectItem>
                            <SelectItem value="טורקיש איירליינס">טורקיש איירליינס</SelectItem>
                            <SelectItem value="אייר פראנס">אייר פראנס</SelectItem>
                            <SelectItem value="בריטיש איירווייס">בריטיש איירווייס</SelectItem>
                            <SelectItem value="אחר">אחר</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="flightNumber">מספר טיסה</Label>
                        <Input
                          id="flightNumber"
                          value={flightForm.flightNumber}
                          onChange={(e) => setFlightForm({ ...flightForm, flightNumber: e.target.value })}
                          placeholder="LY315"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="departureDate">תאריך המראה</Label>
                        <Input
                          id="departureDate"
                          type="date"
                          value={flightForm.departureDate}
                          onChange={(e) => setFlightForm({ ...flightForm, departureDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="departureTime">שעת המראה</Label>
                        <Input
                          id="departureTime"
                          type="time"
                          value={flightForm.departureTime}
                          onChange={(e) => setFlightForm({ ...flightForm, departureTime: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="arrivalDate">תאריך נחיתה</Label>
                        <Input
                          id="arrivalDate"
                          type="date"
                          value={flightForm.arrivalDate}
                          onChange={(e) => setFlightForm({ ...flightForm, arrivalDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="arrivalTime">שעת נחיתה</Label>
                        <Input
                          id="arrivalTime"
                          type="time"
                          value={flightForm.arrivalTime}
                          onChange={(e) => setFlightForm({ ...flightForm, arrivalTime: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Hotel Info - Editable Form */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Hotel className="h-4 w-4" />
                      פרטי מלון
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="hotelName">שם המלון</Label>
                      <Input
                        id="hotelName"
                        value={hotelForm.hotelName}
                        onChange={(e) => setHotelForm({ ...hotelForm, hotelName: e.target.value })}
                        placeholder="Marriott Brussels"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hotelAddress">כתובת המלון</Label>
                      <Input
                        id="hotelAddress"
                        value={hotelForm.hotelAddress}
                        onChange={(e) => setHotelForm({ ...hotelForm, hotelAddress: e.target.value })}
                        placeholder="123 Main Street, Brussels"
                      />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="checkIn">צ׳ק-אין</Label>
                        <Input
                          id="checkIn"
                          type="date"
                          value={hotelForm.checkIn}
                          onChange={(e) => setHotelForm({ ...hotelForm, checkIn: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkOut">צ׳ק-אאוט</Label>
                        <Input
                          id="checkOut"
                          type="date"
                          value={hotelForm.checkOut}
                          onChange={(e) => setHotelForm({ ...hotelForm, checkOut: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hotelStatus">סטטוס הזמנה</Label>
                      <Select
                        value={hotelForm.status}
                        onValueChange={(value) => setHotelForm({ ...hotelForm, status: value })}
                      >
                        <SelectTrigger id="hotelStatus">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">טרם הוזמן</SelectItem>
                          <SelectItem value="waiting">הוזמן - ממתין לאישור</SelectItem>
                          <SelectItem value="confirmed">אושר סופית</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          )}

          {activeSection === 'details' && toolOn('production') && (
            <div className="max-w-4xl space-y-6 mt-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">פרטי ייצור</h3>
                  <p className="text-xs text-muted-foreground">מידע טכני רלוונטי לשלב הייצור.</p>
                </div>
                <Button onClick={handleSaveProduction} disabled={isSaving} size="sm" variant="outline" className="gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? 'שומר...' : 'שמור'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Factory className="h-4 w-4" />
                      נתוני ייצור
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="productionHours">שעות ייצור ביום</Label>
                      <Input
                        id="productionHours"
                        type="number"
                        min={1}
                        max={24}
                        value={productionForm.productionHoursPerDay}
                        onChange={(e) => setProductionForm({ ...productionForm, productionHoursPerDay: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedQuantity">כמות צפויה (טון)</Label>
                      <Input
                        id="expectedQuantity"
                        type="number"
                        min={0}
                        step={0.5}
                        value={productionForm.expectedQuantityTons}
                        onChange={(e) => setProductionForm({ ...productionForm, expectedQuantityTons: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kosherCategory">קטגוריית כשרות</Label>
                      <Select
                        value={productionForm.kosherCategory}
                        onValueChange={(value) => setProductionForm({ ...productionForm, kosherCategory: value })}
                      >
                        <SelectTrigger id="kosherCategory">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="חלבי">חלבי</SelectItem>
                          <SelectItem value="בשרי">בשרי</SelectItem>
                          <SelectItem value="פרווה">פרווה</SelectItem>
                          <SelectItem value="לפסח">לפסח</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      פרטי מפעל
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="factoryName">שם המפעל</Label>
                      <Input
                        id="factoryName"
                        value={productionForm.factoryName}
                        onChange={(e) => setProductionForm({ ...productionForm, factoryName: e.target.value })}
                        placeholder="שם המפעל"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="localContact">איש קשר מקומי</Label>
                      <Input
                        id="localContact"
                        value={productionForm.localContact}
                        onChange={(e) => setProductionForm({ ...productionForm, localContact: e.target.value })}
                        placeholder="שם איש הקשר"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="localContactPhone">טלפון איש קשר</Label>
                      <Input
                        id="localContactPhone"
                        value={productionForm.localContactPhone}
                        onChange={(e) => setProductionForm({ ...productionForm, localContactPhone: e.target.value })}
                        placeholder="+32 xxx xxx xxx"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      הערכת עלויות
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="productionBudget">תקציב ייצור משוער</Label>
                      <Input
                        id="productionBudget"
                        type="number"
                        value={productionForm.expectedQuantityTons * 1000}
                        disabled
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">ערך מוערך לפי כמות הייצור. ניתן להחליף לחיבור ישיר לדוח עלויות במחלקת הכלכלה.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeSection === 'details' && toolOn('supervision') && (
            <div className="max-w-4xl space-y-6 mt-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">משגיח ודו״ח</h3>
                  <p className="text-xs text-muted-foreground">שיבוץ המשגיח, דו״ח המעקב וסטטוס השליחה הלאה.</p>
                </div>
                <Button onClick={handleSaveSupervisor} disabled={isSaving} size="sm" variant="outline" className="gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? 'שומר...' : 'שמור'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      פרטי משגיח
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="supervisorName">שם המשגיח</Label>
                      <Input
                        id="supervisorName"
                        list="supervisor-roster"
                        placeholder="בחר מהרשימה או הקלד שם"
                        value={supervisorForm.supervisor}
                        onChange={(e) => {
                          const name = e.target.value;
                          const match = roster.find((s) => s.name === name);
                          setSupervisorForm({
                            ...supervisorForm,
                            supervisor: name,
                            // auto-fill phone when a known supervisor is picked
                            supervisorPhone: match?.phone || supervisorForm.supervisorPhone,
                          });
                        }}
                      />
                      <datalist id="supervisor-roster">
                        {roster.map((s) => (
                          <option key={s.id} value={s.name}>
                            {[s.regions, s.availability].filter(Boolean).join(' · ')}
                          </option>
                        ))}
                      </datalist>
                      {(() => {
                        const match = roster.find((s) => s.name === supervisorForm.supervisor);
                        if (!match) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {match.active === false && (
                              <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">לא זמין לשיבוץ</Badge>
                            )}
                            {(match.regions || '').split(',').map((r) => r.trim()).filter(Boolean).slice(0, 3).map((r) => (
                              <Badge key={r} variant="outline" className="text-[10px] border-primary/30 text-primary">{r}</Badge>
                            ))}
                            {match.availability && (
                              <span className="text-[11px] text-muted-foreground">· {match.availability}</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supervisorPhone">טלפון המשגיח</Label>
                      <Input
                        id="supervisorPhone"
                        value={supervisorForm.supervisorPhone}
                        onChange={(e) => setSupervisorForm({ ...supervisorForm, supervisorPhone: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`https://wa.me/${supervisorForm.supervisorPhone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer noopener">
                          <MessageSquare className="h-4 w-4 text-emerald-600" />
                          WhatsApp
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${supervisorForm.supervisorPhone}`}>
                          <Phone className="h-4 w-4 text-blue-600" />
                          טלפון
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      סטטוס דוח
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">דוח התקבל</p>
                        <p className="text-xs text-muted-foreground">{supervisorForm.reportReceived ? 'כן' : 'לא'}</p>
                      </div>
                      <Button size="sm" variant={supervisorForm.reportReceived ? 'outline' : 'secondary'} onClick={() => setSupervisorForm({ ...supervisorForm, reportReceived: !supervisorForm.reportReceived })}>
                        {supervisorForm.reportReceived ? 'בטל' : 'סמן כהתקבל'}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reportPhoto">קישור לדוח / תמונה</Label>
                      <Input
                        id="reportPhoto"
                        value={supervisorForm.reportPhoto}
                        onChange={(e) => setSupervisorForm({ ...supervisorForm, reportPhoto: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reportNotes">הערות לדוח</Label>
                      <Textarea
                        id="reportNotes"
                        value={supervisorForm.reportNotes}
                        onChange={(e) => setSupervisorForm({ ...supervisorForm, reportNotes: e.target.value })}
                        rows={4}
                        placeholder="פירוט בעיות, בקשות מיוחדות או סטטוס מעבדה"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant={supervisorForm.sentToChaim ? 'outline' : 'secondary'} size="sm" onClick={() => setSupervisorForm({ ...supervisorForm, sentToChaim: !supervisorForm.sentToChaim })}>
                        {supervisorForm.sentToChaim ? 'שלחתי לייצוא' : 'שלח לייצוא'}
                      </Button>
                      <span className="text-xs text-muted-foreground">ניתן לשלוח ברגע שהדוח מאושר.</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Financial — the last details sub-section */}
          {activeSection === 'details' && (
            <div className="max-w-4xl space-y-3 mt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">פיננסי</h3>
                <Button onClick={handleSaveFinancial} disabled={isSaving} size="sm" variant="outline" className="gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? 'שומר...' : 'שמור'}
                </Button>
              </div>
              <Card>
                <CardContent className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label>הצעת מחיר</Label>
                    <Input type="number" value={financialForm.quotePrice} onChange={(e) => setFinancialForm({ ...financialForm, quotePrice: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>עלות בפועל</Label>
                    <Input type="number" value={financialForm.actualCost} onChange={(e) => setFinancialForm({ ...financialForm, actualCost: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>מטבע</Label>
                    <Select value={financialForm.currency} onValueChange={(v) => setFinancialForm({ ...financialForm, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - דולר</SelectItem>
                        <SelectItem value="EUR">EUR - יורו</SelectItem>
                        <SelectItem value="ILS">ILS - שקל</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>סטטוס תשלום</Label>
                    <Select value={financialForm.paymentStatus} onValueChange={(v) => setFinancialForm({ ...financialForm, paymentStatus: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">חוב פתוח</SelectItem>
                        <SelectItem value="advance_paid">מקדמה שולמה</SelectItem>
                        <SelectItem value="paid_full">שולם במלואו</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-4 flex items-center gap-2 pt-1 border-t">
                    <span className="text-sm text-muted-foreground">רווח:</span>
                    <span className={cn('text-sm font-bold', financialForm.quotePrice - financialForm.actualCost >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                      {(financialForm.quotePrice - financialForm.actualCost).toLocaleString()} {financialForm.currency}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Chat View - Dual Panel */}
          {activeSection === 'communication' && (
            <div className="max-w-4xl mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">תקשורת</h2>
                <p className="text-sm text-muted-foreground mt-1">{commView === 'chat' ? 'הודעות ותקשורת עם היבואן והצוות.' : 'יומן פעילות מלא — שינויים והודעות לפי סדר כרונולוגי.'}</p>
              </div>
              <div className="inline-flex rounded-lg border bg-card p-0.5 text-sm shrink-0">
                <button onClick={() => setCommView('chat')} className={cn('rounded-md px-3 py-1 transition-colors', commView === 'chat' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>שיחה</button>
                <button onClick={() => setCommView('log')} className={cn('rounded-md px-3 py-1 transition-colors', commView === 'log' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>יומן פעילות</button>
              </div>
            </div>
          )}
          {activeSection === 'communication' && commView === 'chat' && (
            <div className="max-w-4xl h-[calc(100vh-260px)] flex flex-col">

              {/* Quick contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="rounded-lg border bg-card p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">יבואן</p>
                    <p className="text-sm font-medium truncate">{project.importer}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" disabled={!project.importerPhone}
                      onClick={() => window.open(`https://wa.me/${project.importerPhone?.replace(/\D/g, '')}`, '_blank')}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" disabled={!project.importerPhone}
                      onClick={() => window.open(`tel:${project.importerPhone}`)}>
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" disabled={!project.importerEmail}
                      onClick={() => window.open(`mailto:${project.importerEmail}`)}>
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">משגיח</p>
                    <p className="text-sm font-medium truncate">{project.supervisor || '—'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" disabled={!project.supervisorPhone}
                      onClick={() => window.open(`https://wa.me/${project.supervisorPhone?.replace(/\D/g, '')}`, '_blank')}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" disabled={!project.supervisorPhone}
                      onClick={() => window.open(`tel:${project.supervisorPhone}`)}>
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick templates */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs text-muted-foreground self-center">תבניות מהירות:</span>
                {messageTemplates.map((t) => (
                  <Button
                    key={t.label}
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => openWhatsApp(t.to === 'supervisor' ? project.supervisorPhone : project.importerPhone, t.text)}
                  >
                    <Send className="h-3 w-3" />
                    {t.label}
                  </Button>
                ))}
              </div>

              <Tabs value={chatTab} onValueChange={(v) => setChatTab(v as ChatTab)} className="flex-1 flex flex-col">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="internal" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    צ׳אט פנימי (משרד)
                  </TabsTrigger>
                  <TabsTrigger value="external" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp יבואן
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="internal" className="flex-1 flex flex-col mt-4">
                  <ScrollArea className="flex-1 rounded-lg border bg-card p-4">
                    <div className="space-y-4">
                      {project.chatHistory.filter(m => m.isInternal).map((msg) => (
                        <div key={msg.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{msg.sender}</span>
                              <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3 text-sm">
                              {msg.message}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex items-center gap-2 mt-4">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChatMessage(true)}
                      placeholder="כתוב הודעה פנימית..."
                      className="flex-1"
                    />
                    <Button disabled={!newMessage.trim()} className="gap-1" onClick={() => sendChatMessage(true)}>
                      <Send className="h-4 w-4" />
                      שלח
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="external" className="flex-1 flex flex-col mt-4">
                  <ScrollArea className="flex-1 rounded-lg border bg-card p-4">
                    <div className="space-y-4">
                      {project.chatHistory.filter(m => !m.isInternal).map((msg) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.sender === 'יבואן' ? '' : 'flex-row-reverse'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            msg.sender === 'יבואן' ? 'bg-emerald-100' : 'bg-primary/10'
                          }`}>
                            <User className={`h-4 w-4 ${msg.sender === 'יבואן' ? 'text-emerald-600' : 'text-primary'}`} />
                          </div>
                          <div className={`flex-1 ${msg.sender === 'יבואן' ? '' : 'text-left'}`}>
                            <div className={`flex items-center gap-2 mb-1 ${msg.sender === 'יבואן' ? '' : 'flex-row-reverse'}`}>
                              <span className="font-medium text-sm">{msg.sender}</span>
                              <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                            </div>
                            <div className={`rounded-lg p-3 text-sm ${
                              msg.sender === 'יבואן' ? 'bg-emerald-50' : 'bg-primary/5'
                            }`}>
                              {msg.message}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex items-center gap-2 mt-4">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChatMessage(false)}
                      placeholder="כתוב הודעה ליבואן..."
                      className="flex-1"
                    />
                    <Button
                      disabled={!newMessage.trim()}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => sendChatMessage(false)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      שלח ל-WhatsApp
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* History View - Audit Log */}
          {activeSection === 'communication' && commView === 'log' && (() => {
            // Merge audit changes + communication into one chronological feed.
            const epochOfMsg = (m: { id: string; timestamp: string }) => {
              const fromId = /^m-(\d+)/.exec(m.id)?.[1];
              if (fromId) return parseInt(fromId);
              const d = new Date(m.timestamp).getTime();
              return isNaN(d) ? 0 : d;
            };
            type Item =
              | { kind: 'audit'; t: number; id: string; user: string; action: string; fieldName?: string; oldValue?: string; newValue?: string; ts: string }
              | { kind: 'msg'; t: number; id: string; sender: string; message: string; isInternal: boolean; ts: string };
            const items: Item[] = [
              ...auditLog.map((l) => ({ kind: 'audit' as const, t: new Date(l.timestamp).getTime() || 0, id: l.id, user: l.user, action: l.action, fieldName: l.fieldName, oldValue: l.oldValue, newValue: l.newValue, ts: l.timestamp })),
              ...project.chatHistory.map((m) => ({ kind: 'msg' as const, t: epochOfMsg(m), id: m.id, sender: m.sender, message: m.message, isInternal: m.isInternal, ts: m.timestamp })),
            ].sort((a, b) => b.t - a.t);

            const fmtTime = (it: Item) => {
              if (it.kind === 'msg') return it.ts;
              const d = new Date(it.ts);
              return isNaN(d.getTime()) ? it.ts : d.toLocaleString('he-IL');
            };

            const exportFeed = () =>
              downloadCsv(`יומן-${project.id}`, ['מתי', 'מי', 'סוג', 'תיאור'], items.map((it) =>
                it.kind === 'audit'
                  ? [fmtTime(it), it.user, it.action, it.fieldName ? `${it.fieldName}: ${it.oldValue ?? '–'} → ${it.newValue ?? '–'}` : 'פעולה']
                  : [fmtTime(it), it.sender, it.isInternal ? 'הודעה פנימית' : 'WhatsApp', it.message]
              ));

            return (
              <div className="max-w-3xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold">יומן פעילות</h2>
                    <p className="text-sm text-muted-foreground">כל הסיפור של התיק — שינויים ותקשורת, לפי סדר זמנים</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1" onClick={exportFeed} disabled={items.length === 0}>
                    <Download className="h-4 w-4" />
                    ייצוא
                  </Button>
                </div>

                {loadingAudit && items.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">טוען...</div>
                ) : items.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">עדיין לא נרשמה פעילות בתיק זה.</div>
                ) : (
                  <div className="space-y-1">
                    {items.map((it, index) => {
                      const isMsg = it.kind === 'msg';
                      const Icon = isMsg ? (it.isInternal ? MessageCircle : MessageSquare) : Edit2;
                      const tone = isMsg ? (it.isInternal ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600') : 'bg-muted text-muted-foreground';
                      return (
                        <div key={it.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="relative">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${tone}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            {index < items.length - 1 && (
                              <div className="absolute top-7 left-1/2 -translate-x-1/2 w-px h-[calc(100%-8px)] bg-border" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{isMsg ? it.sender : it.user}</span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {isMsg ? (it.isInternal ? 'הודעה פנימית' : 'WhatsApp') : it.action}
                                </Badge>
                              </div>
                              <span className="text-[11px] text-muted-foreground shrink-0">{fmtTime(it)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5 break-words">
                              {isMsg
                                ? it.message
                                : it.fieldName
                                ? `${it.fieldName}: ${it.oldValue ?? '–'} → ${it.newValue ?? '–'}`
                                : 'פעולה רשומה במערכת'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}
