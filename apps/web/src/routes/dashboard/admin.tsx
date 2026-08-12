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
      toast.success("User status updated")
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-3xl">System administration</h1>
        <p className="text-muted-foreground">Manage users and inspect every workspace.</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Disabling a user immediately revokes their sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersQuery.isError && (
                <p className="text-destructive text-sm">{usersQuery.error.message}</p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(usersQuery.data ?? []).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-muted-foreground text-sm">{user.email}</div>
                      </TableCell>
                      <TableCell>{user.role || "user"}</TableCell>
                      <TableCell>
                        <Badge variant={user.banned ? "destructive" : "secondary"}>
                          {user.banned ? "Disabled" : "Active"}
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
                          {user.banned ? "Enable" : "Disable"}
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
              <CardTitle>All workspaces</CardTitle>
              <CardDescription>
                System-wide workspace visibility for the superadmin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workspacesQuery.isError && (
                <p className="text-destructive text-sm">{workspacesQuery.error.message}</p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Created</TableHead>
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
