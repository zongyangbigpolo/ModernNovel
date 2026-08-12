import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Skeleton } from "./ui/skeleton"

export function WorkspaceSwitcher() {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const organizationsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const result = await authClient.organization.list()
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
  })
  const switchMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const result = await authClient.organization.setActive({ organizationId })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["session"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["organization-members"] }),
      ])
    },
    onError: (error) => toast.error(error.message),
  })

  if (organizationsQuery.isLoading) {
    return <Skeleton className="h-9 w-44" />
  }

  const organizations = organizationsQuery.data ?? []
  if (organizations.length === 0) {
    return null
  }

  const activeId = session?.session.activeOrganizationId ?? organizations[0]?.id

  return (
    <Select
      disabled={switchMutation.isPending}
      onValueChange={(organizationId) => switchMutation.mutate(organizationId)}
      value={activeId}
    >
      <SelectTrigger aria-label="Active workspace" className="w-44">
        <SelectValue placeholder="Select workspace" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((organization) => (
          <SelectItem key={organization.id} value={organization.id}>
            {organization.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
