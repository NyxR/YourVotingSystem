import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { requireUser } from '@/lib/auth';
import { getUnreadTopicCount } from '@/features/forum/queries';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // A badge failure (e.g. forum migration not applied yet) must not break every page.
  const unreadForumTopics = await getUnreadTopicCount(user).catch((error: unknown) => {
    console.error('Unread forum count failed', error);
    return 0;
  });

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant='inset'
        unreadForumTopics={unreadForumTopics}
        user={{
          name: user.username,
          email: user.email,
          role: user.role,
          memberType: user.memberType,
          phone: user.phone,
          responsibilities: user.responsibilities,
          avatarUrl: user.avatarUrl,
        }}
      />
      <SidebarInset>
        <SiteHeader />
        <div className='flex flex-1 flex-col'>
          <div className='@container/main flex flex-1 flex-col gap-2'>
            <div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6'>{children}</div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
