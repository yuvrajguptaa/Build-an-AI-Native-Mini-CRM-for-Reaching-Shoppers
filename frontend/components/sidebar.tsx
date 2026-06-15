'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Sparkles, Megaphone, BarChart3, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCRMStore } from '@/store/use-crm-store';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/segments', label: 'Segments', icon: Sparkles },
  { href: '/dashboard/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth } = useCRMStore();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">XenoAI CRM</div>
            <div className="text-[10px] text-muted-foreground">AI-native platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent text-accent-foreground shadow-soft'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">{user?.name ?? 'User'}</div>
            <div className="text-xs text-muted-foreground">{user?.role ?? 'marketer'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
