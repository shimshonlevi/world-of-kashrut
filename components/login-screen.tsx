'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth-provider';
import { BrandMark } from '@/components/brand/logo';
import { User, Crown, ChevronLeft, ArrowRight, Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const userOptions: { name: string; icon: typeof User; tint: string; role: string; description: string }[] = [
  { name: 'נחמה', icon: User, tint: 'bg-rose-500/12 text-rose-600', role: 'מזכירה', description: 'צפייה בתיקים שבאחריותי' },
  { name: 'שירה', icon: User, tint: 'bg-sky-500/12 text-sky-600', role: 'מזכירה', description: 'צפייה בתיקים שבאחריותי' },
  { name: 'מנהל', icon: Crown, tint: 'bg-primary/12 text-primary', role: 'מנהל מערכת', description: 'גישה מלאה לכל התיקים והתבניות' },
];

export function LoginScreen() {
  const { login } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!selected || !password) return;
    setBusy(true);
    setError(null);
    const res = await login(selected, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'התחברות נכשלה');
      setPassword('');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background">
      <div className="pointer-events-none absolute -top-32 right-1/2 translate-x-1/2 h-[28rem] w-[28rem] rounded-full bg-gold/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <BrandMark className="h-20 w-20 rounded-2xl shadow-xl ring-1 ring-border/60 mb-5" />
          <h1 className="text-3xl font-bold tracking-tight">World of Kashrut</h1>
          <p className="text-muted-foreground mt-1.5">עולם הכשרות · מערכת ניהול תיקי כשרות</p>
        </div>

        <Card className="border-border/60 bg-card/90 backdrop-blur-sm elevated">
          <CardContent className="p-5">
            {!selected ? (
              <>
                <p className="text-sm text-muted-foreground text-center mb-3">בחר משתמש להתחברות</p>
                <div className="space-y-2.5">
                  {userOptions.map((u) => (
                    <button
                      key={u.name}
                      onClick={() => { setSelected(u.name); setError(null); }}
                      className="group w-full flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 text-right transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
                    >
                      <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', u.tint)}>
                        <u.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-lg leading-tight">{u.name}</div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground/70">{u.role}</span> · {u.description}
                        </div>
                      </div>
                      <ChevronLeft className="h-5 w-5 text-muted-foreground/50 transition-transform group-hover:-translate-x-1 group-hover:text-primary" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <button onClick={() => { setSelected(null); setPassword(''); setError(null); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                  <ArrowRight className="h-4 w-4" />
                  חזרה
                </button>
                <div className="text-center">
                  <p className="text-lg font-semibold">שלום, {selected}</p>
                  <p className="text-sm text-muted-foreground">הזן סיסמה כדי להתחבר</p>
                </div>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="סיסמה"
                    className="pr-9"
                  />
                </div>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                <Button className="w-full" onClick={submit} disabled={busy || !password}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                  התחבר
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">סיסמת ברירת מחדל לבדיקה: 1234</p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">World of Kashrut · ERP v1.0</p>
      </div>
    </div>
  );
}
