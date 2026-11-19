import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDay } from '@/lib/dates';
import { PAYMENT_METHOD_LABELS, type TransactionRow } from '../schemas';
import { Amount } from './amount';

export function RecentTransactions({ transactions }: { transactions: TransactionRow[] }) {
  return (
    <Card className='@container/recent'>
      <CardHeader>
        <CardTitle>Recent transactions</CardTitle>
        <CardDescription>The latest money in and out</CardDescription>
        <CardAction>
          <Button variant='ghost' size='sm' asChild>
            <Link href='/main/transactions'>
              View all <ArrowRightIcon />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>
            Nothing recorded yet.
          </p>
        ) : (
          <div className='overflow-hidden rounded-lg border'>
            <Table>
              <TableHeader className='bg-muted'>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className='hidden @xl/recent:table-cell'>Category</TableHead>
                  <TableHead className='hidden @3xl/recent:table-cell'>Method</TableHead>
                  <TableHead className='hidden @4xl/recent:table-cell'>Recorded by</TableHead>
                  <TableHead className='text-right'>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className='whitespace-nowrap'>{formatDay(t.date)}</TableCell>
                    <TableCell className='max-w-[20rem]'>
                      <span className='block truncate font-medium'>{t.description}</span>
                    </TableCell>
                    <TableCell className='hidden @xl/recent:table-cell'>
                      {t.categoryName ? (
                        <Badge variant='outline' className='text-muted-foreground'>
                          {t.categoryName}
                        </Badge>
                      ) : (
                        <span className='text-sm text-muted-foreground'>Uncategorized</span>
                      )}
                    </TableCell>
                    <TableCell className='hidden whitespace-nowrap text-muted-foreground @3xl/recent:table-cell'>
                      {PAYMENT_METHOD_LABELS[t.paymentMethod]}
                    </TableCell>
                    <TableCell className='hidden whitespace-nowrap text-muted-foreground @4xl/recent:table-cell'>
                      {t.createdByName ?? 'Removed user'}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Amount cents={t.amountCents} type={t.type} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
