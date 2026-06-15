'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Wand2, Send } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { segmentApi, aiApi, campaignApi } from '@/lib/api-client';
import { formatINR } from '@/lib/utils';
import { toast } from 'sonner';

const EXAMPLES = [
  "Customers who spent more than ₹5000 and haven't purchased in 60 days",
  "Female customers from Delhi who purchased skincare products",
  "Customers with more than 3 orders",
  "High value customers in Mumbai aged 25-40",
];

export default function SegmentsPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function run() {
    if (!prompt.trim()) return;
    setLoading(true); setResult(null); setDraft(null);
    try {
      const r = await segmentApi.aiBuild(prompt);
      setResult(r);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to build segment');
    } finally { setLoading(false); }
  }

  async function genDraft() {
    if (!result) return;
    setDraftLoading(true);
    try {
      const { draft: d } = await aiApi.generateCampaign(
        prompt,
        `${result.count} customers, est. revenue ${formatINR(result.estRevenue)}`
      );
      setDraft(d);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to generate campaign');
    } finally { setDraftLoading(false); }
  }

  async function saveAndGo() {
    if (!draft || !result) return;
    setSaving(true);
    try {
      const seg = await segmentApi.create({
        name: draft.title,
        description: prompt,
        naturalLanguageQuery: prompt,
        filterDefinition: result.filter,
        customerCount: result.count,
        estimatedRevenue: result.estRevenue,
      });

      const { campaign } = await campaignApi.create({
        name: draft.title,
        objective: prompt,
        segmentId: seg.segment._id,
        audienceFilter: result.filter,
        channel: draft.channel || 'email',
        messageTemplate: {
          subject: draft.subject,
          body: draft.body || draft.message,
          ctaUrl: '#',
          ctaText: draft.cta,
        },
      });

      toast.success('Campaign saved!');
      router.push(`/dashboard/campaigns/${campaign._id}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  }

  return (
    <>
      <PageHeader title="AI Audience Builder" description="Describe your audience in plain English — Gemini turns it into a structured filter." />

      {/* NL input */}
      <div className="rounded-xl border bg-card p-5 shadow-soft mb-6">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Describe your audience</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Customers who spent more than ₹5000 and haven't purchased in 60 days"
          rows={3}
          className="mt-2 flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => setPrompt(ex)}
              className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors">
              {ex}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={run} disabled={loading || !prompt.trim()}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-elegant hover:opacity-90 disabled:opacity-60">
            <Sparkles className="h-4 w-4" />
            {loading ? 'Analyzing…' : 'Build audience'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="rounded-xl border bg-card p-5 shadow-soft">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Audience size</div>
            <div className="mt-1 text-3xl font-semibold">{result.count.toLocaleString('en-IN')}</div>
            <div className="mt-1 text-xs text-muted-foreground">matching customers</div>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-soft">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Lifetime revenue</div>
            <div className="mt-1 text-3xl font-semibold">{formatINR(result.estRevenue)}</div>
            <div className="mt-1 text-xs text-muted-foreground">from this audience</div>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-soft">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">AI-generated filter</div>
            <pre className="text-xs bg-muted rounded-md p-3 overflow-auto max-h-32">{JSON.stringify(result.filter, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Preview table */}
      {result && (
        <div className="rounded-xl border bg-card shadow-soft mb-6 overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <div className="text-sm font-semibold">Audience preview ({result.preview.length} of {result.count})</div>
            <button onClick={genDraft} disabled={draftLoading}
              className="inline-flex items-center gap-2 h-8 px-3 rounded-lg gradient-primary text-primary-foreground text-xs font-medium shadow-elegant hover:opacity-90 disabled:opacity-60">
              <Wand2 className="h-3.5 w-3.5" />
              {draftLoading ? 'Drafting…' : 'Generate campaign'}
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">City</th>
                <th className="px-4 py-2 font-medium">Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {result.preview.map((c: any) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2">{c.name}<div className="text-xs text-muted-foreground">{c.email}</div></td>
                  <td className="px-4 py-2 text-muted-foreground">{c.city}</td>
                  <td className="px-4 py-2 font-medium">{formatINR(Number(c.total_spend))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Campaign draft editor */}
      {draft && (
        <div className="rounded-xl border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-primary text-primary-foreground">
              <Wand2 className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-semibold">Campaign draft</h3>
            <span className="ml-auto text-xs text-muted-foreground">{draft.rationale}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Title</label>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Channel</label>
              <input value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })}
                className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Subject</label>
              <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Message</label>
              <textarea rows={4} value={draft.body || draft.message} onChange={(e) => setDraft({ ...draft, body: e.target.value, message: e.target.value })}
                className="mt-1 flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">CTA</label>
              <input value={draft.cta} onChange={(e) => setDraft({ ...draft, cta: e.target.value })}
                className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={saveAndGo} disabled={saving}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-elegant hover:opacity-90 disabled:opacity-60">
              <Send className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save campaign'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
