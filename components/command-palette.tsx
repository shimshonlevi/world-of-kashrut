'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import type { Project } from '@/lib/types';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  FileText,
  Layers,
  BarChart3,
  Plus,
  FileBox,
  Building2,
  Plane,
  Settings,
} from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'דשבורד', icon: LayoutDashboard, path: '/?page=dashboard' },
  { id: 'projects', label: 'תיקים', icon: FolderKanban, path: '/?page=projects' },
  { id: 'clients', label: 'יבואנים', icon: Users, path: '/?page=clients' },
  { id: 'trips', label: 'נסיעות', icon: Plane, path: '/?page=trips' },
  { id: 'reports', label: 'דוחות', icon: FileText, path: '/?page=reports' },
  { id: 'templates', label: 'תבניות', icon: Layers, path: '/?page=templates', adminOnly: true },
  { id: 'analytics', label: 'ניתוחים', icon: BarChart3, path: '/?page=analytics', adminOnly: true },
  { id: 'settings', label: 'הגדרות', icon: Settings, path: '/?page=settings', adminOnly: true },
];

/**
 * Global command palette (Ctrl/Cmd-K). Self-contained: fetches projects and
 * navigates with the router, so it works on every authenticated page.
 */
export function CommandPalette() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  // Keyboard shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Load projects when first opened (and refresh on each open so it stays current)
  useEffect(() => {
    if (!open || !isAuthenticated) return;
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => {});
  }, [open, isAuthenticated]);

  // Unique importers derived from projects
  const importers = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const p of projects) {
      const e = map.get(p.importer) ?? { name: p.importer, count: 0 };
      e.count += 1;
      map.set(p.importer, e);
    }
    return [...map.values()];
  }, [projects]);

  if (!isAuthenticated) return null;

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="חיפוש מהיר" description="חפש תיק, יבואן או פעולה">
      <CommandInput placeholder="חפש תיק, יבואן, מדינה או פעולה…" />
      <CommandList>
        <CommandEmpty>לא נמצאו תוצאות.</CommandEmpty>

        <CommandGroup heading="פעולות מהירות">
          <CommandItem onSelect={() => go('/?page=dashboard&new=1')}>
            <Plus className="ml-2" />
            פרויקט חדש
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="ניווט">
          {NAV.filter((n) => !n.adminOnly || user?.role === 'admin').map((n) => (
            <CommandItem key={n.id} value={`nav ${n.label}`} onSelect={() => go(n.path)}>
              <n.icon className="ml-2" />
              {n.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="תיקים">
          {projects.map((p) => (
            <CommandItem
              key={p.id}
              value={`${p.projectName} ${p.importer} ${p.country} ${p.id}`}
              onSelect={() => go(`/case/${p.id}`)}
            >
              <FileBox className="ml-2 text-muted-foreground" />
              <span className="flex-1">{p.projectName}</span>
              <span className="text-xs text-muted-foreground">{p.importer}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="יבואנים">
          {importers.map((imp) => (
            <CommandItem
              key={imp.name}
              value={`importer ${imp.name}`}
              onSelect={() => go(`/?page=clients&q=${encodeURIComponent(imp.name)}`)}
            >
              <Building2 className="ml-2 text-muted-foreground" />
              <span className="flex-1">{imp.name}</span>
              <span className="text-xs text-muted-foreground">{imp.count} תיקים</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
