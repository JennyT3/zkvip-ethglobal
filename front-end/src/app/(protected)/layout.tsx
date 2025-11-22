import { auth } from '@/auth';
import { Navigation } from '@/components/Navigation';
import { Page } from '@/components/PageLayout';
import { GroupsInitializer } from '@/components/GroupsInitializer';
import { ToastContainer } from '@/components/Toast';

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // If the user is not authenticated, redirect to the login page
  if (!session) {
    console.log('Not authenticated');
    // redirect('/');
  }

  return (
    <Page>
      <GroupsInitializer />
      <ToastContainer />
      {children}
      <Page.Footer className="px-0 fixed bottom-0 w-full bg-white border-t border-slate-200 shadow-lg z-20">
        <Navigation />
      </Page.Footer>
    </Page>
  );
}
