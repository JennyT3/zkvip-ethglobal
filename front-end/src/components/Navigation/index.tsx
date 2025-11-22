'use client';

import { TabItem, Tabs, Marble } from '@worldcoin/mini-apps-ui-kit-react';
import { Community, ViewGrid } from 'iconoir-react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

/**
 * This component uses the UI Kit to navigate between pages
 * Bottom navigation is the most common navigation pattern in Mini Apps
 * We require mobile first design patterns for mini apps
 * Read More: https://docs.world.org/mini-apps/design/app-guidelines#mobile-first
 */

export const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const [value, setValue] = useState('my-groups');

  useEffect(() => {
    if (pathname?.startsWith('/home')) {
      setValue('my-groups');
    } else if (pathname?.startsWith('/groups')) {
      setValue('groups');
    } else if (pathname?.startsWith('/profile')) {
      setValue('profile');
    }
  }, [pathname]);

  const handleChange = (val: string) => {
    setValue(val);
    if (val === 'my-groups') router.push('/home');
    if (val === 'groups') router.push('/groups');
    if (val === 'profile') router.push('/profile');
  };

  return (
    <div className="w-full pointer-events-auto">
      <Tabs value={value} onValueChange={handleChange}>
        <TabItem value="my-groups" icon={<Community />} label="My groups" />
        {/* TODO: Link to discover groups page */}
        <TabItem value="groups" icon={<ViewGrid />} label="Groups" />
        <TabItem 
          value="profile" 
          icon={
            <Marble 
              src={session?.data?.user?.profilePictureUrl} 
              className="w-5 h-5"
            />
          } 
          label="Profile" 
        />
      </Tabs>
    </div>
  );
};
