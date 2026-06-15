'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Sparkles, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, Legend } from 'recharts';
import { campaignApi } from '@/lib/api-client';
import { toast } from 'sonner';

function statusBadge(status: string) {
  if (status === 'completed') return 'bg-success/10 text-success';
  if (status === 'running') return 'bg-warning/10 text-warning-foreground animate-pulse-soft';
  if (status === 'failed') return 'bg-destructive/10 text-destructive';
  return 'bg-muted text-muted-foreground';
}

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const r = await campaignApi.get(params.id);
      setData(r);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
    // Poll every 5s when running
    const interval = setInterval(() => {
      if (data?.campaign?.status === 'running') fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchData, data?.campaign?.status]);

  async function doSend() {
    setSending(true);
    try {
      const r = await campaignApi.send(params.id);
      toast.success(`Sent to ${r.audienceSize} customers`);
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Send failed');
    } finally { setSending(false); }
  }

  if (loading) return <div className="text-muted-foreground p-8">Loading…</div>;
  if (!data) return <div className="text-destructive p-8">Campaign not found.</div>;

  const { campaign: c, stats, trendSeries, insights } = data;

  const funnel = [
    { stage: 'Sent', count: stats.sent },
    { stage: 'Delivered', count: stats.delivered },
    { stage: 'Opened', count: stats.opened },
    { stage: 'Clicked', count: stats.clicked },
  ];

  return (
    <>
      <Link href="/dashboard/campaigns" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> All campaigns
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{c.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{c.objective}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold uppercase">{c.channel}</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(c.status)}`}>{c.status}</span>
            <span className="text-xs text-muted-foreground">Audience: {c.audience_size}</span>
          </div>
        </div>
        {(c.status === 'draft' || stats.sent === 0) && (
          <button onClick={doSend} disabled={sending}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-elegant hover:opacity-90 disabled:opacity-60">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? 'Sending…' : 'Send now'}
          </button>
        )}
      </div>

      {/* Message preview */}
      <div className="rounded-xl border bg-card p-5 shadow-soft mb-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Message preview</div>
        <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">{c.message ?? '(no message)'}</div>
        {c.cta && <div className="mt-3 text-xs"><span className="text-muted-foreground">CTA:</span> <span className="font-medium">{c.cta}</span></div>}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { l: 'Sent', v: stats.sent },
          { l: 'Delivered', v: stats.delivered },
          { l: 'Failed', v: stats.failed },
          { l: 'Opened', v: stats.opened },
          { l: 'Clicked', v: stats.clicked },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border bg-card p-4 shadow-soft">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</div>
            <div className="mt-1 text-2xl font-semibold">{s.v}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold mb-4">Conversion funnel</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 90%)" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="stage" fontSize={11} width={80} />
                <Tooltip contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(220 13% 90%)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(186 55% 42%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold mb-4">Conversion trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 90%)" />
                <XAxis dataKey="t" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(220 13% 90%)', borderRadius: 8, fontSize: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="delivered" stroke="hsl(186 55% 42%)" />
                <Line type="monotone" dataKey="opened" stroke="hsl(37 90% 52%)" />
                <Line type="monotone" dataKey="clicked" stroke="hsl(0 72% 51%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="rounded-xl border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-semibold">AI insights</h3>
        </div>
        <ul className="space-y-2">
          {insights?.map((ins: string, idx: number) => (
            <li key={idx} className="text-sm rounded-lg bg-muted px-3 py-2">{ins}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
