import type { ComponentPropsWithoutRef, ElementType } from 'react';
import ReactMarkdown, { type Components, type ExtraProps } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

const IMAGE_PREFIX = '/main/forum/images/';

/** A Markdown element rendered as `Tag` with our classes (drops the AST node). */
function styled<T extends ElementType>(Tag: T, base: string) {
  function Styled({ node, className, ...props }: ComponentPropsWithoutRef<T> & ExtraProps) {
    void node;
    const Component = Tag as ElementType;
    return <Component className={cn(base, className)} {...props} />;
  }
  return Styled;
}

// Raw HTML in posts is ignored (react-markdown's default), and unsafe link
// protocols are stripped, so posts can't inject scripts or markup.
const components: Components = {
  p: styled('p', 'leading-relaxed'),
  ul: styled('ul', 'list-disc space-y-1 pl-5'),
  ol: styled('ol', 'list-decimal space-y-1 pl-5'),
  blockquote: styled('blockquote', 'border-l-2 pl-3 text-muted-foreground italic'),
  // Post headings sit below the page and topic titles.
  h1: styled('h3', 'text-lg font-semibold'),
  h2: styled('h4', 'text-base font-semibold'),
  h3: styled('h5', 'font-semibold'),
  h4: styled('h6', 'font-semibold'),
  code: styled('code', 'rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]'),
  pre: styled(
    'pre',
    'overflow-x-auto rounded-md bg-muted p-3 text-sm [&_code]:bg-transparent [&_code]:p-0',
  ),
  hr: () => <hr className='border-border' />,
  table: ({ node, ...props }) => {
    void node;
    return (
      <div className='overflow-x-auto'>
        <table className='w-full border-collapse text-sm' {...props} />
      </div>
    );
  },
  th: styled('th', 'border px-2 py-1 text-left font-medium'),
  td: styled('td', 'border px-2 py-1'),
  a: ({ node, href, ...props }) => {
    void node;
    const external = !!href && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className='font-medium break-words text-primary underline underline-offset-4'
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...props}
      />
    );
  },
  // Only images uploaded to the forum are shown; anything else stays a link
  // (no tracking pixels or hot-linked content from other sites).
  img: ({ src, alt }) => {
    const url = typeof src === 'string' ? src : '';
    if (!url.startsWith(IMAGE_PREFIX)) {
      return url ? (
        <a href={url} target='_blank' rel='noopener noreferrer' className='text-primary underline'>
          {alt || url}
        </a>
      ) : null;
    }
    return (
      <a href={url} target='_blank' rel='noopener noreferrer' className='inline-block'>
        {/* eslint-disable-next-line @next/next/no-img-element -- access-checked redirect, not optimizable */}
        <img
          src={url}
          alt={alt ?? ''}
          loading='lazy'
          className='max-h-96 max-w-full rounded-md border object-contain'
        />
      </a>
    );
  },
};

export function MarkdownView({ body, className }: { body: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 text-sm break-words', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
