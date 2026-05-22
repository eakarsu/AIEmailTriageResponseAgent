import React, { useEffect, useState } from 'react';

export default function SlaReplyBreachMonitor() {
  const [data, setData] = useState(null);
  useEffect(() => { fetch('/api/sla-reply-breach-monitor').then(r => r.json()).then(setData).catch(() => setData(null)); }, []);
  return <div className="p-6"><h1>SLA Reply Breach Monitor</h1><p>Identify emails approaching reply SLA and queue templates or escalations.</p><div className="stats-grid">{data && Object.entries(data.summary).map(([k,v]) => <div className="stat-card" key={k}><span>{k.replaceAll('_',' ')}</span><strong>{v}</strong></div>)}</div><div className="card">{(data?.emails || []).map(e => <div key={e.subject} style={{padding:12,borderBottom:'1px solid #e5e7eb'}}><strong>{e.subject}</strong><div>{e.sender} - {e.hours_left}h left - {e.action}</div></div>)}</div></div>;
}
