import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Project {
  id: string
  name: string
  slug: string
  logo_url: string | null
}

interface ProjectStore {
  projects: Project[]
  activeProject: Project | null
  setProjects: (projects: Project[]) => void
  setActiveProject: (project: Project) => void
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projects: [],
      activeProject: null,
      setProjects: (projects) => set({ projects }),
      setActiveProject: (project) => set({ activeProject: project }),
    }),
    { name: 'leadleap-project' }
  )
)
