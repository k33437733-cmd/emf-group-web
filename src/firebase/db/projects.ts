import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config';
import type { Project, ProjectStatus } from '../../types';

const PROJECTS_COLLECTION = 'projects';

export const subscribeToProjects = (callback: (projects: Project[]) => void) => {
  const q = query(collection(db, PROJECTS_COLLECTION), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const projects: Project[] = [];
    snapshot.forEach((doc) => {
      projects.push({ id: doc.id, ...doc.data() } as Project);
    });
    callback(projects);
  });
};

export const addProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
  const newProjectRef = doc(collection(db, PROJECTS_COLLECTION));
  const now = new Date().toISOString();
  
  const project: Project = {
    ...projectData,
    id: newProjectRef.id,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newProjectRef, project);
  return project.id;
};

export const updateProjectStatus = async (projectId: string, status: ProjectStatus) => {
  const ref = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(ref, {
    status,
    updatedAt: new Date().toISOString()
  });
};

export const deleteProject = async (projectId: string) => {
  const ref = doc(db, PROJECTS_COLLECTION, projectId);
  await deleteDoc(ref);
};
