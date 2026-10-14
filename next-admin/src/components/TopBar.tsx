'use client';

import React from 'react';
import { Menu } from 'lucide-react';

interface TopBarProps {
  title: string;
  onToggleMobile?: () => void;
}

export default function TopBar({ title, onToggleMobile }: TopBarProps) {
  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onToggleMobile && (
          <button
            onClick={onToggleMobile}
            style={{
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
            }}
            className="mobile-only-btn"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="topbar-title">{title}</div>
      </div>

      <div className="topbar-actions">
        <div className="badge-indicator">
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
          Supabase Connected
        </div>
      </div>
    </header>
  );
}
