import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import adminApi from '../../lib/adminApi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const emptyStats = { users: 0, courses: 0, skillPaths: 0, certificates: 0 };

export default function AdminDashboardHome() {
  const [data, setData] = React.useState({ stats: emptyStats, charts: { monthlyUsers: [], completionTrends: [] }, recentActivities: [] });

  React.useEffect(() => {
    adminApi.get('/dashboard/overview').then((res) => setData(res.data)).catch(() => null);
  }, []);

  const stats = data.stats || emptyStats;
  const usersChart = {
    labels: data.charts.monthlyUsers.map((i) => i.month),
    datasets: [{ label: 'New Users', data: data.charts.monthlyUsers.map((i) => i.count), borderColor: '#0f766e', backgroundColor: 'rgba(15,118,110,0.2)' }]
  };
  const completionChart = {
    labels: data.charts.completionTrends.map((i) => i.month),
    datasets: [{ label: 'Course Completions', data: data.charts.completionTrends.map((i) => i.count), backgroundColor: '#0ea5e9' }]
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Users', value: stats.users },
          { label: 'Total Courses', value: stats.courses },
          { label: 'Total Skill Paths', value: stats.skillPaths },
          { label: 'Certificates Issued', value: stats.certificates }
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-lg font-semibold">Monthly User Registrations</h3>
          <Line data={usersChart} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-lg font-semibold">Course Completion Trends</h3>
          <Bar data={completionChart} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-semibold">Recent Activity</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Message</th>
                <th className="px-2 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentActivities.map((item) => (
                <tr key={item._id} className="border-b border-slate-100 dark:border-slate-800/70">
                  <td className="px-2 py-2">{item.type}</td>
                  <td className="px-2 py-2">{item.message}</td>
                  <td className="px-2 py-2">{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {data.recentActivities.length === 0 && (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={3}>
                    No activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
