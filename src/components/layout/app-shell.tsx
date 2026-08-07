import { useState } from 'react'
import {
  BoxesIcon,
  ChartNoAxesColumnIcon,
  KeyRoundIcon,
  LogOutIcon,
  UsersIcon,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
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
  {
    label: 'Usage',
    href: '/usage',
    icon: ChartNoAxesColumnIcon,
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
      <AppSidebar />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden bg-background">
        <header className="z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-card/85 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
            <span className="truncate text-sm font-medium text-muted-foreground">
              {getPageTitle(location.pathname)}
            </span>
          </div>
          <UserMenu user={authState.session.user} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <div className="mx-auto flex w-full max-w-7xl flex-col pb-10">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppSidebar() {
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
              render={<NavLink to="/providers" onClick={closeMobileSidebar} />}
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
              items={primaryNavigation}
              onNavigate={closeMobileSidebar}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

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

function UserMenu({ user }: { user: AuthUser }) {
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
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Open account menu for ${user.username}`}
        className={buttonVariants({
          variant: 'ghost',
          size: 'icon',
          className:
            'rounded-full data-open:bg-muted data-popup-open:bg-muted',
        })}
      >
        <Avatar size="default">
          <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
            {getUserInitial(user.username)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-56 min-w-56"
      >
        <DropdownMenuGroup>
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
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {user.role === 'super_admin' ? (
          <>
            <DropdownMenuItem render={<NavLink to="/users" />}>
              <UsersIcon />
              Users
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
        >
          <LogOutIcon />
          {isLoggingOut ? 'Logging out…' : 'Log out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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

  const navigation = primaryNavigation
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
