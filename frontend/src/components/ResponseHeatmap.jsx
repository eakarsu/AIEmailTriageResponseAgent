import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const API = '/api/custom-views/heatmap';

const headers = () => {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
};

// Map minutes -> a tailwind-like background color via inline style.
function cellColor(minutes, max) {
  if (minutes == null) return '#f3f4f6';
  const ratio = Math.min(1, minutes / max);
  // green -> yellow -> red (HSL hue 120 -> 0)
  const hue = Math.round(120 - 120 * ratio);
  return `hsl(${hue}, 70%, ${85 - Math.round(ratio * 30)}%)`;
}

const ResponseHeatmap = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(API, { headers: headers() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e) {
      setError(e.message || 'Failed to load heatmap');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const { max, hourAverages } = useMemo(() => {
    if (!data?.grid) return { max: 1, hourAverages: [] };
    let m = 0;
    const sums = new Array(24).fill(0);
    const counts = new Array(24).fill(0);
    for (const row of data.grid) {
      for (const cell of row) {
        if (cell.avg_response_minutes > m) m = cell.avg_response_minutes;
        sums[cell.hour] += cell.avg_response_minutes;
        counts[cell.hour] += 1;
      }
    }
    const avgs = sums.map((s, i) => ({ hour: `${i}:00`, avg: counts[i] ? Math.round(s / counts[i]) : 0 }));
    return { max: m || 1, hourAverages: avgs };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading heatmap...
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        Error: {error}
        <button onClick={load} className="ml-3 underline">Retry</button>
      </div>
    );
  }

  const hourLabels = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div data-testid="response-heatmap" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" /> Response Time Heatmap
          </h2>
          <p className="text-sm text-gray-500">
            7 days x 24 hours grid, color by average response time ({data?.unit || 'minutes'}). Lower is faster.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1 text-sm px-3 py-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="text-xs text-gray-400 w-10"></th>
              {hourLabels.map((h) => (
                <th key={h} className="text-[10px] text-gray-400 font-normal w-7">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.grid || []).map((row, di) => (
              <tr key={di}>
                <td className="text-xs text-gray-500 pr-2 text-right">{data.days[di]}</td>
                {row.map((cell) => (
                  <td key={`${cell.day}-${cell.hour}`} className="p-0">
                    <div
                      data-testid={`heatmap-cell-${cell.day}-${cell.hour}`}
                      onMouseEnter={() => setHover(cell)}
                      onMouseLeave={() => setHover(null)}
                      className="w-7 h-7 rounded-sm cursor-pointer border border-white"
                      style={{ background: cellColor(cell.avg_response_minutes, max) }}
                      title={`${data.days[cell.day]} ${cell.hour}:00 — ${cell.avg_response_minutes} min (n=${cell.sample_count})`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded" style={{ background: cellColor(0, max) }}></span>
            Fast (~0m)
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded" style={{ background: cellColor(max / 2, max) }}></span>
            Medium
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded" style={{ background: cellColor(max, max) }}></span>
            Slow ({max}m+)
          </div>
          {hover && (
            <div className="ml-auto px-3 py-1 bg-gray-900 text-white rounded text-xs">
              {data.days[hover.day]} {hover.hour}:00 — avg {hover.avg_response_minutes} min (samples: {hover.sample_count})
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Average response time by hour (across week)</h3>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={hourAverages}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="m" />
              <Tooltip />
              <Bar dataKey="avg" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ResponseHeatmap;
