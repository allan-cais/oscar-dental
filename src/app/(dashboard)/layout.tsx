"use client"

import { useState } from "react"
import { Authenticated, AuthLoading } from "convex/react"
import { Sidebar, MobileSidebar } from "@/components/dashboard/sidebar"
import { Topbar } from "@/components/dashboard/topbar"
import { ChatContextProvider } from "@/lib/chat-context"
import { ChatPanel } from "@/components/chat/chat-panel"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <>
      <AuthLoading>
        <div className="flex h-screen items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AuthLoading>
      <Authenticated>
        <ChatContextProvider>
          <div className="flex h-screen overflow-hidden">
            {/* Desktop sidebar */}
            <div className="hidden lg:flex">
              <Sidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed(!collapsed)}
              />
            </div>

            {/* Mobile sidebar */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetContent side="left" className="w-[280px] p-0" showCloseButton>
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-14 items-center gap-2 px-4 border-b">
                  <span className="text-lg font-bold tracking-tight">Oscar</span>
                </div>
                <div onClick={() => setMobileOpen(false)}>
                  <MobileSidebar />
                </div>
              </SheetContent>
            </Sheet>

            {/* Main content */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <Topbar
                onMenuClick={() => setMobileOpen(true)}
                onChatClick={() => setChatOpen(true)}
              />
              <main className="flex-1 overflow-y-auto p-4 md:p-6">
                {children}
              </main>
            </div>

            {/* Chat Panel */}
            <Sheet open={chatOpen} onOpenChange={setChatOpen}>
              <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
                <SheetTitle className="sr-only">Oscar AI Chat</SheetTitle>
                <ChatPanel />
              </SheetContent>
            </Sheet>
          </div>
        </ChatContextProvider>
      </Authenticated>
    </>
  )
}
