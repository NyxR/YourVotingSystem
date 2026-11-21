import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** Shown right away while the forum list renders on the server. */
export default function ForumLoading() {
  return (
    <div className='flex flex-col gap-4 px-4 lg:px-6' aria-busy='true' aria-live='polite'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='flex flex-1 flex-wrap gap-1.5'>
          {[64, 88, 76, 96].map((w) => (
            <Skeleton key={w} className='h-8' style={{ width: w }} />
          ))}
        </div>
        <Skeleton className='h-8 w-28' />
      </div>
      <Card className='gap-0 py-0'>
        <div className='hidden border-b px-4 py-2 sm:block'>
          <Skeleton className='h-3 w-24' />
        </div>
        <ul className='divide-y'>
          {Array.from({ length: 6 }, (_, i) => (
            <li
              key={i}
              className='grid gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[1fr_5rem_7rem] sm:items-center'
            >
              <div className='flex flex-col gap-2'>
                <Skeleton className='h-4' style={{ width: `${70 - (i % 3) * 15}%` }} />
                <Skeleton className='h-3 w-32' />
              </div>
              <Skeleton className='hidden h-4 w-8 justify-self-center sm:block' />
              <Skeleton className='hidden h-3 w-16 justify-self-end sm:block' />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
