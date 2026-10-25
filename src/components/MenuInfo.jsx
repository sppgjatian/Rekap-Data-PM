import { useEffect, useState } from 'react';
import { supabaseQr } from '../lib/supabaseQr';

const BUCKET_NAME = 'assets-harian';
const PAGE_SIZE = 9;

export default function MenuInfo({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const load = async (p) => {
    setLoading(true);
    const { data, error } = await supabaseQr.storage
      .from(BUCKET_NAME)
      .list('', {
        limit: PAGE_SIZE,
        offset: p * PAGE_SIZE,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error(error);
      setItems([]);
    } else {
      const realFiles = (data || []).filter(f => !f.name.startsWith('.'));
      const rows = realFiles.map(f => {
        const { data: urlData } = supabaseQr.storage.from(BUCKET_NAME).getPublicUrl(f.name);
        return {
          id: f.name,
          image_url: urlData.publicUrl,
          caption: f.name.replace(/^update_\d+_/, '').replace(/\.[^.]+$/, ''),
          uploaded_at: f.created_at,
        };
      });
      setItems((prev) => (p === 0 ? rows : [...prev, ...rows]));
      setHasMore(realFiles.length === PAGE_SIZE);
      setPage(p);
    }
    setLoading(false);
  };

  useEffect(() => { load(0); }, []);

  const groups = items.reduce((acc, it) => {
    const d = new Date(it.uploaded_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    (acc[d] = acc[d] || []).push(it);
    return acc;
  }, {});

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl animate-fade-in">
      <button onClick={() => onNavigate('/')} className="text-sm text-[#2E7D32] font-semibold mb-4">← Kembali ke Beranda</button>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#1B5E20]">📢 Informasi Menu</h1>
          <p className="text-sm text-gray-500">Flyer menu harian dari SPPG Jatian Pakusari, terbaru lebih dulu.</p>
        </div>
        <button onClick={() => onNavigate('/informasimenu/staff')} className="text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold px-3 py-2 rounded-lg transition">
          🔐 Staff
        </button>
      </div>

      {loading && items.length === 0 && <p className="text-sm text-gray-500">Memuat informasi...</p>}
      {!loading && items.length === 0 && (
        <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400 text-sm">Belum ada informasi menu yang dipublikasikan.</div>
      )}

      <div className="space-y-8">
        {Object.entries(groups).map(([date, list]) => (
          <div key={date}>
            <h2 className="text-sm font-bold text-[#1B5E20] uppercase tracking-wide mb-3">🗓️ {date}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {list.map((it) => (
                <a key={it.id} href={it.image_url} target="_blank" rel="noreferrer" className="block bg-white rounded-2xl shadow overflow-hidden border border-gray-100 hover:shadow-lg transition">
                  <img src={it.image_url} alt={it.caption || 'Flyer menu'} loading="lazy" className="w-full h-auto object-cover" />
                  {it.caption && <p className="p-3 text-xs text-gray-600">{it.caption}</p>}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-6">
          <button onClick={() => load(page + 1)} disabled={loading} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-lg transition disabled:opacity-50">
            {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
          </button>
        </div>
      )}
    </div>
  );
}
