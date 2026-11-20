'use client';

import { useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  BoldIcon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  Loader2Icon,
  QuoteIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n/client';
import { cn } from '@/lib/utils';
import { uploadForumImage } from '../actions/forum.actions';
import { IMAGE_MIME_TYPES } from '../schemas';
import { MarkdownView } from './markdown-view';

/**
 * Markdown textarea with a small toolbar, a preview tab and image upload
 * (toolbar button, paste or drag & drop).
 */
export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  autoFocus,
  minHeight = 'min-h-32',
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  autoFocus?: boolean;
  minHeight?: string;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputId = useId();
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(0);

  /** Replaces the selection, then restores focus/selection. */
  const replaceSelection = (
    make: (selected: string) => { text: string; select?: [number, number] },
  ) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const { text, select } = make(value.slice(start, end));
    onChange(value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const [a, b] = select ?? [text.length, text.length];
      el.setSelectionRange(start + a, start + b);
    });
  };

  const wrap = (marker: string, fallback: string) =>
    replaceSelection((s) => {
      const inner = s || fallback;
      return {
        text: `${marker}${inner}${marker}`,
        select: [marker.length, marker.length + inner.length],
      };
    });

  const prefixLines = (prefix: (i: number) => string) =>
    replaceSelection((s) => {
      const text = (s || t.forum.editor.listItem)
        .split('\n')
        .map((line, i) => prefix(i) + line)
        .join('\n');
      return { text };
    });

  const insertLink = () =>
    replaceSelection((s) => {
      const label = s || t.forum.editor.linkText;
      const text = `[${label}](https://)`;
      return { text, select: [label.length + 3, text.length - 1] };
    });

  const insertAtCursor = (snippet: string) => {
    const el = ref.current;
    const pos = el ? el.selectionEnd : value.length;
    const before = value.slice(0, pos);
    const pad = before && !before.endsWith('\n') ? '\n' : '';
    onChange(`${before}${pad}${snippet}\n${value.slice(pos)}`);
  };

  const upload = async (files: File[]) => {
    const images = files.filter((f) => f.type in IMAGE_MIME_TYPES || f.type.startsWith('image/'));
    for (const file of images) {
      setUploading((n) => n + 1);
      try {
        const data = new FormData();
        data.set('file', file);
        const result = await uploadForumImage(data);
        if (result.success) {
          const alt = file.name.replace(/\.[^.]+$/, '').replace(/[[\]]/g, '') || 'image';
          insertAtCursor(`![${alt}](${result.url})`);
        } else {
          toast.error(result.message);
        }
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const tools = [
    {
      icon: BoldIcon,
      label: t.forum.editor.bold,
      run: () => wrap('**', t.forum.editor.boldText),
    },
    {
      icon: ItalicIcon,
      label: t.forum.editor.italic,
      run: () => wrap('*', t.forum.editor.italicText),
    },
    { icon: LinkIcon, label: t.forum.editor.link, run: insertLink },
    {
      icon: ListIcon,
      label: t.forum.editor.bulletList,
      run: () => prefixLines(() => '- '),
    },
    {
      icon: ListOrderedIcon,
      label: t.forum.editor.numberedList,
      run: () => prefixLines((i) => `${i + 1}. `),
    },
    {
      icon: QuoteIcon,
      label: t.forum.editor.quote,
      run: () => prefixLines(() => '> '),
    },
  ];

  return (
    <div
      className={cn(
        'rounded-lg border focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
        invalid && 'border-destructive ring-3 ring-destructive/20',
      )}
    >
      <div className='flex flex-wrap items-center gap-0.5 border-b p-1'>
        <div role='tablist' className='mr-1 flex gap-0.5'>
          {[false, true].map((isPreview) => (
            <Button
              key={String(isPreview)}
              type='button'
              role='tab'
              size='sm'
              variant={preview === isPreview ? 'secondary' : 'ghost'}
              aria-selected={preview === isPreview}
              onClick={() => setPreview(isPreview)}
            >
              {isPreview ? t.forum.editor.preview : t.forum.editor.write}
            </Button>
          ))}
        </div>
        {!preview && (
          <>
            {tools.map(({ icon: Icon, label, run }) => (
              <Button
                key={label}
                type='button'
                variant='ghost'
                size='icon'
                className='size-8'
                title={label}
                aria-label={label}
                onClick={run}
              >
                <Icon />
              </Button>
            ))}
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='size-8'
              title={t.forum.editor.image}
              aria-label={t.forum.editor.image}
              disabled={uploading > 0}
              asChild={uploading === 0}
            >
              {uploading > 0 ? (
                <Loader2Icon className='animate-spin' />
              ) : (
                <label htmlFor={fileInputId} className='cursor-pointer'>
                  <ImageIcon />
                </label>
              )}
            </Button>
            <input
              id={fileInputId}
              type='file'
              accept={Object.keys(IMAGE_MIME_TYPES).join(',')}
              multiple
              className='sr-only'
              tabIndex={-1}
              onChange={(e) => {
                void upload([...(e.target.files ?? [])]);
                e.target.value = '';
              }}
            />
          </>
        )}
      </div>
      {preview ? (
        <div className={cn('px-3 py-2', minHeight)}>
          {value.trim() ? (
            <MarkdownView body={value} />
          ) : (
            <p className='text-sm text-muted-foreground'>{t.forum.editor.nothingToPreview}</p>
          )}
        </div>
      ) : (
        <Textarea
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-invalid={invalid}
          className={cn(
            'max-h-[60vh] resize-y rounded-none border-0 shadow-none focus-visible:ring-0 dark:bg-transparent',
            minHeight,
          )}
          onPaste={(e) => {
            const files = [...e.clipboardData.files];
            if (files.some((f) => f.type.startsWith('image/'))) {
              e.preventDefault();
              void upload(files);
            }
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('Files')) e.preventDefault();
          }}
          onDrop={(e) => {
            const files = [...e.dataTransfer.files];
            if (files.length > 0) {
              e.preventDefault();
              void upload(files);
            }
          }}
        />
      )}
      <p className='border-t px-3 py-1.5 text-xs text-muted-foreground'>{t.forum.editor.hint}</p>
    </div>
  );
}
