import { redirect } from 'next/navigation';
import { HOME_PATH } from '@/lib/app';

// Signed-out visitors are sent to /login by the proxy before reaching this.
export default function Home() {
  redirect(HOME_PATH);
}
