'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, KeyRound, Trash2, Loader2, Crown, User as UserIcon, ShieldAlert } from 'lucide-react';

interface ManagedUser {
  id: string;
  name: string;
  role: 'admin' | 'secretary';
  avatar: string;
}

export function UsersView() {
  const { toast } = useToast();
  const { user: me } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [pwTarget, setPwTarget] = useState<ManagedUser | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/users')
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => toast({ title: 'שגיאה', description: 'לא ניתן לטעון משתמשים', variant: 'destructive' }))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeRole = async (u: ManagedUser, role: 'admin' | 'secretary') => {
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
    const res = await fetch(`/api/users/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) { toast({ title: 'שגיאה', description: 'עדכון הרשאה נכשל', variant: 'destructive' }); load(); }
  };

  const remove = async (u: ManagedUser) => {
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
    if (res.ok) {
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast({ title: 'נמחק', description: `המשתמש ${u.name} הוסר` });
    } else {
      const e = await res.json().catch(() => ({}));
      toast({ title: 'שגיאה', description: e?.error || 'מחיקה נכשלה', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">ניהול משתמשים</h2>
          <p className="text-muted-foreground">{users.length} משתמשים · הוספה, הרשאות וסיסמאות</p>
        </div>
        <Button className="gap-2" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
          משתמש חדש
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin ml-2" />טוען...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <Card key={u.id} className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <Avatar className="h-11 w-11 border-2 border-primary/10">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">{u.avatar || u.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{u.name}{me?.id === u.id && <span className="text-xs text-muted-foreground"> (אני)</span>}</p>
                  <Badge variant="outline" className={u.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20 gap-1 mt-1' : 'gap-1 mt-1'}>
                    {u.role === 'admin' ? <Crown className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                    {u.role === 'admin' ? 'מנהל' : 'מזכירה'}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setPwTarget(u)} className="gap-2">
                      <KeyRound className="h-4 w-4" /> שנה סיסמה
                    </DropdownMenuItem>
                    {u.role === 'secretary' ? (
                      <DropdownMenuItem onClick={() => changeRole(u, 'admin')} className="gap-2">
                        <Crown className="h-4 w-4" /> הפוך למנהל
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => changeRole(u, 'secretary')} className="gap-2" disabled={me?.id === u.id}>
                        <UserIcon className="h-4 w-4" /> הפוך למזכירה
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => remove(u)} className="gap-2 text-destructive" disabled={me?.id === u.id}>
                      <Trash2 className="h-4 w-4" /> מחיקה
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {adding && <AddUserDialog onClose={() => setAdding(false)} onCreated={load} />}
      {pwTarget && <PasswordDialog user={pwTarget} onClose={() => setPwTarget(null)} />}
    </div>
  );
}

function AddUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'secretary'>('secretary');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password, role }),
    });
    setBusy(false);
    if (res.ok) {
      toast({ title: 'נוצר', description: `המשתמש ${name} נוסף` });
      onCreated();
      onClose();
    } else {
      const e = await res.json().catch(() => ({}));
      toast({ title: 'שגיאה', description: e?.error || 'יצירה נכשלה', variant: 'destructive' });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>משתמש חדש</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5"><Label>שם</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>סיסמה ראשונית</Label><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>הרשאה</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'secretary')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="secretary">מזכירה</SelectItem>
                <SelectItem value="admin">מנהל</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>ביטול</Button>
          <Button onClick={create} disabled={busy || !name.trim() || !password}>
            {busy && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}צור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ user, onClose }: { user: { id: string; name: string }; onClose: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      toast({ title: 'עודכן', description: `הסיסמה של ${user.name} שונתה` });
      onClose();
    } else {
      toast({ title: 'שגיאה', description: 'עדכון נכשל', variant: 'destructive' });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" /> שינוי סיסמה — {user.name}</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-1.5">
          <Label>סיסמה חדשה</Label>
          <Input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && password && save()} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>ביטול</Button>
          <Button onClick={save} disabled={busy || password.length < 3}>
            {busy && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
