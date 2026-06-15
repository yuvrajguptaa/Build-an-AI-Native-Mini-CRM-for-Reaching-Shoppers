'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, MessageCircle, Mail, Smartphone } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { campaignApi } from '@/lib/api-client';

const channelIcon: Record<string, any> = { whatsapp: MessageCircle, email: Mail, sms: Smartphone };

function statusBadge(status: string) {
  if (status === 'completed') return 'bg-success/10 text-success';
  if (status === 'running') return 'bg-warning/10 text-warning-foreground';
  if (status === 'failed') return 'bg-destructive/10 text-destructive';
  return 'bg-muted text-muted-foreground';
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    campaignApi.list()
      .then((r) => setCampaigns(r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Generate, send, and analyze campaigns across channels."
        action={
          <Link href="/dashboard/segments"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-elegant hover:opacity-90">
            <Plus className="h-4 w-4" /> New campaign
          </Link>
        }
      />

      <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Audience</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-muted-foreground">Loading…</td></tr>}
            {!loading && campaigns.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <div className="text-muted-foreground mb-3">No campaigns yet.</div>
                  <Link href="/dashboard/segments"
                    className="inline-flex items-center gap-2 h-8 px-3 rounded-lg gradient-primary text-primary-foreground text-xs font-medium shadow-elegant hover:opacity-90">
                    <Plus className="h-3.5 w-3.5" /> Create your first
                  </Link>
                </td>
              </tr>
            )}
            {campaigns.map((c: any) => {
              const Icon = channelIcon[c.channel] ?? MessageCircle;
              return (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/campaigns/${c.id}`} className="block">
                      <div className="font-medium">{c.name || c.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{c.objective}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />{c.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.audience_size}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
