"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Menu, LogOut, User, Settings, Bell, Info, AlertTriangle, CheckCircle2, X, MessageSquare } from "lucide-react"
import { useChatContext } from "@/lib/chat-context"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type NotificationType = "info" | "warning" | "action_required" | "success"

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timeAgo: string
  read: boolean
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "action_required",
    title: "Claim Denied — D2740",
    message: "Claim CLM-9823 denied by Delta Dental. Appeal deadline in 5 days.",
    timeAgo: "3 min ago",
    read: false,
  },
  {
    id: "n2",
    type: "warning",
    title: "Twilio Latency Elevated",
    message: "SMS delivery times averaging 450ms, above 400ms threshold.",
    timeAgo: "8 min ago",
    read: false,
  },
  {
    id: "n3",
    type: "info",
    title: "Batch Sync Complete",
    message: "1,247 patient records synced from OpenDental.",
    timeAgo: "18 min ago",
    read: false,
  },
  {
    id: "n4",
    type: "action_required",
    title: "New 1-Star Review",
    message: "Patient left a 1-star review on Google. Response draft ready.",
    timeAgo: "22 min ago",
    read: false,
  },
  {
    id: "n5",
    type: "success",
    title: "Payment Received",
    message: "$245.00 collected via Text-to-Pay for PAT-1847.",
    timeAgo: "35 min ago",
    read: false,
  },
  {
    id: "n6",
    type: "info",
    title: "Quick Fill Match",
    message: "Patient Maria Santos confirmed for tomorrow's 2PM gap slot.",
    timeAgo: "42 min ago",
    read: false,
  },
  {
    id: "n7",
    type: "action_required",
    title: "Write-Off Pending Approval",
    message: "Mike Chen submitted $1,200 write-off for CLM-7621. Needs admin approval.",
    timeAgo: "1 hr ago",
    read: false,
  },
  {
    id: "n8",
    type: "success",
    title: "Eligibility Batch Complete",
    message: "892 patients verified. 3 failures need manual review.",
    timeAgo: "2 hrs ago",
    read: true,
  },
  {
    id: "n9",
    type: "info",
    title: "Daily Huddle Ready",
    message: "Tomorrow's huddle report generated. 14 patients, $12,400 production target.",
    timeAgo: "3 hrs ago",
    read: true,
  },
  {
    id: "n10",
    type: "warning",
    title: "A/R Aging Alert",
    message: "12 claims over 60 days in A/R. Total: $8,340.",
    timeAgo: "4 hrs ago",
    read: true,
  },
  {
    id: "n11",
    type: "success",
    title: "Appeal Won",
    message: "Appeal for CLM-8102 approved by Cigna. $890 payment incoming.",
    timeAgo: "5 hrs ago",
    read: true,
  },
  {
    id: "n12",
    type: "info",
    title: "Recall Reminders Sent",
    message: "47 recall SMS reminders sent. 12 confirmed so far.",
    timeAgo: "6 hrs ago",
    read: true,
  },
]

function notificationIcon(type: NotificationType) {
  switch (type) {
    case "info":
      return <Info className="size-4 shrink-0 text-blue-500" />
    case "warning":
      return <AlertTriangle className="size-4 shrink-0 text-yellow-500" />
    case "action_required":
      return <Bell className="size-4 shrink-0 text-red-500" />
    case "success":
      return <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
  }
}

/** Convex IDs are lowercase alphanumeric strings 20+ chars — detect them to swap in friendly names */
const CONVEX_ID_RE = /^[a-z0-9]{20,}$/

function getBreadcrumbs(pathname: string, entityName?: string) {
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: { label: string; href: string }[] = []

  let path = ""
  for (const segment of segments) {
    path += `/${segment}`
    let label: string
    if (CONVEX_ID_RE.test(segment) && entityName) {
      label = entityName
    } else {
      label = segment
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    }
    crumbs.push({ label, href: path })
  }

  return crumbs
}

export function Topbar({ onMenuClick, onChatClick }: { onMenuClick: () => void; onChatClick?: () => void }) {
  const pathname = usePathname()
  const { entityData } = useChatContext()
  const entityName = entityData?.patientName as string | undefined
  const breadcrumbs = getBreadcrumbs(pathname, entityName)
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)

  const unreadCount = notifications.filter((n) => !n.read).length

  function markAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  function dismissNotification(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="size-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className="text-muted-foreground/50">/</span>
            )}
            {i === breadcrumbs.length - 1 ? (
              <span className="font-medium text-foreground">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notification Bell */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="relative">
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <div className="flex items-center justify-between pr-8">
              <SheetTitle>Notifications</SheetTitle>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-sm text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
          </SheetHeader>
          <div className="mt-2 flex flex-col gap-1 overflow-y-auto px-4 pb-4">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No notifications
              </p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group relative flex gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50 ${
                    !notification.read ? "bg-muted/30" : ""
                  }`}
                  onClick={() => markAsRead(notification.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") markAsRead(notification.id)
                  }}
                >
                  <div className="mt-0.5">{notificationIcon(notification.type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="text-sm font-medium leading-tight">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="mt-1 inline-block size-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {notification.timeAgo}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      dismissNotification(notification.id)
                    }}
                    className="absolute top-2 right-2 hidden rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground group-hover:block"
                    aria-label="Dismiss notification"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Chat button */}
      <Button variant="ghost" size="icon-sm" onClick={onChatClick}>
        <MessageSquare className="size-5" />
        <span className="sr-only">Oscar AI Chat</span>
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar>
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">User</p>
              <p className="text-xs leading-none text-muted-foreground">
                user@canopydental.com
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <User className="mr-2 size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 size-4" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <LogOut className="mr-2 size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
