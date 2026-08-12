import { apiCall } from "./base"

export interface WriterSkill {
  binding: {
    enabled: boolean
    order: number
  } | null
  builtIn: boolean
  checklist: string[]
  createdAt: string
  createdBy: string | null
  description: string | null
  examples: string[]
  id: string
  instructions: string
  name: string
  sourceLicense: string | null
  sourceUrl: string | null
  updatedAt: string
}

export interface ProjectStyleMemory {
  createdAt: string
  model: string | null
  profile: {
    avoid: string[]
    dialogue: string
    imagery: string
    pacing: string
    povTense: string
    sentenceRhythm: string
    voice: string
  }
  projectId: string
  provider: string | null
  sourceChapterIds: string[]
  sourceWordCount: number
  updatedAt: string
  version: number
}

export interface WriterSkillState {
  canManage: boolean
  skills: WriterSkill[]
}

export const writerSkillsApi = {
  list(projectId: string): Promise<WriterSkillState> {
    return apiCall(`/api/projects/${projectId}/writer-skills`) as Promise<WriterSkillState>
  },

  import(
    projectId: string,
    input: { content: string; format: "json" | "markdown" }
  ): Promise<{ skill: WriterSkill }> {
    return apiCall(`/api/projects/${projectId}/writer-skills`, {
      method: "POST",
      body: JSON.stringify(input),
    }) as Promise<{ skill: WriterSkill }>
  },

  memory(projectId: string): Promise<{ memory: ProjectStyleMemory | null }> {
    return apiCall(`/api/projects/${projectId}/writer-skills/memory`) as Promise<{
      memory: ProjectStyleMemory | null
    }>
  },

  setEnabled(
    projectId: string,
    skillId: string,
    enabled: boolean
  ): Promise<{ binding: { enabled: boolean; order: number; skillId: string } }> {
    return apiCall(`/api/projects/${projectId}/writer-skills/${skillId}/binding`, {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    }) as Promise<{ binding: { enabled: boolean; order: number; skillId: string } }>
  },

  update(
    projectId: string,
    skillId: string,
    input: {
      checklist: string[]
      description: string
      instructions: string
      name: string
    }
  ): Promise<{ skill: WriterSkill }> {
    return apiCall(`/api/projects/${projectId}/writer-skills/${skillId}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }) as Promise<{ skill: WriterSkill }>
  },

  delete(projectId: string, skillId: string): Promise<{ success: boolean }> {
    return apiCall(`/api/projects/${projectId}/writer-skills/${skillId}`, {
      method: "DELETE",
    }) as Promise<{ success: boolean }>
  },

  learn(projectId: string): Promise<{ memory: ProjectStyleMemory }> {
    return apiCall(`/api/projects/${projectId}/writer-skills/learn`, {
      method: "POST",
    }) as Promise<{ memory: ProjectStyleMemory }>
  },
}
