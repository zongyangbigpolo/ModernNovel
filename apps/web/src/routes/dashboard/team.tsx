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
import { useI18n } from "@/lib/i18n"

type WorkspaceRole = "owner" | "admin" | "member"

function isWorkspaceRole(value: string): value is WorkspaceRole {
  return value === "owner" || value === "admin" || value === "member"
}

function TeamPage() {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member")
  const { t } = useI18n()

  const translateRole = (role: WorkspaceRole) => {
    switch (role) {
      case "owner":
        return t("dashboard.roles.owner")
      case "admin":
        return t("dashboard.roles.admin")
      default:
        return t("dashboard.roles.member")
    }
  }

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
        throw new Error(t("dashboard.team.feedback.selectWorkspaceFirst"))
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
      toast.success(t("dashboard.team.feedback.invitationCreated"))
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
      toast.success(t("dashboard.team.feedback.workspaceJoined"))
    },
    onError: (error) => toast.error(error.message),
  })

  const roleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: WorkspaceRole }) => {
      if (!activeOrganizationId) {
        throw new Error(t("dashboard.team.feedback.selectWorkspaceFirst"))
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
        throw new Error(t("dashboard.team.feedback.selectWorkspaceFirst"))
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
      toast.success(t("dashboard.team.feedback.memberRemoved"))
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-3xl">{t("dashboard.team.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.team.description")}</p>
      </div>

      {(receivedInvitationsQuery.data?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.team.invitations.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {receivedInvitationsQuery.data?.map((invitation) => (
              <div className="flex items-center justify-between gap-4" key={invitation.id}>
                <div>
                  <div className="font-medium">{invitation.organizationName}</div>
                  <div className="text-muted-foreground text-sm">
                    {t("dashboard.team.invitations.role", {
                      role: translateRole(invitation.role as WorkspaceRole),
                    })}
                  </div>
                </div>
                <Button
                  disabled={acceptMutation.isPending}
                  onClick={() => acceptMutation.mutate(invitation.id)}
                >
                  {t("dashboard.team.invitations.accept")}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.team.invite.title")}</CardTitle>
            <CardDescription>{t("dashboard.team.invite.description")}</CardDescription>
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
                <Label htmlFor="invite-email">{t("auth.fields.email")}</Label>
                <Input
                  id="invite-email"
                  onChange={(event) => setInviteEmail(event.target.value)}
                  required
                  type="email"
                  value={inviteEmail}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.team.invite.roleLabel")}</Label>
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
                    <SelectItem value="member">{t("dashboard.team.roles.member")}</SelectItem>
                    <SelectItem value="admin">{t("dashboard.team.roles.admin")}</SelectItem>
                    <SelectItem value="owner">{t("dashboard.team.roles.owner")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="self-end" disabled={inviteMutation.isPending} type="submit">
                {t("dashboard.team.invite.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.team.members.title")}</CardTitle>
          <CardDescription>{t("dashboard.team.members.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {membersQuery.isError && (
            <p className="text-destructive text-sm">{membersQuery.error.message}</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("dashboard.team.members.table.member")}</TableHead>
                <TableHead>{t("dashboard.team.members.table.role")}</TableHead>
                {canManage && (
                  <TableHead className="text-right">
                    {t("dashboard.team.members.table.action")}
                  </TableHead>
                )}
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
                          <SelectItem value="member">{t("dashboard.team.roles.member")}</SelectItem>
                          <SelectItem value="admin">{t("dashboard.team.roles.admin")}</SelectItem>
                          <SelectItem value="owner">{t("dashboard.team.roles.owner")}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{translateRole(member.role)}</Badge>
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
                        {t("common.remove")}
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
            <CardTitle>{t("dashboard.team.pending.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sentInvitationsQuery.data?.map((invitation) => (
              <div className="flex items-center justify-between" key={invitation.id}>
                <span>{invitation.email}</span>
                <Badge variant="outline">{translateRole(invitation.role as WorkspaceRole)}</Badge>
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
