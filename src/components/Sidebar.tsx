import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Radio,
  Lightbulb,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useState } from 'react';

const navItems = [
  { to: '/chart', icon: TrendingUp, label: 'Testing' },
  { to: '/live', icon: Radio, label: 'Live' },
  { to: '/strategies', icon: Lightbulb, label: 'Strategies' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { subscription, isPro } = useSubscription();
  const [collapsed, setCollapsed] = useState(false);

  const initials = subscription.username?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'TR';

  return (
    <div
      className={`bg-[#0a0e17] border-r border-[#1a2332] flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo Area */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-[#1a2332]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">Market Weaver</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* Profile Section */}
      <div className="p-4 border-b border-[#1a2332]">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <Avatar className="w-10 h-10">
            <AvatarImage src={subscription.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {subscription.username || 'Trader'}
              </p>
              <Badge variant={isPro ? 'default' : 'secondary'} className="mt-1">
                {isPro ? 'PRO' : 'FREE'}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-muted-foreground hover:bg-[#1a2332] hover:text-white'
              }`
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className={`w-5 h-5 flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle (Bottom) */}
      {!collapsed && (
        <div className="p-4 border-t border-[#1a2332]">
          <div className="text-xs text-muted-foreground text-center">
            Future Data Simulator
          </div>
        </div>
      )}
    </div>
  );
}
