'use client';

import { UserButton } from '@clerk/nextjs';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 hidden sm:block">
          Admin Panel
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <UserButton
          showName
          appearance={{
            elements: {
              userButtonBox: 'flex-row-reverse',
              userButtonOuterIdentifier: 'text-sm font-medium text-gray-700',
            },
          }}
        />
      </div>
    </header>
  );
}
