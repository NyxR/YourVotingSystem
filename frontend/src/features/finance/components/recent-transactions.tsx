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
import { getI18n } from '@/i18n/server';
import type { TransactionRow } from '../schemas';
import { Amount } from './amount';

export async function RecentTransactions({ transactions }: { transactions: TransactionRow[] }) {
  const { t, intl } = await getI18n();

  return (
    <Card className='@container/recent'>
      <CardHeader>
        <CardTitle>{t.recent.title}</CardTitle>
        <CardDescription>{t.recent.description}</CardDescription>
        <CardAction>
          <Button variant='ghost' size='sm' asChild>
            <Link href='/main/transactions'>
              {t.recent.viewAll} <ArrowRightIcon />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>
            {t.recent.empty}
          </p>
        ) : (
          <div className='overflow-hidden rounded-lg border'>
            <Table>
              <TableHeader className='bg-muted'>
                <TableRow>
                  <TableHead>{t.transactions.colDate}</TableHead>
                  <TableHead>{t.transactions.colDescription}</TableHead>
                  <TableHead className='hidden @xl/recent:table-cell'>
                    {t.transactions.colCategory}
                  </TableHead>
                  <TableHead className='hidden @3xl/recent:table-cell'>
                    {t.transactions.colMethod}
                  </TableHead>
                  <TableHead className='hidden @4xl/recent:table-cell'>
                    {t.transactions.colRecordedBy}
                  </TableHead>
                  <TableHead className='text-right'>{t.transactions.colAmount}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className='whitespace-nowrap'>
                      {formatDay(tx.date, {}, intl)}
                    </TableCell>
                    <TableCell className='max-w-[20rem]'>
                      <span className='block truncate font-medium'>{tx.description}</span>
                    </TableCell>
                    <TableCell className='hidden @xl/recent:table-cell'>
                      {tx.categoryName ? (
                        <Badge variant='outline' className='text-muted-foreground'>
                          {tx.categoryName}
                        </Badge>
                      ) : (
                        <span className='text-sm text-muted-foreground'>
                          {t.common.uncategorized}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className='hidden whitespace-nowrap text-muted-foreground @3xl/recent:table-cell'>
                      {t.paymentMethods[tx.paymentMethod]}
                    </TableCell>
                    <TableCell className='hidden whitespace-nowrap text-muted-foreground @4xl/recent:table-cell'>
                      {tx.createdByName ?? t.common.removedUser}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Amount cents={tx.amountCents} type={tx.type} />
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
