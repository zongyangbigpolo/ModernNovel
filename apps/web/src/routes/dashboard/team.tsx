import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { authClient } from "@/lib/auth-client"

type WorkspaceRole = "owner" | "admin" | "member"

function isWorkspaceRole(value: string): value is WorkspaceRole {
  return value === "owner" || value === "admin" || value === "member"
}

function TeamPage() {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member")

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
  const activeOrganizationId =
    session?.session.activeOrganizationId ?? organizationsQuery.data?.[0]?.id

  const membersQuery = useQuery({
    queryKey: ["organization-members", activeOrganizationId],
    enabled: Boolean(activeOrganizationId),
    queryFn: async () => {
      const result = await authClient.organization.listMembers({
        query: { organizationId: activeOrganizationId },
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
  })
  const receivedInvitationsQuery = useQuery({
    queryKey: ["received-invitations"],
    queryFn: async () => {
      const result = await authClient.organization.listUserInvitations()
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
  })

  const currentMember = membersQuery.data?.members.find(
    (member) => member.userId === session?.user.id
  )
  const canManage = currentMember?.role === "owner" || currentMember?.role === "admin"

  const sentInvitationsQuery = useQuery({
    queryKey: ["organization-invitations", activeOrganizationId],
    enabled: Boolean(activeOrganizationId && canManage),
    queryFn: async () => {
      const result = await authClient.organization.listInvitations({
        query: { organizationId: activeOrganizationId },
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
  })

  const refreshOrganization = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["organization-members"] }),
      queryClient.invalidateQueries({ queryKey: ["organization-invitations"] }),
      queryClient.invalidateQueries({ queryKey: ["received-invitations"] }),
      queryClient.invalidateQueries({ queryKey: ["organizations"] }),
      queryClient.invalidateQueries({ queryKey: ["session"] }),
    ])
  }

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!activeOrganizationId) {
        throw new Error("Select a workspace first")
      }
      const result = await authClient.organization.inviteMember({
        email: inviteEmail.trim(),
        role: inviteRole,
        organizationId: activeOrganizationId,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: async () => {
      setInviteEmail("")
      await refreshOrganization()
      toast.success("Invitation created")
    },
    onError: (error) => toast.error(error.message),
  })

  const acceptMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const result = await authClient.organization.acceptInvitation({ invitationId })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: async () => {
      await refreshOrganization()
      toast.success("Workspace joined")
    },
    onError: (error) => toast.error(error.message),
  })

  const roleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: WorkspaceRole }) => {
      if (!activeOrganizationId) {
        throw new Error("Select a workspace first")
      }
      const result = await authClient.organization.updateMemberRole({
        memberId,
        role,
        organizationId: activeOrganizationId,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: refreshOrganization,
    onError: (error) => toast.error(error.message),
  })

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!activeOrganizationId) {
        throw new Error("Select a workspace first")
      }
      const result = await authClient.organization.removeMember({
        memberIdOrEmail: memberId,
        organizationId: activeOrganizationId,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: async () => {
      await refreshOrganization()
      toast.success("Member removed")
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-3xl">Workspace members</h1>
        <p className="text-muted-foreground">Invite people and control what they can manage.</p>
      </div>

      {(receivedInvitationsQuery.data?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {receivedInvitationsQuery.data?.map((invitation) => (
              <div className="flex items-center justify-between gap-4" key={invitation.id}>
                <div>
                  <div className="font-medium">{invitation.organizationName}</div>
                  <div className="text-muted-foreground text-sm">Role: {invitation.role}</div>
                </div>
                <Button
                  disabled={acceptMutation.isPending}
                  onClick={() => acceptMutation.mutate(invitation.id)}
                >
                  Accept
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Invite a member</CardTitle>
            <CardDescription>
              The invitation is available in the recipient's account even if email delivery is not
              configured.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-[1fr_180px_auto]"
              onSubmit={(event) => {
                event.preventDefault()
                inviteMutation.mutate()
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  onChange={(event) => setInviteEmail(event.target.value)}
                  required
                  type="email"
                  value={inviteEmail}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  onValueChange={(value) => {
                    if (isWorkspaceRole(value)) {
                      setInviteRole(value)
                    }
                  }}
                  value={inviteRole}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="self-end" disabled={inviteMutation.isPending} type="submit">
                Invite
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Owners have full control, admins manage members, and members collaborate on content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {membersQuery.isError && (
            <p className="text-destructive text-sm">{membersQuery.error.message}</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                {canManage && <TableHead className="text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(membersQuery.data?.members ?? []).map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-medium">{member.user.name}</div>
                    <div className="text-muted-foreground text-sm">{member.user.email}</div>
                  </TableCell>
                  <TableCell>
                    {canManage && member.userId !== session?.user.id ? (
                      <Select
                        disabled={roleMutation.isPending}
                        onValueChange={(value) => {
                          if (isWorkspaceRole(value)) {
                            roleMutation.mutate({ memberId: member.id, role: value })
                          }
                        }}
                        value={member.role}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{member.role}</Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button
                        disabled={
                          removeMutation.isPending ||
                          member.userId === session?.user.id ||
                          member.role === "owner"
                        }
                        onClick={() => removeMutation.mutate(member.id)}
                        size="sm"
                        variant="outline"
                      >
                        Remove
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManage && (sentInvitationsQuery.data?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sentInvitationsQuery.data?.map((invitation) => (
              <div className="flex items-center justify-between" key={invitation.id}>
                <span>{invitation.email}</span>
                <Badge variant="outline">{invitation.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export const Route = createFileRoute("/dashboard/team")({
  component: TeamPage,
})
