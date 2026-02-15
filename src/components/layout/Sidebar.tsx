'use client';

import { Home, Settings, LogOut, User, Users } from 'lucide-react';
import Link from 'next/link';

export default function Sidebar() {
  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/' },
    { icon: Users, label: 'Users', href: '/users' },
    { icon: User, label: 'Profile', href: '/profile' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <div className="w-64 h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">AI SaaS Platform</h1>
      </div>

      <nav className="flex-1 p-4">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors w-full"
          onClick={() => {/* Add logout logic */}}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
