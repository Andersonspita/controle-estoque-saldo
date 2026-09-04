import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { type UserPublic, UsersService } from "@/client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const formSchema = z
  .object({
    email: z.email({ message: "Informe um e-mail válido" }),
    full_name: z.string().optional(),
    password: z
      .string()
      .min(8, { message: "A senha deve ter pelo menos 8 caracteres" })
      .optional()
      .or(z.literal("")),
    confirm_password: z.string().optional(),
    perfil: z.enum(["ADMIN", "OPERADOR"]),
    is_active: z.boolean().optional(),
    pode_estornar: z.boolean().optional(),
  })
  .refine((data) => !data.password || data.password === data.confirm_password, {
    message: "As senhas não coincidem",
    path: ["confirm_password"],
  })

type FormData = z.infer<typeof formSchema>

function perfilDoUsuario(user: UserPublic): "ADMIN" | "OPERADOR" {
  const perfil = (user.perfil || "").toUpperCase()
  if (perfil === "ADMIN" || user.is_superuser) return "ADMIN"
  return "OPERADOR"
}

interface EditUserProps {
  user: UserPublic
  onSuccess: () => void
}

const EditUser = ({ user, onSuccess }: EditUserProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      email: user.email,
      full_name: user.full_name ?? undefined,
      perfil: perfilDoUsuario(user),
      is_active: user.is_active,
      // Campo novo no backend; o client gerado ainda não o tipa.
      pode_estornar: Boolean((user as any).pode_estornar),
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const { confirm_password: _, ...submitData } = data
      const password = submitData.password || undefined
      return UsersService.updateUser({
        path: { user_id: user.id },
        body: {
          email: submitData.email,
          full_name: submitData.full_name,
          password,
          perfil: submitData.perfil,
          is_superuser: submitData.perfil === "ADMIN",
          is_active: submitData.is_active,
          ...({ pode_estornar: submitData.pode_estornar ?? false } as Record<
            string,
            unknown
          >),
        },
      })
    },
    onSuccess: () => {
      showSuccessToast("Usuário atualizado")
      setIsOpen(false)
      onSuccess()
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuItem
        onSelect={(e) => e.preventDefault()}
        onClick={() => setIsOpen(true)}
      >
        <Pencil />
        Editar
      </DropdownMenuItem>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Editar usuário</DialogTitle>
              <DialogDescription>
                Atualize dados, senha e o perfil de acesso.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      E-mail <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="usuario@exemplo.com"
                        type="email"
                        {...field}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Deixe em branco para manter"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar senha</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Confirme a nova senha"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="perfil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o perfil" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OPERADOR">Operador</SelectItem>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pode_estornar"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <div className="flex items-center gap-3">
                      <FormControl>
                        <Checkbox
                          checked={form.watch("perfil") === "ADMIN" || field.value}
                          disabled={form.watch("perfil") === "ADMIN"}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Pode estornar baixas e excluir notas fiscais
                      </FormLabel>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {form.watch("perfil") === "ADMIN"
                        ? "Administradores já têm essa permissão."
                        : "Sem isso, o usuário lança e edita notas, mas não desfaz baixas nem exclui."}
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Ativo</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={mutation.isPending}>
                  Cancelar
                </Button>
              </DialogClose>
              <LoadingButton type="submit" loading={mutation.isPending}>
                Salvar
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default EditUser
