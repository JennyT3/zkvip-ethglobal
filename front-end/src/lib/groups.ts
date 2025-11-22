export type Group = {
  id: string;
  name: string;
  lastMessage: string;
  lastSender: string;
  description: string;
  minWld: number;
  unread: number;
  avatarBg: string;
  members: number;
  joinedAt: string;
};

export type AvailableGroup = {
  id: string;
  name: string;
  description: string;
  minWld: number;
  avatarBg: string;
  members: number;
};

const STORAGE_KEY = 'zkvip_joined_groups';
const AVAILABLE_GROUPS_KEY = 'zkvip_available_groups';

// Pre-created groups
const DEFAULT_AVAILABLE_GROUPS: AvailableGroup[] = [
  {
    id: 'zk-builders',
    name: 'ZK Builders',
    description: 'Daily discussions about ZK, proofs and tooling.',
    minWld: 0.5,
    avatarBg: 'bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-500',
    members: 124,
  },
  {
    id: 'ethereum-sp',
    name: 'Ethereum São Paulo',
    description: 'Events, meetups and grants from the São Paulo community.',
    minWld: 1,
    avatarBg: 'bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500',
    members: 89,
  },
];

export const getJoinedGroups = (): Group[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const addJoinedGroup = (group: AvailableGroup): void => {
  if (typeof window === 'undefined') return;
  
  const joinedGroups = getJoinedGroups();
  
  // Check if group already exists
  if (joinedGroups.some((g) => g.id === group.id)) {
    return;
  }

  // Create group with initial data
  const newGroup: Group = {
    ...group,
    lastMessage: 'Welcome to the group!',
    lastSender: 'System',
    unread: 0,
    joinedAt: new Date().toISOString(),
  };

  joinedGroups.push(newGroup);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(joinedGroups));
    // Dispatch event to update other parts of the application
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('groupsUpdated'));
    }
  } catch (error) {
    console.error('Error saving group:', error);
  }
};

export const updateGroupLastMessage = (
  groupId: string,
  message: string,
  sender: string,
): void => {
  if (typeof window === 'undefined') return;
  
  const joinedGroups = getJoinedGroups();
  const groupIndex = joinedGroups.findIndex((g) => g.id === groupId);
  
  if (groupIndex !== -1) {
    joinedGroups[groupIndex].lastMessage = message;
    joinedGroups[groupIndex].lastSender = sender;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(joinedGroups));
    } catch (error) {
      console.error('Error updating message:', error);
    }
  }
};

export const incrementUnread = (groupId: string): void => {
  if (typeof window === 'undefined') return;
  
  const joinedGroups = getJoinedGroups();
  const groupIndex = joinedGroups.findIndex((g) => g.id === groupId);
  
  if (groupIndex !== -1) {
    joinedGroups[groupIndex].unread += 1;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(joinedGroups));
    } catch (error) {
      console.error('Error incrementing unread:', error);
    }
  }
};

export const clearUnread = (groupId: string): void => {
  if (typeof window === 'undefined') return;
  
  const joinedGroups = getJoinedGroups();
  const groupIndex = joinedGroups.findIndex((g) => g.id === groupId);
  
  if (groupIndex !== -1) {
    joinedGroups[groupIndex].unread = 0;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(joinedGroups));
    } catch (error) {
      console.error('Error clearing unread:', error);
    }
  }
};

// Functions to manage available groups
export const getAvailableGroups = (): AvailableGroup[] => {
  if (typeof window === 'undefined') return DEFAULT_AVAILABLE_GROUPS;
  
  try {
    const stored = localStorage.getItem(AVAILABLE_GROUPS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // If it doesn't exist, initialize with default groups
    initializeAvailableGroups();
    return DEFAULT_AVAILABLE_GROUPS;
  } catch {
    return DEFAULT_AVAILABLE_GROUPS;
  }
};

export const initializeAvailableGroups = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const existing = localStorage.getItem(AVAILABLE_GROUPS_KEY);
    if (!existing) {
      localStorage.setItem(
        AVAILABLE_GROUPS_KEY,
        JSON.stringify(DEFAULT_AVAILABLE_GROUPS),
      );
    }
  } catch (error) {
    console.error('Error initializing available groups:', error);
  }
};

export const createAvailableGroup = (
  name: string,
  description: string,
  minWld: number,
  avatarBg: string,
): AvailableGroup => {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create group on server');
  }
  
  const availableGroups = getAvailableGroups();
  
  // Generate unique ID based on name
  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Check if group with this ID already exists
  const existingGroup = availableGroups.find((g) => g.id === id);
  if (existingGroup) {
    throw new Error('A group with this name already exists');
  }
  
  const newGroup: AvailableGroup = {
    id,
    name,
    description,
    minWld,
    avatarBg,
    members: 0,
  };
  
  availableGroups.push(newGroup);
  
  try {
    localStorage.setItem(AVAILABLE_GROUPS_KEY, JSON.stringify(availableGroups));
    // Dispatch event to update other parts of the application
    window.dispatchEvent(new Event('availableGroupsUpdated'));
    return newGroup;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

export const removeAvailableGroup = (groupId: string): void => {
  if (typeof window === 'undefined') return;
  
  const availableGroups = getAvailableGroups();
  const filteredGroups = availableGroups.filter((g) => g.id !== groupId);
  
  try {
    localStorage.setItem(AVAILABLE_GROUPS_KEY, JSON.stringify(filteredGroups));
    window.dispatchEvent(new Event('availableGroupsUpdated'));
  } catch (error) {
    console.error('Error removing available group:', error);
  }
};

export const getAvailableGroupsExcludingJoined = (): AvailableGroup[] => {
  const availableGroups = getAvailableGroups();
  const joinedGroups = getJoinedGroups();
  const joinedIds = new Set(joinedGroups.map((g) => g.id));
  
  return availableGroups.filter((g) => !joinedIds.has(g.id));
};

