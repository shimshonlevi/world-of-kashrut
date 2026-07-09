'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import {
  Bot,
  X,
  Send,
  Maximize2,
  Minimize2,
  Sparkles,
  User,
  Loader2,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIChatWidgetProps {
  className?: string;
  // Optional controlled open state (e.g. from the header "AI" button).
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  'אילו פרויקטים ממתינים לדוח?',
  'מה הרווח הכולל?',
  'אילו תיקים בעיכוב?',
  'סכם את המצב היום',
];

export function AIChatWidget({ className, open, onOpenChange }: AIChatWidgetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setIsOpen = (v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const userMessage: ChatMessage = { id: `u-${messages.length}`, role: 'user', content: trimmed };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'שגיאה בשירות ה-AI');
      setMessages((prev) => [
        ...prev,
        { id: `a-${prev.length}`, role: 'assistant', content: data.reply || 'לא התקבלה תשובה.' },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשליחת הבקשה');
      // roll back the optimistic user message so they can retry cleanly
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      setInput(trimmed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg z-50',
          'bg-primary hover:bg-primary/90 text-primary-foreground',
          'transition-all duration-300 hover:scale-110',
          className
        )}
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        'fixed z-50 flex flex-col shadow-2xl border-border/50 overflow-hidden transition-all duration-300',
        isExpanded
          ? 'bottom-4 left-4 right-4 top-4 md:bottom-6 md:left-6 md:right-auto md:top-auto md:w-[600px] md:h-[700px]'
          : 'bottom-6 left-6 w-[380px] h-[500px]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">עוזר AI</h3>
            <p className="text-xs text-primary-foreground/70">שאל אותי על הפרויקטים</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMessages([])}
              className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h4 className="font-medium text-foreground mb-2">איך אוכל לעזור?</h4>
            <p className="text-sm text-muted-foreground mb-6">
              אני יכול לענות על שאלות לגבי פרויקטים, סטטוסים, רווחיות ועוד
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_QUESTIONS.map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => void send(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex gap-3', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2 max-w-[80%]',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="rounded-2xl px-4 py-2 bg-muted">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">חושב...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {error && (
        <div className="px-3 py-2 bg-destructive/10 border-t border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="שאל שאלה על הפרויקטים..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isLoading} className="px-3">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </Card>
  );
}
