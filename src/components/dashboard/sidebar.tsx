"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  Brain,
  Calendar,
  CheckSquare,
  ChevronDown,
  CreditCard,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Settings,
  Star,
  Users,
} from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: { label: string; href: string }[]
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Scheduling", href: "/scheduling", icon: Calendar },
  {
    label: "RCM",
    href: "/rcm",
    icon: FileText,
    children: [
      { label: "Eligibility", href: "/rcm/eligibility" },
      { label: "Claims", href: "/rcm/claims" },
      { label: "Denials", href: "/rcm/denials" },
      { label: "A/R", href: "/rcm/ar" },
    ],
  },
  {
    label: "Payments",
    href: "/payments",
    icon: CreditCard,
    children: [
      { label: "Text-to-Pay", href: "/payments/text-to-pay" },
      { label: "Payment Plans", href: "/payments/payment-plans" },
      { label: "Collections", href: "/payments/collections" },
      { label: "Reconciliation", href: "/payments/reconciliation" },
    ],
  },
  { label: "Reputation", href: "/reputation", icon: Star },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "AI Actions", href: "/ai", icon: Brain },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    children: [
      { label: "Practice", href: "/settings/practice" },
      { label: "Users", href: "/settings/users" },
      { label: "Fee Schedules", href: "/settings/fee-schedules" },
      { label: "Audit Log", href: "/settings/audit-log" },
    ],
  },
  { label: "Health", href: "/health", icon: HeartPulse },
]

function NavItemLink({
  item,
  collapsed,
}: {
  item: NavItem
  collapsed: boolean
}) {
  const pathname = usePathname()
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/")
  const [open, setOpen] = useState(isActive && !!item.children)

  const hasChildren = item.children && item.children.length > 0
  const Icon = item.icon

  if (collapsed) {
    return (
      <Link
        href={item.href}
        title={item.label}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className="size-4" />
      </Link>
    )
  }

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={item.href}
          className={cn(
            "flex h-9 flex-1 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
        {hasChildren && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="ml-auto mr-1 text-sidebar-foreground/50 hover:text-sidebar-foreground"
            onClick={() => setOpen(!open)}
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </Button>
        )}
      </div>
      {hasChildren && open && (
        <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
          {item.children!.map((child) => {
            const childActive = pathname === child.href
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex h-8 items-center rounded-md px-2 text-sm transition-colors",
                  childActive
                    ? "font-medium text-sidebar-accent-foreground bg-sidebar-accent"
                    : "text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
                )}
              >
                {child.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[60px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Activity className="size-6 shrink-0 text-sidebar-primary" />
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
              Oscar
            </span>
          )}
        </Link>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className={cn("flex flex-col", collapsed ? "items-center gap-1" : "gap-0.5")}>
          {navItems.map((item) => (
            <NavItemLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      {/* Collapse toggle */}
      <Separator />
      <div className="flex h-12 items-center justify-center px-2">
        <Button
          variant="ghost"
          size={collapsed ? "icon-xs" : "sm"}
          onClick={onToggle}
          className="text-sidebar-foreground/50 hover:text-sidebar-foreground"
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              collapsed ? "-rotate-90" : "rotate-90"
            )}
          />
          {!collapsed && <span className="text-xs">Collapse</span>}
        </Button>
      </div>
    </aside>
  )
}

export function MobileSidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5 px-2 py-3">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <div key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground/70 hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
            {item.children && isActive && (
              <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l pl-3">
                {item.children.map((child) => {
                  const childActive = pathname === child.href
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "flex h-9 items-center rounded-md px-2 text-sm transition-colors",
                        childActive
                          ? "font-medium text-accent-foreground bg-accent"
                          : "text-foreground/60 hover:text-accent-foreground hover:bg-accent"
                      )}
                    >
                      {child.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
