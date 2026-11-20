import { redirect } from 'next/navigation';
import { HOME_PATH } from '@/lib/app';

export default function MainIndex() {
  redirect(HOME_PATH);
}
