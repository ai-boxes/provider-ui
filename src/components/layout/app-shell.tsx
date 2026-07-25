import { useState } from 'react'
import {
  BoxesIcon,
  ChevronsUpDownIcon,
  KeyRoundIcon,
  LogOutIcon,
  UsersIcon,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  },
  {
    label: 'API Keys',
    href: '/api-keys',
    icon: KeyRoundIcon,
  },
] as const

const adminNavigation = [
  {
    label: 'Users',
    href: '/users',
    icon: UsersIcon,
  },
] as const

export function AppShell() {
  const authState = useAuthState()
  const location = useLocation()

  if (authState.status !== 'authenticated') {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar user={authState.session.user} />
      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-sm sm:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-sm font-semibold tracking-tight">
            {getPageTitle(location.pathname)}
          </h1>
        </header>
        <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
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
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Provider"
              render={<NavLink to="/providers" onClick={closeMobileSidebar} />}
              className="hover:bg-transparent active:bg-transparent"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-xs">
                <BoxesIcon className="size-4" />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">Provider</span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  Control plane
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavigationMenu
              items={primaryNavigation}
              onNavigate={closeMobileSidebar}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {user.role === 'super_admin' ? (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavigationMenu
                items={adminNavigation}
                onNavigate={closeMobileSidebar}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="pb-3">
        <UserMenu user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

type NavigationItem = {
  label: string
  href: string
  icon: typeof BoxesIcon
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
    <SidebarMenu className="gap-1">
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

function UserMenu({ user }: { user: AuthUser }) {
  const { isMobile } = useSidebar()
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
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-popup-open:bg-sidebar-accent"
              />
            }
          >
            <Avatar className="rounded-lg" size="default">
              <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {getUserInitial(user.username)}
              </AvatarFallback>
            </Avatar>
            <span className="grid flex-1 text-left leading-tight">
              <span className="truncate font-medium">{user.username}</span>
              <span className="truncate text-xs text-sidebar-foreground/60">
                {formatRole(user.role)}
              </span>
            </span>
            <ChevronsUpDownIcon className="ml-auto size-4 text-sidebar-foreground/60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? 'bottom' : 'top'}
            align="end"
            sideOffset={8}
            className="w-56 min-w-56"
          >
            <DropdownMenuLabel className="p-2 font-normal">
              <div className="flex items-center gap-2">
                <Avatar className="rounded-lg" size="default">
                  <AvatarFallback className="rounded-lg">
                    {getUserInitial(user.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate text-sm font-medium text-foreground">
                    {user.username}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {formatRole(user.role)}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
            >
              <LogOutIcon />
              {isLoggingOut ? 'Logging out…' : 'Log out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function getPageTitle(pathname: string): string {
  if (pathname === '/providers/new') {
    return 'Add provider'
  }

  if (pathname.startsWith('/providers/')) {
    return 'Provider details'
  }

  const navigation = [...primaryNavigation, ...adminNavigation]
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
