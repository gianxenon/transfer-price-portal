import { cookies } from "next/headers"
import { redirect } from "next/navigation" 
import { SidebarInset, SidebarProvider } from "@/src/components/ui/sidebar" 
import { AppSidebar } from "@/src/components/ui/app-sidebar"
import { getSessionById } from "../../infrastructure/db/auth-repo"
import { NextResponse } from "next/server"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value    
    if (!sessionToken) {
        return NextResponse.json({ authenticated: false })
    }

    const session = await getSessionById(sessionToken)
    if (!session) redirect("/login")

    return (
        <SidebarProvider
        style={
            {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
        }
        >
        <AppSidebar variant="inset" />
        <SidebarInset> 
            {children}
        </SidebarInset>
        </SidebarProvider>
    )
}
