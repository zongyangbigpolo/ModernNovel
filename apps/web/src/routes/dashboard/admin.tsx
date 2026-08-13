import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { adminApi } from "@/lib/api/admin"
import { authClient } from "@/lib/auth-client"
import { useI18n } from "@/lib/i18n"

export const Route = createFileRoute("/dashboard/admin")({
  component: AdminPage,
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (session.data?.user.role !== "superadmin") {
      throw redirect({ to: "/dashboard" })
    }
  },
})

function AdminPage() {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const { t } = useI18n()
  const translateUserRole = (role: string | null | undefined) => {
    switch (role ?? "user") {
      case "admin":
        return t("dashboard.roles.admin")
      case "member":
        return t("dashboard.roles.member")
      case "owner":
        return t("dashboard.roles.owner")
      case "superadmin":
        return t("dashboard.roles.superadmin")
      default:
        return t("dashboard.roles.user")
    }
  }
  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminApi.listUsers,
  })
  const workspacesQuery = useQuery({
    queryKey: ["admin-workspaces"],
    queryFn: adminApi.listWorkspaces,
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) =>
      adminApi.setUserDisabled(id, disabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      toast.success(t("dashboard.admin.users.statusUpdated"))
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-3xl">{t("dashboard.admin.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.admin.description")}</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">{t("dashboard.admin.tabs.users")}</TabsTrigger>
          <TabsTrigger value="workspaces">{t("dashboard.admin.tabs.workspaces")}</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.admin.users.title")}</CardTitle>
              <CardDescription>{t("dashboard.admin.users.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {usersQuery.isError && (
                <p className="text-destructive text-sm">{usersQuery.error.message}</p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.user")}</TableHead>
                    <TableHead>{t("dashboard.admin.users.table.role")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="text-right">
                      {t("dashboard.admin.users.table.action")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(usersQuery.data ?? []).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-muted-foreground text-sm">{user.email}</div>
                      </TableCell>
                      <TableCell>{translateUserRole(user.role)}</TableCell>
                      <TableCell>
                        <Badge variant={user.banned ? "destructive" : "secondary"}>
                          {user.banned
                            ? t("dashboard.admin.users.status.disabled")
                            : t("dashboard.admin.users.status.active")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          disabled={
                            statusMutation.isPending ||
                            user.id === session?.user.id ||
                            user.role === "superadmin"
                          }
                          onClick={() =>
                            statusMutation.mutate({ id: user.id, disabled: !user.banned })
                          }
                          size="sm"
                          variant={user.banned ? "outline" : "destructive"}
                        >
                          {user.banned
                            ? t("dashboard.admin.users.action.enable")
                            : t("dashboard.admin.users.action.disable")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workspaces">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.admin.workspaces.title")}</CardTitle>
              <CardDescription>{t("dashboard.admin.workspaces.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {workspacesQuery.isError && (
                <p className="text-destructive text-sm">{workspacesQuery.error.message}</p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>{t("dashboard.admin.workspaces.table.slug")}</TableHead>
                    <TableHead>{t("dashboard.admin.workspaces.table.members")}</TableHead>
                    <TableHead>{t("dashboard.admin.workspaces.table.created")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(workspacesQuery.data ?? []).map((workspace) => (
                    <TableRow key={workspace.id}>
                      <TableCell className="font-medium">{workspace.name}</TableCell>
                      <TableCell>{workspace.slug}</TableCell>
                      <TableCell>{workspace.memberCount}</TableCell>
                      <TableCell>{new Date(workspace.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
