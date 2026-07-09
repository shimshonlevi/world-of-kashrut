'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Send, MessageSquare, Mail, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StoredDocument } from '@/lib/types';

interface DocumentShareMenuProps {
  doc: StoredDocument;
  importerPhone?: string | null;
  importerEmail?: string | null;
  supervisorPhone?: string | null;
}

/** Share a stored document to the importer/supervisor via WhatsApp, email, or a copied link. */
export function DocumentShareMenu({ doc, importerPhone, importerEmail, supervisorPhone }: DocumentShareMenuProps) {
  const { toast } = useToast();
  const text = `${doc.originalName}\n${doc.url}`;

  const whatsapp = (phone?: string | null) =>
    window.open(
      `https://wa.me/${(phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener'
    );

  const email = () =>
    window.open(
      `mailto:${importerEmail || ''}?subject=${encodeURIComponent(doc.originalName)}&body=${encodeURIComponent(doc.url)}`
    );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(doc.url);
      toast({ title: 'הקישור הועתק', description: doc.originalName });
    } catch {
      toast({ title: 'לא ניתן להעתיק', variant: 'destructive' });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="שלח מסמך">
          <Send className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {importerPhone && (
          <DropdownMenuItem onClick={() => whatsapp(importerPhone)}>
            <MessageSquare className="h-4 w-4 ml-2 text-emerald-600" />
            שלח ליבואן ב-WhatsApp
          </DropdownMenuItem>
        )}
        {supervisorPhone && (
          <DropdownMenuItem onClick={() => whatsapp(supervisorPhone)}>
            <MessageSquare className="h-4 w-4 ml-2 text-emerald-600" />
            שלח למשגיח ב-WhatsApp
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => whatsapp()}>
          <MessageSquare className="h-4 w-4 ml-2" />
          שלח ב-WhatsApp…
        </DropdownMenuItem>
        {importerEmail && (
          <DropdownMenuItem onClick={email}>
            <Mail className="h-4 w-4 ml-2 text-amber-600" />
            שלח במייל ליבואן
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copy}>
          <Link2 className="h-4 w-4 ml-2" />
          העתק קישור
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
