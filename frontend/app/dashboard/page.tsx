'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, ShoppingBag, IndianRupee, Megaphone, Sparkles, ArrowUpRight } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { PageHeader, StatCard } from '@/components/page-header';
import { campaignApi } from '@/lib/api-client';
import { formatINR } from '@/lib/utils';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    campaignApi.dashboard()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Welcome back"
        description="A live snapshot of your customers, revenue and campaigns — with AI-powered next steps."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Customers" value={loading ? '—' : stats?.totalCustomers?.toLocaleString('en-IN') ?? '0'} icon={<Users className="h-4 w-4" />} hint="across all cities" />
        <StatCard label="Total Orders" value={loading ? '—' : stats?.totalOrders?.toLocaleString('en-IN') ?? '0'} icon={<ShoppingBag className="h-4 w-4" />} accent="success" hint="lifetime" />
        <StatCard label="Lifetime Revenue" value={loading ? '—' : formatINR(stats?.revenue ?? 0)} icon={<IndianRupee className="h-4 w-4" />} accent="warning" hint="all orders" />
        <StatCard label="Campaigns" value={loading ? '—' : stats?.totalCampaigns ?? '0'} icon={<Megaphone className="h-4 w-4" />} hint="draft + sent" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-soft">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Revenue — last 30 days</h3>
            <p className="text-xs text-muted-foreground">Daily order totals</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.revenueSeries ?? []}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(186 55% 42%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(186 55% 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 90%)" />
                <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} fontSize={11} stroke="hsl(225 10% 52%)" />
                <YAxis tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} fontSize={11} stroke="hsl(225 10% 52%)" />
                <Tooltip formatter={(v: any) => formatINR(Number(v))} contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(220 13% 90%)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="amount" stroke="hsl(186 55% 42%)" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold mb-1">Channel mix</h3>
          <p className="text-xs text-muted-foreground mb-4">Campaigns by channel</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.channelMix ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 90%)" />
                <XAxis dataKey="channel" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(220 13% 90%)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(186 55% 42%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="rounded-xl border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">AI Recommendations</h3>
              <p className="text-xs text-muted-foreground">Generated live from your data by Gemini</p>
            </div>
          </div>
          <Link href="/dashboard/segments" className="text-xs text-primary hover:underline flex items-center gap-1">
            Build audience <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {loading && <div className="text-sm text-muted-foreground">Analyzing your customer data…</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(stats?.recommendations ?? []).map((r: any, i: number) => (
            <div key={i} className="rounded-lg border bg-background p-4 hover:shadow-soft transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="font-medium text-sm">{r.title}</div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${r.impact === 'High' ? 'bg-success/10 text-success' : r.impact === 'Medium' ? 'bg-warning/10 text-warning-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {r.impact}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{r.detail}</p>
              <div className="text-xs font-medium text-primary">→ {r.action}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
