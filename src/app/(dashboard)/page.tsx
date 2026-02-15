'use client';

import StatsCard from '@/components/dashboard/StatsCard';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import SearchBar from '@/components/search/SearchBar';
import LineChart from '@/components/charts/LineChart';
import PieChart from '@/components/charts/PieChart';
import { Users, TrendingUp, MessageSquare, Activity } from 'lucide-react';

export default function Dashboard() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your overview.</p>
        </div>
        <NotificationCenter />
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value="2,847"
          icon={Users}
          color="blue"
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatsCard
          title="Revenue"
          value="¥324K"
          icon={TrendingUp}
          color="green"
          trend={{ value: 8.2, isPositive: true }}
        />
        <StatsCard
          title="Messages"
          value="1,429"
          icon={MessageSquare}
          color="purple"
          trend={{ value: 3.1, isPositive: false }}
        />
        <StatsCard
          title="Active Now"
          value="142"
          icon={Activity}
          color="orange"
          trend={{ value: 5.4, isPositive: true }}
        />
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h3 className="text-lg font-semibold">AI Chat Assistant</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Intelligent responses powered by Claude AI
          </p>
          <div className="flex items-center text-sm text-blue-600 font-medium">
            <span>Active</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h3 className="text-lg font-semibold">User Profiles</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Manage user information and preferences
          </p>
          <div className="flex items-center text-sm text-blue-600 font-medium">
            <span>Recently Added</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <h3 className="text-lg font-semibold">Analytics</h3>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Track performance metrics and insights
          </p>
          <div className="flex items-center text-sm text-gray-500 font-medium">
            <span>Coming Soon</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">🔔 Notification Center Added!</h2>
        <p className="mb-4 opacity-90">
          Stay updated with real-time notifications for system updates, messages, and alerts. Click the bell icon in the header to view your notifications.
        </p>
        <button className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
          View Notifications
        </button>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <LineChart />
        <PieChart />
      </div>
    </div>
  );
}
