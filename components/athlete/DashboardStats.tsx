'use client';

import { Calendar, Clock, TrendingUp, Award, LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  };

  return (
    <article 
      className="rounded-lg bg-white p-6 shadow"
      aria-label={`${title}: ${value}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900" aria-live="polite">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${colorClasses[color]}`} aria-hidden="true">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </article>
  );
}

interface DashboardStatsProps {
  totalAttendance: number;
  monthlyAttendance: number;
  totalPerformance: number;
  progressPercentage: number;
}

export default function DashboardStats({
  totalAttendance,
  monthlyAttendance,
  totalPerformance,
  progressPercentage,
}: DashboardStatsProps) {
  return (
    <section aria-label="สถิติภาพรวม" className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="การเข้าร่วมทั้งหมด"
        value={totalAttendance}
        icon={Calendar}
        color="blue"
      />
      <StatCard
        title="เดือนนี้"
        value={monthlyAttendance}
        icon={Clock}
        color="green"
      />
      <StatCard
        title="ผลการทดสอบ"
        value={totalPerformance}
        icon={TrendingUp}
        color="purple"
      />
      <StatCard
        title="ความก้าวหน้า"
        value={`${progressPercentage}%`}
        icon={Award}
        color="yellow"
      />
    </section>
  );
}
