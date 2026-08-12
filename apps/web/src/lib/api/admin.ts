import { apiCall } from "./base"

export interface AdminUser {
  banExpires: string | null
  banned: boolean | null
  banReason: string | null
  createdAt: string
  email: string
  emailVerified: boolean
  id: string
  name: string
  role: string | null
}

export interface AdminWorkspace {
  createdAt: string
  id: string
  memberCount: number
  name: string
  slug: string
}

export const adminApi = {
  async listUsers(): Promise<AdminUser[]> {
    const result = (await apiCall("/api/admin/users")) as { users: AdminUser[] }
    return result.users
  },

  async listWorkspaces(): Promise<AdminWorkspace[]> {
    const result = (await apiCall("/api/admin/workspaces")) as {
      workspaces: AdminWorkspace[]
    }
    return result.workspaces
  },

  setUserDisabled(id: string, disabled: boolean) {
    return apiCall(`/api/admin/users/${id}/${disabled ? "disable" : "enable"}`, {
      method: "POST",
      body: disabled ? JSON.stringify({ reason: "Disabled by superadmin" }) : undefined,
    })
  },
}
