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
  { id: 'trips', label: 'נסיעות', icon: Plane, description: 'לוגיסטיקה וטיסות' },
  { id: 'approvals', label: 'אישורים', icon: BadgeCheck, description: 'אישורי מסמכים וגורמים' },
  { id: 'documents', label: 'מסמכים', icon: Files, description: 'כל המסמכים לפי תיקים' },
  { id: 'reports', label: 'דוחות', icon: FileText, description: 'דוחות ומסמכים' },
  { id: 'templates', label: 'תבניות', icon: Layers, description: 'ניהול תבניות תהליך', adminOnly: true },
  { id: 'analytics', label: 'ניתוחים', icon: BarChart3, description: 'סטטיסטיקות', adminOnly: true },
  { id: 'settings', label: 'הגדרות', icon: Settings, description: 'משתמשים, התראות וכלים', adminOnly: true },
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
      <div className="p-5 border-b border-border/50">
        <BrandLockup size="md" />
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="חיפוש תיק, יבואן..." 
            className="pr-9 bg-muted/50 border-0 focus-visible:ring-1 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          תפריט ראשי
        </p>
        {navItems.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') return null;
          const isActive = currentPage === item.id;
          return (
            <TooltipProvider key={item.id} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleNavClick(item.id)}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5', isActive && 'drop-shadow-sm')} />
                    <span className="flex-1 text-right">{item.label}</span>
                    {isActive && <ChevronRight className="h-4 w-4 animate-in slide-in-from-right-2" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {item.description}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </nav>

      {/* Quick Stats */}
      <div className="p-4 border-t border-border/50">
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              שעה נוכחית
            </span>
            <span className="font-mono font-semibold">{currentTime}</span>
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
      <div className="p-4 border-t border-border/50">
        <Button 
          onClick={onNewProject} 
          className="w-full gap-2 shadow-md h-11"
          size="lg"
        >
          <Plus className="h-4 w-4" />
          פרויקט חדש
        </Button>
      </div>

      {/* User */}
      <div className="p-4 border-t border-border/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-muted/80 transition-colors text-right group">
              <Avatar className="h-10 w-10 border-2 border-primary/20 group-hover:border-primary/40 transition-colors">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
                  {user?.avatar || 'מש'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {user?.role === 'admin' ? 'מנהל מערכת' : 'מזכירה'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
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
