'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/lib/types';
import { daysUntil } from '@/lib/dates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Hotel, MapPin, User, CalendarDays, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TripsViewProps {
  projects: Project[];
}

const bookingBadge = (status?: string) => {
  switch (status) {
    case 'confirmed':
      return { label: 'מאושר', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'pending':
      return { label: 'בהמתנה', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    default:
      return { label: 'לא הוזמן', cls: 'bg-red-50 text-red-700 border-red-200' };
  }
};

export function TripsView({ projects }: TripsViewProps) {
  const router = useRouter();

  const trips = useMemo(() => {
    return projects
      .filter((p) => p.status !== 'הסתיים' && (p.needsFlightBooking || p.flight?.departureDate || p.flight?.status !== 'not_booked'))
      .map((p) => ({
        project: p,
        departure: p.flight?.departureDate || '',
        days: daysUntil(p.flight?.departureDate),
        needsBooking: p.flight?.status === 'not_booked' || p.hotel?.status === 'not_booked',
      }))
      .sort((a, b) => {
        // unbooked first, then by soonest departure
        if (a.needsBooking !== b.needsBooking) return a.needsBooking ? -1 : 1;
        if (!a.departure) return 1;
        if (!b.departure) return -1;
        return a.departure.localeCompare(b.departure);
      });
  }, [projects]);

  const unbooked = trips.filter((t) => t.needsBooking).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">נסיעות ולוגיסטיקה</h2>
          <p className="text-muted-foreground">
            {trips.length} נסיעות פעילות{unbooked > 0 ? ` · ${unbooked} דורשות הזמנה` : ''}
          </p>
        </div>
        {unbooked > 0 && (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1.5 px-3 py-1.5">
            <AlertTriangle className="h-4 w-4" />
            {unbooked} נסיעות ללא הזמנה
          </Badge>
        )}
      </div>

      {trips.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Plane className="h-10 w-10 mx-auto mb-3 opacity-40" />
            אין נסיעות פעילות כרגע.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {trips.map(({ project: p, days, needsBooking }) => {
            const flight = bookingBadge(p.flight?.status);
            const hotel = bookingBadge(p.hotel?.status);
            return (
              <Card key={p.id} className={cn('border-border/60 elevated transition-shadow hover:shadow-lg', needsBooking && 'border-r-4 border-r-red-400')}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{p.projectName}</CardTitle>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.country}</span>
                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{p.supervisor}</span>
                      </div>
                    </div>
                    {days !== null && (
                      <Badge
                        variant="outline"
                        className={
                          days < 0
                            ? 'bg-muted text-muted-foreground'
                            : days <= 7
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }
                      >
                        <CalendarDays className="h-3 w-3 ml-1" />
                        {days < 0 ? 'יצא לדרך' : days === 0 ? 'יוצא היום' : `בעוד ${days} ימים`}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-medium"><Plane className="h-4 w-4 text-sky-600" /> טיסה</span>
                        <Badge variant="outline" className={cn('text-[10px]', flight.cls)}>{flight.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.flight?.airline || '—'} {p.flight?.flightNumber ? `· ${p.flight.flightNumber}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.flight?.departureDate ? `${p.flight.departureDate} → ${p.flight.arrivalDate || ''}` : 'ללא תאריכים'}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-medium"><Hotel className="h-4 w-4 text-violet-600" /> מלון</span>
                        <Badge variant="outline" className={cn('text-[10px]', hotel.cls)}>{hotel.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.hotel?.hotelName || '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.hotel?.checkIn ? `${p.hotel.checkIn} → ${p.hotel.checkOut || ''}` : 'ללא תאריכים'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {needsBooking ? (
                        <><Clock className="h-3.5 w-3.5 text-red-500" /> דורש הזמנה</>
                      ) : (
                        <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> מסודר</>
                      )}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/case/${p.id}`)}>
                      פתח תיק
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
