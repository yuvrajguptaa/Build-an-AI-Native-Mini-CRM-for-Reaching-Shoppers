'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, Plus, X, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { customerApi } from '@/lib/api-client';
import { formatINR, formatDate, daysAgo } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function segmentBadge(spend: number, lastPurchase: string | null) {
  const days = daysAgo(lastPurchase);
  if (spend >= 20000) return { label: 'High Value', cls: 'bg-success/10 text-success' };
  if (days > 60) return { label: 'Inactive', cls: 'bg-destructive/10 text-destructive' };
  if (days <= 30) return { label: 'Active', cls: 'bg-primary/10 text-primary' };
  if (spend < 5000) return { label: 'Low Value', cls: 'bg-muted text-muted-foreground' };
  return { label: 'Regular', cls: 'bg-accent text-accent-foreground' };
}

export default function CustomersPage() {
  const [data, setData] = useState<any>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('');
  const [segment, setSegment] = useState('');
  const [sortBy, setSortBy] = useState('totalSpend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', city: '', gender: '', age: '' });
  const [saving, setSaving] = useState(false);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await customerApi.create(newCustomer);
      setShowAddModal(false);
      setNewCustomer({ name: '', email: '', phone: '', city: '', gender: '', age: '' });
      fetchData(); // Reload table
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to add customer');
    } finally {
      setSaving(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await customerApi.list({ search, city, gender, segment, sortBy, sortDir, page, limit: 25 });
      setData(result);
      if (result.meta?.cities) setCities(result.meta.cities);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, city, gender, segment, sortBy, sortDir, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHeader 
        title="Customers" 
        description={`${data?.total?.toLocaleString('en-IN') ?? '—'} customers across all segments`} 
        action={
          <button 
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-elegant hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add customer
          </button>
        }
      />

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 mb-4 shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search name, email, phone"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Select value={city || 'all'} onValueChange={(v) => { setCity(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={gender || 'all'} onValueChange={(v) => { setGender(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="male">Male</SelectItem>
            </SelectContent>
          </Select>
          <Select value={segment || 'all'} onValueChange={(v) => { setSegment(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Segment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All segments</SelectItem>
              <SelectItem value="active">Active (30d)</SelectItem>
              <SelectItem value="inactive">Inactive (60d+)</SelectItem>
              <SelectItem value="high_value">High value (₹20K+)</SelectItem>
              <SelectItem value="low_value">Low value (&lt;₹5K)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Age</th>
                <th className="px-4 py-3 font-medium cursor-pointer select-none" onClick={() => { setSortBy('totalSpend'); setSortDir(sortDir === 'desc' ? 'asc' : 'desc'); }}>Spend ↕</th>
                <th className="px-4 py-3 font-medium cursor-pointer select-none" onClick={() => { setSortBy('last_purchase_date'); setSortDir(sortDir === 'desc' ? 'asc' : 'desc'); }}>Last Order ↕</th>
                <th className="px-4 py-3 font-medium">Segment</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))}
              {!loading && data?.data?.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No customers match these filters.</td></tr>
              )}
              {(data?.data ?? []).map((c: any) => {
                const b = segmentBadge(Number(c.total_spend), c.last_purchase_date);
                return (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/customers/${c.id}`} className="block">
                        <div className="font-medium text-foreground">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.city}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.age}</td>
                    <td className="px-4 py-3 font-medium">{formatINR(Number(c.total_spend))}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(c.last_purchase_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.cls}`}>{b.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
          <div className="text-muted-foreground">Page {data?.page ?? 1} of {totalPages}</div>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-elegant animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Add Manual Customer</h2>
              <button onClick={() => setShowAddModal(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Full Name *</label>
                <input required value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="John Doe" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email *</label>
                <input type="email" required value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="john@example.com" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Phone</label>
                <input type="tel" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="+91 9876543210" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">City</label>
                  <input value={newCustomer.city} onChange={e => setNewCustomer({ ...newCustomer, city: e.target.value })} className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Mumbai" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Age</label>
                  <input type="number" value={newCustomer.age} onChange={e => setNewCustomer({ ...newCustomer, age: e.target.value })} className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="30" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Gender</label>
                <select value={newCustomer.gender} onChange={e => setNewCustomer({ ...newCustomer, gender: e.target.value })} className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="h-10 px-4 rounded-lg border border-input text-sm font-medium hover:bg-muted">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-elegant hover:opacity-90 disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {saving ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
