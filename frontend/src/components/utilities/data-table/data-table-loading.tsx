import { OctagonX, Loader2Icon, OctagonAlert } from 'lucide-react';
import React from 'react';

type DataTableLoadingProps = {
  error?: boolean;
  error_message?: string;
  loading?: boolean;
};

export const DataTableLoading = ({
  error,
  error_message,
  loading,
}: DataTableLoadingProps) => {
  const componentRender = () => {
    if (loading) {
      return (
        <Loader2Icon className='animate-spin size-10 text-primary' />
      );
    } else {
      if (error) {
        return (
          <>
            <OctagonX className='size-10 text-red-500' />
            <p className='text-base'>{error_message ?? ''}</p>
          </>
        );
      } else {
        return (
          <>
            <OctagonAlert className='size-10 text-yellow-600' />
            <p className='text-base'>No Result Found!</p>
          </>
        );
      }
    }
  };
  return (
    <div className='flex gap-2 justify-center items-center'>
      {componentRender()}
    </div>
  );
};
