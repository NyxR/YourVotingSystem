import React, { ComponentPropsWithRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type MetricCardProps = ComponentPropsWithRef<'div'> & {
  title: string;
  value: string | number;
};

const MetricCard = ({
  title,
  value,
  className,
  ...props
}: MetricCardProps) => {
  return (
    <Card className={cn('cursor-pointer', className)}>
      <CardHeader>
        <CardTitle className={cn('text-xl')}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-5xl'>{value}</p>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
