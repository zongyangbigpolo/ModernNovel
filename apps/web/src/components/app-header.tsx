import { Link, useRouterState } from "@tanstack/react-router"

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { useI18n } from "@/lib/i18n"

import { LanguageSwitcher } from "./language-switcher"
import { ModeToggle } from "./mode-toggle"
import { Button } from "./ui/button"
import { Logo } from "./ui/logo"
import UserMenu from "./user-menu"

export default function AppHeader() {
  const { t } = useI18n()
  const location = useRouterState({
    select: (s) => s.location.pathname,
  })

  const isIndexPage = location === "/"
  const isAuthPage = location === "/login" || location === "/register"

  const navigationItems = [
    { to: "/", label: t("nav.home") },
    { to: "/dashboard", label: t("nav.dashboard") },
  ].filter((item) => !isIndexPage || (item.to !== "/" && item.to !== "/dashboard"))

  return (
    <header className="sticky top-0 z-50 w-full border-border/40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4">
        {/* Logo */}
        <Logo className="mr-4 sm:mr-6 lg:mr-8" size="md" to="/" />

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {navigationItems.map((item) => (
              <NavigationMenuItem key={item.to}>
                <Link to={item.to}>
                  <Button size="sm" variant="ghost">
                    {item.label}
                  </Button>
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Spacer */}
        <div className="flex flex-1 items-center justify-end">
          <nav className="flex items-center space-x-2">
            {/* Desktop Navigation */}
            <div className="hidden items-center space-x-2 md:flex">
              <LanguageSwitcher />
              <ModeToggle />
              {!isAuthPage && <UserMenu />}
            </div>

            {/* Mobile Sign In Button */}
            <div className="flex items-center space-x-2 md:hidden">
              <LanguageSwitcher />
              <ModeToggle />
              {!isAuthPage && <UserMenu compact />}
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
