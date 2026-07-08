export type ProjectStatus = 'under_review' | 'in_progress' | 'rejected' | 'completed';

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  dueDate?: string;
}
