'use client';
import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2Icon, Trash } from 'lucide-react';
import { deleteUserSafeAction } from '@/actions/users.actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type DeleteBtnUserProps = {
  userId: string;
};

const DeleteBtnUser = ({ userId }: DeleteBtnUserProps) => {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const handleDelete = async () => {
    startTransition(async () => {
      const result = await deleteUserSafeAction({ id: userId });
      if (result?.data?.error) {
        toast({
          variant: 'destructive',
          description: result?.data?.message,
        });
      } else {
        toast({
          variant: 'success',
          description: result?.data?.message,
        });
        router.refresh();
        setOpen(false);
      }
    });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={'outline'} type='submit'>
          <Trash className='size-5 text-red-500' />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          className='flex flex-col gap-4'
          action={async () => {
            await handleDelete();
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className='flex flex-col gap-4'>
            <p>Are you sure to delete this user?</p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline'>Cancel</Button>
            </DialogClose>
            <Button type='submit' disabled={isPending}>
              {isPending && <Loader2Icon className='animate-spin' />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteBtnUser;
