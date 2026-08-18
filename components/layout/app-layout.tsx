'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Shield,
  LayoutDashboard,
  FolderKanban,
  Users,
  FileText,
  Settings,
  LogOut,
  Sun,
  Moon,
  Bell,
  Sparkles,
  Plus,
  ChevronRight,
  ChevronDown,
  Search,
  BarChart3,
  Menu,
  X,
  Clock,
  AlertTriangle,
  Layers,
  Plane,
  ShieldCheck,
  BadgeCheck,
  Files,
  Award,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/auth-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BrandMark, BrandLockup } from '@/components/brand/logo';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
  onPageChange?: (page: string) => void;
  onToggleAI?: () => void;
  onNewProject?: () => void;
  alertCount?: number;
  onToggleNotifications?: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'דשבורד', icon: LayoutDashboard, description: 'סקירה כללית' },
  { id: 'projects', label: 'תיקים', icon: FolderKanban, description: 'ניהול תיקים' },
  { id: 'clients', label: 'יבואנים', icon: Users, description: 'רשימת לקוחות' },
  { id: 'supervisors', label: 'משגיחים', icon: ShieldCheck, description: 'רשימת משגיחים ולו״ז' },
  { id: 'kosher-bodies', label: 'גופי כשרות', icon: Award, description: 'ניהול גופי הכשרות' },
  { id: 'trips', label: 'נסיעות', icon: Plane, description: 'לוגיסטיקה וטיסות' },
  { id: 'approvals', label: 'אישורים', icon: BadgeCheck, description: 'אישורי מסמכים וגורמים' },
  { id: 'documents', label: 'מסמכים', icon: Files, description: 'כל המסמכים לפי תיקים' },
  { id: 'reports', label: 'דוחות', icon: FileText, description: 'דוחות ומסמכים' },
  { id: 'templates', label: 'תבניות', icon: Layers, description: 'ניהול תבניות תהליך', adminOnly: true },
  { id: 'analytics', label: 'ניתוחים', icon: BarChart3, description: 'סטטיסטיקות', adminOnly: true },
  { id: 'settings', label: 'הגדרות', icon: Settings, description: 'משתמשים, התראות וכלים', adminOnly: true },
];

// Grouped like a real CRM console: daily work → the directory of entities →
// setup/admin. Labels give the sidebar clear zones instead of a flat list.
const navGroups: { label: string | null; ids: string[] }[] = [
  { label: null, ids: ['dashboard'] },
  { label: 'עבודה שוטפת', ids: ['projects', 'approvals', 'documents', 'trips', 'reports'] },
  { label: 'אנשים וגופים', ids: ['clients', 'supervisors', 'kosher-bodies'] },
  { label: 'ניהול', ids: ['templates', 'analytics', 'settings'] },
];

export function AppLayout({
  children,
  currentPage = 'dashboard',
  onPageChange,
  onToggleAI,
  onNewProject,
  alertCount = 0,
  onToggleNotifications,
}: AppLayoutProps) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  // At-a-glance counts next to nav items (like a real CRM console).
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const grab = (url: string, key: string, field: string) =>
      fetch(url).then((r) => r.json()).then((d) => ({ key, n: (d[field] || []).length })).catch(() => ({ key, n: 0 }));
    Promise.all([
      grab('/api/projects', 'projects', 'projects'),
      grab('/api/importers', 'clients', 'importers'),
      grab('/api/supervisors', 'supervisors', 'supervisors'),
      grab('/api/kosher-bodies', 'kosher-bodies', 'kosherBodies'),
      grab('/api/templates', 'templates', 'templates'),
    ]).then((res) => setCounts(Object.fromEntries(res.map((r) => [r.key, r.n]))));
  }, []);

  // Collapsible nav groups (accordion). Persisted, and the group holding the
  // active page is always kept open so the current item never hides.
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wok_nav_collapsed');
      if (saved) setCollapsedGroups(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);
  const toggleGroup = (label: string) =>
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        localStorage.setItem('wok_nav_collapsed', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const changeOwnPassword = async () => {
    if (!user?.id || newPw.length < 3) return;
    setSavingPw(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPw }),
    });
    setSavingPw(false);
    if (res.ok) {
      toast({ title: 'הסיסמה עודכנה', description: 'הסיסמה החדשה נשמרה' });
      setPwOpen(false);
      setNewPw('');
    } else {
      toast({ title: 'שגיאה', description: 'עדכון הסיסמה נכשל', variant: 'destructive' });
    }
  };

  // Update time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = (pageId: string) => {
    if (onPageChange) {
      onPageChange(pageId);
    }
    setIsMobileMenuOpen(false);
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <BrandLockup size="md" />
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
          <Input
            placeholder="חיפוש תיק, יבואן..."
            className="pr-9 h-9 bg-sidebar-accent/60 border-0 text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-1 focus-visible:ring-sidebar-ring"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Navigation — grouped into clear zones */}
      <nav className="flex-1 min-h-0 px-3 pb-2 overflow-y-auto">
        {navGroups.map((group, gi) => {
          const items = group.ids
            .map((id) => navItems.find((n) => n.id === id))
            .filter((n): n is (typeof navItems)[number] => !!n && (!n.adminOnly || user?.role === 'admin'));
          if (items.length === 0) return null;
          // A group is open unless the user collapsed it — but if it holds the
          // active page, force it open so the current item is never hidden.
          const holdsActive = items.some((it) => it.id === currentPage);
          const isOpen = group.label ? !collapsedGroups[group.label] || holdsActive : true;
          const groupCount = items.reduce((sum, it) => sum + (counts[it.id] || 0), 0);
          return (
            <div key={group.label ?? `g${gi}`} className={cn(gi === 0 ? 'pt-1' : 'pt-3')}>
              {group.label && (
                <button
                  onClick={() => toggleGroup(group.label!)}
                  className="group/hdr flex items-center gap-1.5 w-full px-3 py-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-sidebar-foreground/40 transition-transform',
                      !isOpen && '-rotate-90'
                    )}
                  />
                  <span className="text-[10.5px] font-semibold text-sidebar-foreground/45 uppercase tracking-wider">
                    {group.label}
                  </span>
                  {!isOpen && groupCount > 0 && (
                    <span className="mr-auto text-[10.5px] tabular-nums text-sidebar-foreground/40">{groupCount}</span>
                  )}
                </button>
              )}
              <div className={cn('space-y-0.5 overflow-hidden transition-all', group.label && !isOpen ? 'max-h-0' : 'max-h-[600px] mt-0.5')}>
                {items.map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <TooltipProvider key={item.id} delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleNavClick(item.id)}
                            className={cn(
                              'relative flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                            )}
                          >
                            {isActive && <span className="absolute right-0 h-5 w-0.5 rounded-l bg-sidebar-primary" />}
                            <item.icon className="h-[18px] w-[18px]" />
                            <span className="flex-1 text-right">{item.label}</span>
                            {counts[item.id] != null && counts[item.id] > 0 && (
                              <span className={cn('text-[11px] tabular-nums rounded px-1.5 py-0.5', isActive ? 'bg-sidebar-primary/25 text-sidebar-accent-foreground' : 'text-sidebar-foreground/45')}>
                                {counts[item.id]}
                              </span>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          {item.description}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Quick Stats */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="bg-sidebar-accent/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-sidebar-foreground/60 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              שעה נוכחית
            </span>
            <span className="font-mono font-semibold text-sidebar-foreground">{currentTime}</span>
          </div>
          {alertCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                התראות
              </span>
              <Badge variant="destructive" className="h-5 text-[10px]">{alertCount}</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t border-sidebar-border">
        <Button onClick={onNewProject} className="w-full gap-2 h-10">
          <Plus className="h-4 w-4" />
          פרויקט חדש
        </Button>
      </div>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-sidebar-accent/60 transition-colors text-right group">
              <Avatar className="h-9 w-9 border border-sidebar-border">
                <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-foreground font-semibold text-sm">
                  {user?.avatar || 'מש'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-sidebar-foreground">{user?.name}</p>
                <p className="text-[11px] text-sidebar-foreground/55">
                  {user?.role === 'admin' ? 'מנהל מערכת' : 'מזכירה'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-sidebar-foreground/50 rotate-90" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.role === 'admin' ? 'מנהל מערכת' : 'מזכירה'}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" onSelect={() => setPwOpen(true)}>
              <KeyRound className="h-4 w-4" />
              שנה סיסמה
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive gap-2">
              <LogOut className="h-4 w-4" />
              התנתקות
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-l bg-sidebar text-sidebar-foreground h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="right" className="w-72 p-0">
          <div className="flex flex-col h-full">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Bar */}
        <header className="h-16 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-2">
              <BrandMark className="h-8 w-8 rounded-lg" />
              <span className="font-bold text-sm">World of Kashrut</span>
            </div>
            
            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">ראשי</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
              <span className="font-medium">
                {navItems.find(item => item.id === currentPage)?.label || 'דשבורד'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* AI Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onToggleAI}
                    className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 h-9"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">עוזר AI</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>שאל את העוזר החכם</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Notifications */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative h-9 w-9"
                    onClick={onToggleNotifications}
                  >
                    <Bell className="h-5 w-5" />
                    {alertCount > 0 && (
                      <span className="absolute -top-0.5 -left-0.5 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center animate-pulse">
                        {alertCount}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>התראות ({alertCount})</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Theme Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="h-9 w-9"
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-5 w-5" />
                    ) : (
                      <Moon className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Mobile User Avatar */}
            <div className="lg:hidden">
              <Avatar className="h-8 w-8 border-2 border-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-semibold">
                  {user?.avatar || 'מש'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 bg-muted/30">
          {children}
        </main>
      </div>

      {/* Change own password */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              שינוי סיסמה
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-1.5">
            <Label>סיסמה חדשה</Label>
            <Input
              type="password"
              autoFocus
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newPw.length >= 3 && changeOwnPassword()}
              placeholder="לפחות 3 תווים"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)} disabled={savingPw}>ביטול</Button>
            <Button onClick={changeOwnPassword} disabled={savingPw || newPw.length < 3}>
              {savingPw && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
