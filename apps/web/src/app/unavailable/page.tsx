// Página genérica de host indisponível (D6 do design.md de
// `review-web-frontend-architecture`): deliberadamente sem branding, sem
// nome de banca e sem qualquer conteúdo que dependa do host — o `proxy.ts`
// reescreve para cá tanto tenant inexistente quanto inativo/reservado/
// inválido, e este componente não pode reintroduzir a distinção que o
// backend já colapsou em `{ available: false }`.
export default function UnavailablePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold">Endereço indisponível</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este endereço não está disponível no momento.
        </p>
      </div>
    </main>
  )
}
