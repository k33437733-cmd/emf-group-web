export type ChangeType = 'Added' | 'Improved' | 'Fixed' | 'Removed' | 'Security' | 'Performance';

export interface ReleaseChange {
  title: string;
  description: string;
  type: ChangeType;
}

export interface ReleaseNote {
  id: string;
  version: string;
  title: string;
  summary: string;
  date: string;
  author: string;
  authorId: string;
  category: string;
  changes: ReleaseChange[];
  createdAt: string;
  updatedAt: string;
}
