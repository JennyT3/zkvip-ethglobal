'use client';

import clsx from 'clsx';
import { Page } from '@/components/PageLayout';
import { Marble, CircularIcon, ListItem, Chip, Skeleton, SkeletonTypography } from '@worldcoin/mini-apps-ui-kit-react';
import { useSession } from 'next-auth/react';
import { CheckCircleSolid, Wallet, User, Shield } from 'iconoir-react';
import { getJoinedGroups, type Group } from '@/lib/groups';
import { useState, useEffect } from 'react';

export default function Profile() {
  const session = useSession();
  const [joinedGroups, setJoinedGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGroups = () => {
      setIsLoading(true);
      // Simulate loading for better UX
      setTimeout(() => {
        setJoinedGroups(getJoinedGroups());
        setIsLoading(false);
      }, 300);
    };
    
    loadGroups();
    
    const handleUpdate = () => {
      loadGroups();
    };
    
    window.addEventListener('groupsUpdated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    
    return () => {
      window.removeEventListener('groupsUpdated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, []);

  const isLoadingSession = session.status === 'loading';

  return (
    <>
      <Page.Header className="p-0 bg-gradient-to-b from-white to-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
              Profile
            </p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">
              My profile
            </p>
          </div>
        </div>
      </Page.Header>

      <Page.Main className="relative flex flex-col bg-gradient-to-b from-slate-50/50 to-white px-0 pb-28">
        <div className="px-6 pt-6 space-y-6">
          {/* Profile Card */}
          <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-lg p-6">
            {isLoadingSession ? (
              <div className="flex items-center gap-4 mb-6">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="flex-1 space-y-2">
                  <SkeletonTypography className="h-7 w-32" />
                  <SkeletonTypography className="h-4 w-40" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <Marble
                    src={session?.data?.user?.profilePictureUrl}
                    className="w-20 h-20 shadow-xl ring-4 ring-white"
                  />
                  <div className="absolute -bottom-1 -right-1 z-10">
                    <CircularIcon size="sm">
                      <CheckCircleSolid className="w-4 h-4 text-blue-600" />
                    </CircularIcon>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 mb-1 capitalize">
                    {session?.data?.user?.username || 'User'}
                  </h2>
                  <p className="text-sm text-slate-500">Verified by World ID</p>
                </div>
              </div>
            )}

            {/* Wallet Address */}
            {isLoadingSession ? (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-4">
                <SkeletonTypography className="h-4 w-24 mb-2" />
                <SkeletonTypography className="h-4 w-full" />
              </div>
            ) : (
              (session?.data?.user?.walletAddress || session?.data?.user?.id) && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Wallet Address
                    </span>
                  </div>
                  <p className="font-mono text-sm text-slate-900 break-all">
                    {session.data.user.walletAddress || session.data.user.id}
                  </p>
                </div>
              )
            )}

            {/* Stats */}
            {isLoadingSession || isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-4">
                  <SkeletonTypography className="h-4 w-16 mb-2" />
                  <SkeletonTypography className="h-8 w-8 mb-1" />
                  <SkeletonTypography className="h-3 w-20" />
                </div>
                <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 p-4">
                  <SkeletonTypography className="h-4 w-12 mb-2" />
                  <SkeletonTypography className="h-6 w-16 mb-1" />
                  <SkeletonTypography className="h-3 w-16" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-indigo-700">
                      ZK Proof
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-indigo-900">
                    {joinedGroups.length}
                  </p>
                  <p className="text-xs text-indigo-600 mt-1">Active groups</p>
                  {joinedGroups.length > 0 && (
                    <Chip className="mt-2" variant="success" label="Verified" />
                  )}
                </div>

                <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">
                      Status
                    </span>
                  </div>
                  <Chip variant="success" label="✓ Verified" className="text-base" />
                  <p className="text-xs text-emerald-600 mt-1">World ID</p>
                </div>
              </div>
            )}
          </div>

          {/* World ID Info */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  World ID Verified
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your identity has been verified through World ID, ensuring
                  privacy and security in all interactions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <CheckCircleSolid className="w-4 h-4 text-blue-600" />
              <span className="font-semibold">Identity verified</span>
              <span className="text-slate-400">·</span>
              <span>Privacy guaranteed</span>
            </div>
          </div>

          {/* Groups Joined */}
          <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              My Groups
            </h3>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <SkeletonTypography className="h-4 w-32" />
                      <SkeletonTypography className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : joinedGroups.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <p className="text-slate-500 font-medium">
                  You are not in any group yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {joinedGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <div
                      className={clsx(
                        'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold uppercase text-white shadow-md',
                        group.avatarBg,
                      )}
                    >
                      {group.name
                        .split(' ')
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join('')}
                    </div>
                    <ListItem
                      label={group.name}
                      description={`Joined on ${new Date(group.joinedAt).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                      })}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Page.Main>
    </>
  );
}

