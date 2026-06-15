'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { customerApi } from '@/lib/api-client';
import { formatINR, formatDate } from '@/lib/utils';

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customerApi.get(params.id)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="text-muted-foreground p-8">Loading…</div>;
  if (!data) return <div className="text-destructive p-8">Customer not found.</div>;

  const { customer: c, orders, spendTrend, segment, daysSinceLastPurchase } = data;

  return (
    <>
      <Link href="/dashboard/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> All customers
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{c.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{c.email}</span>
                <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{c.phone}</span>
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{c.city}</span>
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Joined {formatDate(c.created_at)}</span>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">{segment}</span>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total Spend</div>
              <div className="mt-1 text-xl font-semibold">{formatINR(Number(c.total_spend))}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Orders</div>
              <div className="mt-1 text-xl font-semibold">{orders.length}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Days Since Order</div>
              <div className="mt-1 text-xl font-semibold">{daysSinceLastPurchase === 9999 ? '—' : daysSinceLastPurchase}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-soft">
          <h3 className="text-sm font-semibold mb-1">Spend trend</h3>
          <p className="text-xs text-muted-foreground mb-4">Monthly, last 12 months</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 90%)" />
                <XAxis dataKey="month" tickFormatter={(v) => v.slice(5)} fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip formatter={(v: any) => formatINR(Number(v))} contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(220 13% 90%)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="amount" stroke="hsl(186 55% 42%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
        <div className="border-b px-5 py-3 text-sm font-semibold">Purchase history</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No orders yet.</td></tr>
            )}
            {orders.map((o: any) => (
              <tr key={o.id}>
                <td className="px-4 py-2 text-muted-foreground">{formatDate(o.order_date)}</td>
                <td className="px-4 py-2 capitalize">{o.category}</td>
                <td className="px-4 py-2 text-right font-medium">{formatINR(Number(o.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
