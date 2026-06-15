'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { PageHeader } from '@/components/page-header';
import { campaignApi } from '@/lib/api-client';
import { formatINR } from '@/lib/utils';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([campaignApi.dashboard(), campaignApi.list()])
      .then(([s, c]) => { setStats(s); setCampaigns(c.data ?? []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Analytics" description="Cross-campaign performance and revenue trends." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold mb-4">Daily revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.revenueSeries ?? []}>
                <defs>
                  <linearGradient id="rev2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(186 55% 42%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(186 55% 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 90%)" />
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip formatter={(v: any) => formatINR(Number(v))} contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(220 13% 90%)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="amount" stroke="hsl(186 55% 42%)" fill="url(#rev2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold mb-4">Audience by channel</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaigns.map((c: any) => ({ name: (c.name || c.title || '').slice(0, 14), audience: c.audience_size, channel: c.channel }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 90%)" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(220 13% 90%)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="audience" fill="hsl(186 55% 42%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
        <div className="border-b px-5 py-3 text-sm font-semibold">All campaigns</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Channel</th>
              <th className="px-4 py-2 font-medium">Audience</th>
              <th className="px-4 py-2 font-medium">Sent</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {campaigns.map((c: any) => (
              <tr key={c.id}>
                <td className="px-4 py-2">
                  <Link href={`/dashboard/campaigns/${c.id}`} className="text-primary hover:underline">{c.name || c.title}</Link>
                </td>
                <td className="px-4 py-2 text-muted-foreground capitalize">{c.channel}</td>
                <td className="px-4 py-2">{c.audience_size}</td>
                <td className="px-4 py-2">{c.sent_count ?? 0}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.status === 'completed' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No campaigns yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
