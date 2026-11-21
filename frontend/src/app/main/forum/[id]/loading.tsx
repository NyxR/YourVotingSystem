import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function PostSkeleton({ lines }: { lines: number }) {
  return (
    <Card className='gap-3 px-4'>
      <div className='flex items-center gap-2'>
        <Skeleton className='size-8 rounded-full' />
        <div className='flex flex-col gap-1.5'>
          <Skeleton className='h-3.5 w-28' />
          <Skeleton className='h-3 w-16' />
        </div>
      </div>
      <div className='flex flex-col gap-2'>
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className='h-3.5' style={{ width: i === lines - 1 ? '55%' : '100%' }} />
        ))}
      </div>
    </Card>
  );
}

/** Shown right away while a topic renders on the server. */
export default function TopicLoading() {
  return (
    <div
      className='mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 lg:px-6'
      aria-busy='true'
      aria-live='polite'
    >
      <Skeleton className='h-8 w-36' />
      <Card className='gap-4 px-4'>
        <Skeleton className='h-6 w-2/3' />
        <Skeleton className='h-5 w-24 rounded-full' />
        <div className='flex flex-col gap-2'>
          {[100, 100, 90, 60].map((w, i) => (
            <Skeleton key={i} className='h-3.5' style={{ width: `${w}%` }} />
          ))}
        </div>
      </Card>
      <PostSkeleton lines={2} />
      <PostSkeleton lines={3} />
    </div>
  );
}
