'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  NotificationRule,
  RecipientRole,
  EVENT_META,
  RECIPIENT_LABEL,
  DEFAULT_RULES,
  mergeRules,
} from '@/lib/notifications';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Bell } from 'lucide-react';

const ALL_RECIPIENTS: RecipientRole[] = ['responsible', 'supervisor', 'importer', 'manager'];
const LEAD_EVENTS = new Set(['deadline_approaching', 'awaiting_payment']);

export function NotificationSettings() {
  const { toast } = useToast();
  const [rules, setRules] = useState<NotificationRule[]>(DEFAULT_RULES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then((r) => r.json())
      .then((d) => setRules(mergeRules(d.value)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (event: string, patch: Partial<NotificationRule>) =>
    setRules((prev) => prev.map((r) => (r.event === event ? { ...r, ...patch } : r)));

  const toggleRecipient = (rule: NotificationRule, role: RecipientRole) => {
    const has = rule.recipients.includes(role);
    update(rule.event, { recipients: has ? rule.recipients.filter((x) => x !== role) : [...rule.recipients, role] });
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/settings/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: rules }),
    });
    setSaving(false);
    if (res.ok) toast({ title: 'נשמר', description: 'הגדרות ההתראות עודכנו' });
    else toast({ title: 'שגיאה', description: 'שמירה נכשלה', variant: 'destructive' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin ml-2" />טוען...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Bell className="h-4 w-4" />
          הגדר מתי לשלוח התראה ולמי. כרגע ההתראות מופיעות בתוך המערכת (מייל/וואטסאפ יתווספו בהמשך).
        </p>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          שמור הגדרות
        </Button>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => {
          const meta = EVENT_META[rule.event];
          return (
            <Card key={rule.event} className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={rule.enabled} onCheckedChange={(v) => update(rule.event, { enabled: v })} />
                    <span className="font-medium">{meta.label}</span>
                    <Badge
                      variant="outline"
                      className={
                        meta.urgency === 'high'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 text-[10px]'
                          : 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
                      }
                    >
                      {meta.urgency === 'high' ? 'דחוף' : 'בינוני'}
                    </Badge>
                  </div>
                  {LEAD_EVENTS.has(rule.event) && rule.enabled && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">סף ימים:</span>
                      <Input
                        type="number"
                        min={0}
                        value={rule.leadDays ?? 0}
                        onChange={(e) => update(rule.event, { leadDays: parseInt(e.target.value) || 0 })}
                        className="h-8 w-20"
                      />
                    </div>
                  )}
                </div>

                {rule.enabled && (
                  <div className="flex flex-wrap items-center gap-4 pr-10">
                    <span className="text-xs text-muted-foreground">נמענים:</span>
                    {ALL_RECIPIENTS.map((role) => (
                      <label key={role} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={rule.recipients.includes(role)} onCheckedChange={() => toggleRecipient(rule, role)} />
                        {RECIPIENT_LABEL[role]}
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
