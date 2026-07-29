'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { calculateStats } from '@/lib/data';
import { applyCorePatchToStages } from '@/lib/templates';
import { myAwaitingReviewCount } from '@/lib/attention';
import type { Project, FilterState } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/app-layout';
import { KPICards } from '@/components/dashboard/kpi-cards';
import { ActionCenter } from '@/components/dashboard/action-center';
import { MessagesInbox } from '@/components/dashboard/messages-inbox';
import { ComingSoon } from '@/components/dashboard/coming-soon';
import { DashboardHero } from '@/components/dashboard/dashboard-hero';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { AdvancedProjectTable } from '@/components/dashboard/advanced-project-table';
import { QuickViewDrawer } from '@/components/dashboard/quick-view-drawer';
import { NewProjectWizard } from '@/components/dashboard/new-project-wizard';
import { NotificationCenter } from '@/components/dashboard/notification-center';
import { AIChatWidget } from '@/components/ai-chat-widget';
import { ManagerAnalytics } from '@/components/dashboard/manager-analytics';
import { LoginScreen } from '@/components/login-screen';
import { useAuth } from '@/components/auth-provider';
import { ClientsView } from '@/components/views/clients-view';
import { ReportsView } from '@/components/views/reports-view';
import { TripsView } from '@/components/views/trips-view';
import { SupervisorsView } from '@/components/views/supervisors-view';
import { ApprovalsView } from '@/components/views/approvals-view';
import { DocumentsView } from '@/components/views/documents-view';
import { ProjectsView } from '@/components/views/projects-view';
import { TemplatesView } from '@/components/views/templates-view';
import { SettingsView } from '@/components/views/settings-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Sync page / wizard from URL params (enables deep links + command palette nav).
  useEffect(() => {
    const page = searchParams.get('page');
    if (page) setCurrentPage(page);
    if (searchParams.get('new') === '1') setIsNewProjectOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingProjects(true);
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => setProjects(data.projects || []))
      .catch((error) => {
        console.error('Failed to load projects', error);
        toast({ title: 'שגיאה', description: 'לא ניתן לטעון את הפרויקטים', variant: 'destructive' });
      })
      .finally(() => setLoadingProjects(false));
  }, [isAuthenticated, toast]);

  // Get user's projects - secretaries only see their own, admin sees all
  const userProjects = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') return projects;
    return projects.filter((p) => p.responsible === user.name);
  }, [projects, user]);

  // Calculate stats based on user's projects
  const stats = useMemo(() => {
    const baseStats = calculateStats(userProjects);
    return {
      ...baseStats,
      totalProjects: userProjects.filter((p) => p.status !== 'הסתיים').length,
      completedThisMonth: userProjects.filter((p) => p.status === 'הסתיים').length,
    };
  }, [userProjects]);

  // Items awaiting THIS user's approval (drives the hero chip → personal inbox).
  const pendingApprovals = useMemo(
    () => projects.reduce((sum, p) => sum + myAwaitingReviewCount(p, user?.name), 0),
    [projects, user?.name]
  );

  // Count total alerts
  const totalAlerts = useMemo(() => {
    return stats.urgentTasks + stats.clientsAwaitingResponse;
  }, [stats]);

  // While restoring the session, avoid flashing the login screen.
  if (authLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setIsQuickViewOpen(true);
  };

  const handleOpenFullCase = (project: Project) => {
    router.push(`/case/${project.id}`);
  };

  const handleCreateProject = async (data: any) => {
    // Template-first: the server instantiates the stages, requirements, enabled
    // tools and current stage from the chosen template. We just pass core details.
    const newProject = {
      responsible: data.responsible || user?.name || 'מנהל',
      projectName: data.projectName || 'פרויקט חדש',
      importer: data.importer || '',
      importerPhone: data.importerPhone || '',
      importerEmail: data.importerEmail || '',
      country: data.country || '',
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate || new Date().toISOString().split('T')[0],
      kosherBody: data.kosherBody || '',
      supervisor: data.supervisor || '',
      supervisorPhone: data.supervisorPhone || '',
      factoryName: data.factoryName || '',
      factoryAddress: '',
      status: 'בתהליך',
      currentStage: '',
      templateId: data.templateId,
      reportReceived: false,
      sentToChaim: false,
      paid: false,
      profitDaily: 0,
      kosherFee: 0,
      submissionFee: 0,
      quotedPrice: 0,
      actualExpenses: 0,
      driveLink: '',
      timeline: [],
      documents: [],
      chatHistory: [],
      flight: { status: 'not_booked' },
      hotel: { status: 'not_booked' },
      needsFlightBooking: false,
      clientAwaitingResponse: false,
    };

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
      if (!res.ok) throw new Error('Failed to create project');
      const result = await res.json();
      setProjects((prev) => [result.project, ...prev]);
      toast({ title: 'נוצר תיק חדש', description: `הפרויקט ${result.project.projectName} נוצר בהצלחה` });
      router.push(`/case/${result.project.id}`);
    } catch (error) {
      console.error(error);
      toast({ title: 'שגיאה', description: 'לא ניתן ליצור את הפרויקט', variant: 'destructive' });
    } finally {
      setIsNewProjectOpen(false);
    }
  };

  // Inline-edit a project from the table (status, owner, paid, report…) and persist.
  // Toggling a bound core flag (paid/reportReceived/sentToChaim) also syncs the
  // matching stage step, so the workflow stays a single source of truth.
  const handleUpdateProject = async (id: string, patch: Partial<Project>) => {
    const target = projects.find((p) => p.id === id);
    const fullPatch: Partial<Project> = { ...patch };
    const bindKeys = ['reportReceived', 'sentToChaim', 'sentToKosherBody', 'certReceived', 'submittedToRabbinate', 'submittedForPayment', 'paid'];
    if (target?.stages && bindKeys.some((k) => k in patch)) {
      fullPatch.stages = applyCorePatchToStages(target.stages, patch as Record<string, unknown>);
    }
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...fullPatch } : p))); // optimistic
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fullPatch, performedBy: user?.name || 'מערכת' }),
      });
      if (!res.ok) throw new Error('update failed');
      const data = await res.json();
      setProjects((prev) => prev.map((p) => (p.id === id ? data.project : p)));
    } catch (error) {
      console.error(error);
      toast({ title: 'שגיאה', description: 'העדכון לא נשמר', variant: 'destructive' });
      // reload to revert the optimistic change
      fetch('/api/projects')
        .then((r) => r.json())
        .then((d) => setProjects(d.projects || []))
        .catch(() => {});
    }
  };

  // Archive a case (reversible) — drops it from the active lists.
  const handleArchiveProject = async (project: Project) => {
    if (!confirm(`להעביר את "${project.projectName}" לארכיון? ניתן לשחזר בהמשך.`)) return;
    setProjects((prev) => prev.filter((p) => p.id !== project.id)); // optimistic
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      });
      if (!res.ok) throw new Error('failed');
      toast({ title: 'הועבר לארכיון', description: project.projectName });
    } catch {
      toast({ title: 'שגיאה', description: 'העברה לארכיון נכשלה', variant: 'destructive' });
      fetch('/api/projects').then((r) => r.json()).then((d) => setProjects(d.projects || [])).catch(() => {});
    }
  };

  // Permanently delete a case (admin only) — requires typing the case name.
  const handleDeleteProject = async (project: Project) => {
    const typed = window.prompt(`מחיקה לצמיתות תמחק את התיק, המסמכים והיומן — ללא שחזור.\nלאישור, הקלד את שם התיק:\n"${project.projectName}"`);
    if (typed == null) return;
    if (typed.trim() !== project.projectName.trim()) {
      toast({ title: 'השם לא תואם', description: 'המחיקה בוטלה', variant: 'destructive' });
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== project.id)); // optimistic
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('failed');
      toast({ title: 'התיק נמחק לצמיתות', description: project.projectName });
    } catch {
      toast({ title: 'שגיאה', description: 'המחיקה נכשלה', variant: 'destructive' });
      fetch('/api/projects').then((r) => r.json()).then((d) => setProjects(d.projects || [])).catch(() => {});
    }
  };

  // Archive several cases at once (single confirmation).
  const handleBulkArchive = async (list: Project[]) => {
    if (list.length === 0) return;
    if (!confirm(`להעביר ${list.length} תיקים לארכיון? ניתן לשחזר בהמשך.`)) return;
    const ids = new Set(list.map((p) => p.id));
    setProjects((prev) => prev.filter((p) => !ids.has(p.id))); // optimistic
    try {
      await Promise.all(
        list.map((p) =>
          fetch(`/api/projects/${p.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archived: true }),
          })
        )
      );
      toast({ title: 'הועבר לארכיון', description: `${list.length} תיקים` });
    } catch {
      toast({ title: 'שגיאה', description: 'חלק מהתיקים לא אורכבו', variant: 'destructive' });
      fetch('/api/projects').then((r) => r.json()).then((d) => setProjects(d.projects || [])).catch(() => {});
    }
  };

  const handleToggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (!isNotificationsOpen) {
      setIsAIOpen(false);
    }
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      onToggleAI={() => {
        setIsAIOpen(!isAIOpen);
        if (!isAIOpen) {
          setIsNotificationsOpen(false);
        }
      }}
      onNewProject={() => {
        console.log('[v0] Opening new project wizard');
        setIsNewProjectOpen(true);
      }}
      alertCount={totalAlerts}
      onToggleNotifications={handleToggleNotifications}
    >
      <div className="max-w-7xl mx-auto space-y-4 fade-up">
        {/* Render different content based on current page */}
        {currentPage === 'dashboard' && (
          <>
            {/* Welcome hero & Tabs */}
            <DashboardHero
              name={user?.name}
              activeProjects={userProjects.length}
              urgentTasks={stats.urgentTasks}
              pendingApprovals={pendingApprovals}
              onApprovalsClick={() => setCurrentPage('approvals')}
            >
              {user?.role === 'admin' && (
                <Tabs defaultValue="dashboard" className="w-auto">
                  <TabsList className="bg-background/70 backdrop-blur border shadow-sm">
                    <TabsTrigger
                      value="dashboard"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      דשבורד
                    </TabsTrigger>
                    <TabsTrigger
                      value="analytics"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
                    >
                      <BarChart3 className="h-4 w-4" />
                      ניתוחים
                      <Badge variant="secondary" className="h-5 text-[10px]">
                        חדש
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </DashboardHero>

            {loadingProjects ? (
              <DashboardSkeleton />
            ) : (
            <>
            {/* KPI Cards */}
            <KPICards stats={stats} />

            {/* Daily worklist + recent messages, side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ActionCenter projects={userProjects} onOpenCase={(id) => router.push(`/case/${id}`)} />
              </div>
              <MessagesInbox projects={userProjects} />
            </div>

            {/* Main Content */}
            {user?.role === 'admin' ? (
              <Tabs defaultValue="dashboard">
                <TabsContent value="dashboard" className="mt-0">
                  <AdvancedProjectTable
                    projects={userProjects}
                    onSelectProject={handleSelectProject}
                    onOpenFullCase={handleOpenFullCase}
                    onUpdateProject={handleUpdateProject}
                    onArchiveProject={handleArchiveProject}
                    onDeleteProject={handleDeleteProject}
                    onBulkArchive={handleBulkArchive}
                    isAdmin={user?.role === 'admin'}
                    selectedProjectId={selectedProject?.id}
                  />
                </TabsContent>
                <TabsContent value="analytics" className="mt-0">
                  <ManagerAnalytics projects={projects} />
                </TabsContent>
              </Tabs>
            ) : (
              <AdvancedProjectTable
                projects={userProjects}
                onSelectProject={handleSelectProject}
                onOpenFullCase={handleOpenFullCase}
                onUpdateProject={handleUpdateProject}
                selectedProjectId={selectedProject?.id}
              />
            )}

            {/* Roadmap showcase — communicates the vision in demos */}
            <ComingSoon />
            </>
            )}
          </>
        )}

        {currentPage === 'projects' && (
          <ProjectsView
            projects={userProjects}
            onSelectProject={handleSelectProject}
            onOpenFullCase={handleOpenFullCase}
            onUpdateProject={handleUpdateProject}
            onArchiveProject={handleArchiveProject}
            onDeleteProject={handleDeleteProject}
            onBulkArchive={handleBulkArchive}
            isAdmin={user?.role === 'admin'}
          />
        )}

        {currentPage === 'clients' && (
          <ClientsView projects={userProjects} />
        )}

        {currentPage === 'supervisors' && (
          <SupervisorsView projects={userProjects} />
        )}

        {currentPage === 'trips' && (
          <TripsView projects={userProjects} />
        )}

        {currentPage === 'approvals' && (
          <ApprovalsView projects={projects} onUpdate={handleUpdateProject} />
        )}

        {currentPage === 'documents' && (
          <DocumentsView projects={userProjects} />
        )}

        {currentPage === 'reports' && (
          <ReportsView projects={userProjects} />
        )}

        {currentPage === 'analytics' && user?.role === 'admin' && (
          <ManagerAnalytics projects={projects} />
        )}

        {currentPage === 'templates' && user?.role === 'admin' && (
          <TemplatesView />
        )}

        {currentPage === 'settings' && user?.role === 'admin' && (
          <SettingsView />
        )}
      </div>

      {/* Notification Center */}
      <NotificationCenter
        projects={userProjects}
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onSelectProject={(project) => {
          handleSelectProject(project);
          setIsNotificationsOpen(false);
        }}
      />

      {/* Quick View Drawer */}
      <QuickViewDrawer
        project={selectedProject}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />

      {/* New Project Wizard */}
      <NewProjectWizard
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreateProject={handleCreateProject}
        defaultResponsible={user?.name}
      />

      {/* AI Chat Widget — the single AI surface; header AI button controls it */}
      <AIChatWidget open={isAIOpen} onOpenChange={setIsAIOpen} />
    </AppLayout>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DashboardPage />
    </Suspense>
  );
}
