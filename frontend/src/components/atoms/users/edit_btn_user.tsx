import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

type EditBtnUserProps = {
  userId: string;
};

const EditBtnUser = () => {
  return (
    <form>
      <Button variant={'outline'}>
        <Pencil className='size-5 text-yellow-600' />
      </Button>
    </form>
  );
};

export default EditBtnUser;
