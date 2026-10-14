'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  ClipboardCheck,
  MapPin,
  Users,
  FileSpreadsheet,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { admin, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Attendance', href: '/attendance', icon: ClipboardCheck },
    { label: 'Locations', href: '/locations', icon: MapPin },
    { label: 'Users', href: '/users', icon: Users },
    { label: 'Reports', href: '/reports', icon: FileSpreadsheet },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div>
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <ShieldCheck size={22} />
          </div>
          <div className="sidebar-brand">
            <h1>GeoAttend</h1>
            <span>Admin Console</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        {admin && (
          <div className="user-profile-row">
            <div className="user-avatar">{getInitials(admin.name)}</div>
            <div className="user-info">
              <div className="user-name">{admin.name || 'Admin'}</div>
              <div className="user-role">{admin.role}</div>
            </div>
          </div>
        )}
        <button className="btn-logout" onClick={() => logout()}>
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
