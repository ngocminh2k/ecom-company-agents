"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart, 
  ShoppingBag, 
  Store, 
  Truck, 
  DollarSign, 
  Search, 
  MessageCircle, 
  Rocket 
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: BarChart },
  { name: 'Products', path: '/products', icon: ShoppingBag },
  { name: 'Listings', path: '/listings', icon: Store },
  { name: 'Fulfillment', path: '/fulfillment', icon: Truck },
  { name: 'Finance', path: '/finance', icon: DollarSign },
  { name: 'Research', path: '/research', icon: Search },
  { name: 'Support', path: '/support', icon: MessageCircle },
  { name: 'Launch', path: '/launch', icon: Rocket },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-background border-r flex flex-col h-full overflow-y-auto">
      <div className="h-14 flex items-center px-4 font-bold border-b">
        AgentPulse Commerce
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive 
                  ? "bg-accent text-accent-foreground font-medium" 
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
