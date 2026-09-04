"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Layers, 
  Users, 
  Package, 
  Calculator, 
  BarChart3, 
  Activity,
  Boxes,
  Plus,
  BookOpen,
  Clock,
  Sparkles,
  ShoppingBag
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { href: "/", label: "Dashboard", icon: BarChart3 },
    { href: "/orders", label: "Orders", icon: ShoppingBag },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/workflow", label: "Stage Board", icon: Layers },
    { href: "/employees", label: "Employees", icon: Users },
    { href: "/logbook", label: "Log Book", icon: BookOpen },
    { href: "/materials", label: "Materials", icon: Calculator },
    { href: "/articles", label: "Stock", icon: Package },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border-ui px-4 lg:px-8 py-2">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <Link href="/" className="flex items-center gap-2.5">
            <Boxes className="w-5 h-5 text-accent" />
            <div>
              <span className="font-semibold text-sm text-ink">
                Himalaya Udhyog
              </span>
              <p className="text-[11px] text-ink-muted leading-tight">Footwear Production</p>
            </div>
          </Link>
        </div>

        {/* Nav Tabs */}
        <nav className="flex items-center gap-0.5 overflow-x-auto w-full md:w-auto scrollbar-none">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-accent/10 text-accent font-semibold"
                    : "text-ink-muted hover:text-ink hover:bg-stone-100"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-accent" : "text-stone-400"}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Clock */}
        <div className="hidden md:flex items-center gap-2 text-xs text-ink-muted">
          <Clock className="w-3.5 h-3.5" />
          <span className="tabular-nums text-[11px]">
            {time || "--:--:--"}
          </span>
        </div>
      </div>
    </header>
  );
}
