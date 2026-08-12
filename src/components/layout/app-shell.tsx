import { useEffect, useRef, useState } from 'react'
import {
  BoxesIcon,
  ChartNoAxesColumnIcon,
  KeyRoundIcon,
  LogOutIcon,
  UsersIcon,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { logoutAuthSession } from '@/features/auth/auth-session'
import type { AuthUser, AuthUserRole } from '@/features/auth/auth-types'
import { useAuthState } from '@/features/auth/use-auth-state'

const primaryNavigation = [
  {
    label: 'Providers',
    href: '/providers',
    icon: BoxesIcon,
    superAdminOnly: true,
  },
  {
    label: 'API Keys',
    href: '/api-keys',
    icon: KeyRoundIcon,
    superAdminOnly: false,
  },
  {
    label: 'Usage',
    href: '/usage',
    icon: ChartNoAxesColumnIcon,
    superAdminOnly: false,
  },
] as const

const administrationNavigation = [
  {
    label: 'Users',
    href: '/users',
    icon: UsersIcon,
    superAdminOnly: true,
  },
] as const

export function AppShell() {
  const authState = useAuthState()
  const location = useLocation()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 })
  }, [location.pathname, location.search])

  if (authState.status !== 'authenticated') {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar user={authState.user} />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden bg-background">
        <header className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-card/85 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
            <span className="truncate text-sm font-medium text-muted-foreground">
              {getPageTitle(location.pathname)}
            </span>
          </div>
        </header>
        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10"
        >
          <div className="mx-auto flex w-full max-w-7xl flex-col pb-10">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppSidebar({ user }: { user: AuthUser }) {
  const { isMobile, setOpenMobile } = useSidebar()

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r border-sidebar-border/70">
      <SidebarHeader className="pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Provider"
              render={
                <NavLink
                  to={user.role === 'super_admin' ? '/providers' : '/api-keys'}
                  onClick={closeMobileSidebar}
                />
              }
              className="hover:bg-transparent active:bg-transparent"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/20">
                <BoxesIcon className="size-4" />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold tracking-tight">Provider</span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  Control plane
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-1">
        <SidebarGroup className="pt-3">
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavigationMenu
              items={primaryNavigation.filter(
                (item) => !item.superAdminOnly || user.role === 'super_admin',
              )}
              onNavigate={closeMobileSidebar}
            />
          </SidebarGroupContent>
        </SidebarGroup>
        {user.role === 'super_admin' ? (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavigationMenu
                items={administrationNavigation}
                onNavigate={closeMobileSidebar}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserAccount user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

type NavigationItem = {
  label: string
  href: string
  icon: typeof BoxesIcon
  superAdminOnly: boolean
}

function NavigationMenu({
  items,
  onNavigate,
}: {
  items: readonly NavigationItem[]
  onNavigate: () => void
}) {
  const location = useLocation()

  return (
    <SidebarMenu className="gap-1.5">
      {items.map((item) => {
        const isActive =
          location.pathname === item.href ||
          location.pathname.startsWith(`${item.href}/`)

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              tooltip={item.label}
              isActive={isActive}
              render={<NavLink to={item.href} onClick={onNavigate} />}
              className="h-9 rounded-lg px-2.5 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:shadow-xs"
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

function UserAccount({ user }: { user: AuthUser }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)

    try {
      await logoutAuthSession()
    } catch {
      // Local session cleanup is guaranteed by logoutAuthSession.
    }
  }

  return (
    <div className="flex h-12 min-w-0 items-center gap-2 rounded-lg bg-sidebar-accent/60 p-2 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!">
      <div className="flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:justify-center">
        <Avatar className="rounded-lg" size="default">
          <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            {getUserInitial(user.username)}
          </AvatarFallback>
        </Avatar>
        <div className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
          <span className="truncate text-sm font-medium">{user.username}</span>
          <span className="truncate text-xs text-sidebar-foreground/60">
            {formatRole(user.role)}
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Log out ${user.username}`}
        title="Log out"
        disabled={isLoggingOut}
        onClick={() => void handleLogout()}
        className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden"
      >
        <LogOutIcon className={isLoggingOut ? 'animate-pulse' : undefined} />
      </Button>
    </div>
  )
}

function getPageTitle(pathname: string): string {
  if (pathname === '/providers/new') {
    return 'Add provider'
  }

  if (pathname.startsWith('/providers/')) {
    return 'Provider details'
  }

  if (pathname === '/users') {
    return 'Users'
  }

  const navigation = [...primaryNavigation, ...administrationNavigation]
  return (
    navigation.find(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.label ?? 'Provider'
  )
}

function getUserInitial(username: string): string {
  return username.trim().charAt(0).toUpperCase() || 'U'
}

function formatRole(role: AuthUserRole): string {
  return role === 'super_admin' ? 'Super admin' : 'User'
}
