"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useApi } from "./useApi";

interface ProjectContextValue {
  projects: any[];
  activeProject: any | null;
  setActiveProjectId: (id: string) => void;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { data: projects, isLoading } = useApi<any[]>("/api/projects");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Restore from localStorage or default to first project
  useEffect(() => {
    if (!projects?.length) return;
    const stored = localStorage.getItem("reno-active-project");
    if (stored && projects.some((p: any) => p.id === stored)) {
      setActiveId(stored);
    } else {
      setActiveId(projects[0].id);
    }
  }, [projects]);

  const setActiveProjectId = (id: string) => {
    setActiveId(id);
    localStorage.setItem("reno-active-project", id);
  };

  const activeProject = projects?.find((p: any) => p.id === activeId) || null;

  return (
    <ProjectContext.Provider value={{ projects: projects || [], activeProject, setActiveProjectId, loading: isLoading }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
