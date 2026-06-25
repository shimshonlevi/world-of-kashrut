'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, ScanText, PenLine, Users, Calculator, CalendarDays, Sparkles } from 'lucide-react';

const UPCOMING = [
  { icon: MessageSquare, title: 'אוטומציית WhatsApp', desc: 'שליחת בקשות ותזכורות למשגיח/יבואן אוטומטית לפי כללי ההתראות.' },
  { icon: ScanText, title: 'קריאת מסמכים חכמה (AI)', desc: 'העלאת דו״ח/תעודה — והמערכת מחלצת תאריכים, אסמכתאות ופרטים וממלאת לבד.' },
  { icon: PenLine, title: 'חתימה דיגיטלית', desc: 'חתימה על אישורים ותעודות ישירות במערכת.' },
  { icon: Users, title: 'פורטל יבואן / משגיח', desc: 'גישה מוגבלת ללקוח ולמשגיח להעלאת מסמכים ומעקב סטטוס.' },
  { icon: Calculator, title: 'חיבור הנהלת חשבונות', desc: 'חיוב אוטומטי והפקת חשבוניות בסיום תיק.' },
  { icon: CalendarDays, title: 'לוח שנה לייצורים ונסיעות', desc: 'תצוגת לוח-שנה של מועדי ייצור, טיסות ודדליינים.' },
];

export function ComingSoon() {
  const { toast } = useToast();
  return (
    <Card className="border-border/60 elevated overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <Sparkles className="h-4 w-4" />
          </span>
          בקרוב במערכת
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">מפת דרכים</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {UPCOMING.map((f) => (
            <button
              key={f.title}
              onClick={() => toast({ title: `🚀 ${f.title}`, description: `בפיתוח — ${f.desc}` })}
              className="group text-right rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-4 w-4" />
                </span>
                <span className="font-medium text-sm">{f.title}</span>
                <Badge variant="secondary" className="text-[9px] mr-auto">בקרוב</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
