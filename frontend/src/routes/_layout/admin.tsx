import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"

import { type UserPublic, UsersService } from "@/client"
import AddUser from "@/components/Admin/AddUser"
import { columns, type UserTableData } from "@/components/Admin/columns"
import { DataTable } from "@/components/Common/DataTable"
import PendingUsers from "@/components/Pending/PendingUsers"
import useAuth from "@/hooks/useAuth"
import { pageTitle } from "@/lib/brand"

function getUsersQueryOptions() {
  return {
    queryFn: async () =>
      (await UsersService.readUsers({ query: { skip: 0, limit: 100 } })).data,
    queryKey: ["users"],
  }
}

export const Route = createFileRoute("/_layout/admin")({
  component: Admin,
  beforeLoad: async () => {
    const { data: user } = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({
        to: "/",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: pageTitle("Administração"),
      },
    ],
  }),
})

function UsersTable() {
  const { user: currentUser } = useAuth()
  const { data: users, isLoading, isError } = useQuery(getUsersQueryOptions())

  if (isLoading) {
    return <PendingUsers />
  }

  if (isError || !users) {
    return (
      <p className="text-sm text-destructive">
        Não foi possível carregar os usuários. Tente novamente.
      </p>
    )
  }

  const tableData: UserTableData[] = (users.data ?? []).map((user: UserPublic) => ({
    ...user,
    isCurrentUser: currentUser?.id === user.id,
  }))

  return <DataTable columns={columns} data={tableData} />
}

function Admin() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Cadastre contas e defina o perfil de acesso (administrador ou operador).
          </p>
        </div>
        <AddUser />
      </div>
      <UsersTable />
    </div>
  )
}
