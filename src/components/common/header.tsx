"use client"
import { Home, LogIn, Brain, Users, UserPlus, Building, FileText, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '../ui/button'
import React, { useState } from 'react'
import { Show, useOrganization, UserButton, useUser } from "@clerk/nextjs";

const Header = () => {
  const pathname = usePathname();
  const { user } = useUser();
  const { organization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  // Get dynamic navigation based on whether user is in an organization
  const getNavItems = () => {
    const baseItems = [
      { href: "/", label: "Home", icon: <Home className="h-4 w-4" /> },
    ];

    // If user is in an organization
    if (organization) {
      return [
        ...baseItems,
        {
          href: `/${organization.slug}`,
          label: "Organization Dashboard",
          icon: <Building className="h-4 w-4" />,
        },
        {
          href: `/${organization.slug}/documents`,
          label: "Org Documents",
          icon: <FileText className="h-4 w-4" />,
        },
        {
          href: "/select-org",
          label: "Switch Organization",
          icon: <Users className="h-4 w-4" />,
        },
      ];
    }
    // If user is new
    return [
      ...baseItems,
      {
        href: "/select-org",
        label: "Switch Organization",
        icon: <Users className="h-4 w-4" />,
      },
    ];
  };

  const navItems = getNavItems();

  // Close mobile menu whenever a link is clicked
  const closeMenu = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Brain className="h-6 w-6 text-blue-600" />
          DocuAI
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <Button variant={isActive ? "secondary" : "ghost"} size="sm" className="gap-2">
                  {item.icon}
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-4">
          <Show when="signed-in">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {organization
                  ? `In: ${organization.name}`
                  : user?.firstName || user?.username}
              </span>
              <UserButton />
            </div>
          </Show>

          <Show when="signed-out">
            <div className="flex items-center gap-2">
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  <LogIn className="h-4 w-4 mr-1" />
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Sign Up
                </Button>
              </Link>
            </div>
          </Show>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="md:hidden border-t bg-white px-4 py-4 space-y-2">
          {/* Mobile Nav Links */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} onClick={closeMenu}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start gap-2"
                  >
                    {item.icon}
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Mobile Auth */}
          <div className="border-t pt-4 mt-2">
            <Show when="signed-in">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {organization
                    ? `In: ${organization.name}`
                    : user?.firstName || user?.username}
                </span>
                <UserButton />
              </div>
            </Show>

            <Show when="signed-out">
              <div className="flex flex-col gap-2">
                <Link href="/sign-in" onClick={closeMenu}>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up" onClick={closeMenu}>
                  <Button size="sm" className="w-full justify-start">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
              </div>
            </Show>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header