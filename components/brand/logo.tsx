import { cn } from '@/lib/utils';

/** The gold "WK" monogram badge. Swap /logo.svg for the official PNG anytime. */
export function BrandMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.svg"
      alt="World of Kashrut"
      className={cn('select-none', className)}
      draggable={false}
    />
  );
}

interface BrandLockupProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Show the Hebrew sub-line under the wordmark. */
  subtitle?: boolean;
}

const SIZES = {
  sm: { mark: 'h-8 w-8', title: 'text-sm', sub: 'text-[10px]' },
  md: { mark: 'h-10 w-10', title: 'text-base', sub: 'text-[11px]' },
  lg: { mark: 'h-16 w-16', title: 'text-2xl', sub: 'text-sm' },
};

export function BrandLockup({ className, size = 'md', subtitle = true }: BrandLockupProps) {
  const s = SIZES[size];
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <BrandMark className={cn(s.mark, 'rounded-xl shadow-sm ring-1 ring-border/60')} />
      <div className="leading-tight">
        <h1 className={cn('font-bold tracking-tight text-current', s.title)}>World of Kashrut</h1>
        {subtitle && <p className={cn('opacity-60', s.sub)}>עולם הכשרות · ניהול תיקי כשרות</p>}
      </div>
    </div>
  );
}
