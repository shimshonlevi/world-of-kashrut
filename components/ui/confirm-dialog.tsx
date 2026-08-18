'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  /** When set, the user must type this exact value to enable the confirm button. */
  requireType?: string;
}

type Resolver = (ok: boolean) => void;

const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(
  async () => false
);

/** Imperative, promise-based confirm — `if (!(await confirm({...}))) return;` */
export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState('');
  const resolver = useRef<Resolver | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    setTyped('');
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
    setTyped('');
  };

  const needType = opts?.requireType;
  const typeOk = !needType || typed.trim() === needType.trim();
  const destructive = opts?.variant === 'destructive';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!opts} onOpenChange={(o) => { if (!o) close(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                  destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                )}
              >
                {destructive ? <Trash2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </span>
              {opts?.title}
            </DialogTitle>
            {opts?.description && (
              <DialogDescription className="whitespace-pre-line pt-1 text-right">
                {opts.description}
              </DialogDescription>
            )}
          </DialogHeader>
          {needType && (
            <div className="py-1">
              <Input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && typeOk && close(true)}
                placeholder={needType}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)}>
              {opts?.cancelText || 'ביטול'}
            </Button>
            <Button
              variant={destructive ? 'destructive' : 'default'}
              disabled={!typeOk}
              onClick={() => close(true)}
            >
              {opts?.confirmText || 'אישור'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
