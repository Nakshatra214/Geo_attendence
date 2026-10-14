'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AdminGuardProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminGuard({ children, title }: AdminGuardProps) {
  const { admin, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !admin) {
      router.push('/login');
    }
  }, [admin, loading, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className="app-layout">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="main-content">
        <TopBar title={title} onToggleMobile={() => setMobileOpen(!mobileOpen)} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
