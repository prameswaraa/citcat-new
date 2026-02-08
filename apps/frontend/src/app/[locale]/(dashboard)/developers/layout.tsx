import { Header } from "@/components/layout/header"

interface Props {
  children: React.ReactNode
}

export default function DevelopersLayout({ children }: Props) {
  return (
    <>
      <Header />

      <main className="flex min-h-0 flex-1 flex-col p-4">
        {children}
      </main>
    </>
  )
}
