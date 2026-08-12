import { adminClient, organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

// Session data types
export interface SessionUser {
  email: string
  id: string
  name: string | null
  role?: string | null
}

export interface SessionData {
  authenticated: boolean
  error?: string
  session?: {
    user: SessionUser
  } | null
}

function createConfiguredAuthClient() {
  return createAuthClient({
    baseURL:
      import.meta.env.DEV && import.meta.env.VITE_SERVER_URL
        ? import.meta.env.VITE_SERVER_URL
        : window.location.origin,
    basePath: "/api/auth",
    plugins: [
      adminClient(),
      organizationClient({
        teams: {
          enabled: true,
        },
      }),
    ],
  })
}

export const authClient = createConfiguredAuthClient()

// Singleton session fetcher to prevent multiple simultaneous calls
let sessionPromise: Promise<SessionData> | null = null

export function fetchSessionData(): Promise<SessionData> {
  if (sessionPromise) {
    return sessionPromise
  }

  const baseUrl =
    import.meta.env.DEV && import.meta.env.VITE_SERVER_URL
      ? import.meta.env.VITE_SERVER_URL
      : window.location.origin

  sessionPromise = fetch(`${baseUrl}/api/session`, {
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch session")
      }
      return response.json()
    })
    .finally(() => {
      // Reset the promise after completion so future calls can be made
      sessionPromise = null
    })

  return sessionPromise
}
