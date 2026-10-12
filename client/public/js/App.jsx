const { useState, useEffect, useRef } = React;

const { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;

const COLORS = {
  positive: '#128C7E',
  neutral: '#F0B232',
  negative: '#E53E3E',
  high: '#2563EB',
  medium: '#F59E0B',
  low: '#EF4444'
};

const SUGGESTED_QUESTIONS = [
  "Why are customers not giving 5 stars?",
  "Which feature should we improve next?",
  "Why are repeat purchases declining?",
  "Which competitor are customers considering?",
  "Which product issue is becoming more common?"
];

function Dashboard() {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [summary, setSummary] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [askAnswer, setAskAnswer] = useState(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askQuestion, setAskQuestion] = useState('');
  const [showSources, setShowSources] = useState(false);
  const [demoModal, setDemoModal] = useState({ open: false, brandId: '' });
  const [demoConversation, setDemoConversation] = useState(null);
  const [demoPolling, setDemoPolling] = useState(false);
  const [demoMessages, setDemoMessages] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchSummary();
      fetchConversations();
      startPolling();
    }
  }, [selectedBrand]);

  const startPolling = () => {
    const interval = setInterval(() => {
      if (selectedBrand) {
        fetchSummary();
        fetchConversations();
        if (demoPolling && demoConversation) {
          fetchDemoMessages();
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  };

  const fetchBrands = async () => {
    const res = await fetch('/api/brands');
    const data = await res.json();
    setBrands(data);
    if (data.length > 0 && !selectedBrand) {
      setSelectedBrand(data[0].id);
    }
  };

  const fetchSummary = async () => {
    const res = await fetch(`/api/insights/summary?brand_id=${selectedBrand}`);
    const data = await res.json();
    setSummary(data);
  };

  const fetchConversations = async () => {
    const res = await fetch(`/api/conversations?brand_id=${selectedBrand}`);
    const data = await res.json();
    setConversations(data);
  };

  const fetchConversationMessages = async (id) => {
    const res = await fetch(`/api/conversations/${id}/messages`);
    const data = await res.json();
    const conv = conversations.find(c => c.id === id);
    setSelectedConversation({ ...conv, messages: data });
    setSidebarOpen(true);
  };

  const handleAsk = async (question) => {
    setAskQuestion(question);
    setAskLoading(true);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, brand_id: selectedBrand })
      });
      const data = await res.json();
      setAskAnswer(data);
      setShowSources(true);
    } catch (e) {
      console.error(e);
    } finally {
      setAskLoading(false);
    }
  };

  const triggerDemo = async (brandId) => {
    setDemoModal({ open: false, brandId: '' });
    try {
      const res = await fetch('/demo/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brandId })
      });
      const data = await res.json();
      setDemoConversation(data);
      setDemoMessages([{ role: 'ai', content: data.opening_message, timestamp: new Date().toLocaleTimeString() }]);
      setDemoPolling(true);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDemoMessages = async () => {
    if (!demoConversation) return;
    const res = await fetch(`/api/conversations/${demoConversation.conversation_id}/messages`);
    const data = await res.json();
    setDemoMessages(data.map(m => ({ role: m.role, content: m.content, timestamp: new Date(m.created_at).toLocaleTimeString() })));
    const conv = await fetch(`/api/conversations/${demoConversation.conversation_id}`).then(r => r.json());
    if (conv.status === 'completed') {
      setDemoPolling(false);
    }
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'short', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getSentimentBadge = (sentiment) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${sentiment === 'positive' ? 'badge-positive' : sentiment === 'neutral' ? 'badge-neutral' : 'badge-negative'}`}>
      {sentiment}
    </span>
  );

  const getRepurchaseBadge = (intent) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${intent === 'high' ? 'badge-high' : intent === 'medium' ? 'badge-medium' : 'badge-low'}`}>
      {intent}
    </span>
  );

  const getStatusBadge = (status) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status === 'active' ? 'status-active' : status === 'completed' ? 'status-completed' : 'status-abandoned'}`}>
      {status}
    </span>
  );

  if (!selectedBrand) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  const brand = brands.find(b => b.id === selectedBrand);
  const positivePct = summary?.total_conversations ? Math.round((summary.sentiment_breakdown.positive / summary.total_conversations) * 100) : 0;
  const highRepurchasePct = summary?.total_conversations ? Math.round((summary.repurchase_breakdown.high / summary.total_conversations) * 100) : 0;
  const topIssue = summary?.top_issues?.[0]?.issue || '—';

  const sentimentData = [
    { name: 'Positive', value: summary?.sentiment_breakdown?.positive || 0, color: COLORS.positive },
    { name: 'Neutral', value: summary?.sentiment_breakdown?.neutral || 0, color: COLORS.neutral },
    { name: 'Negative', value: summary?.sentiment_breakdown?.negative || 0, color: COLORS.negative }
  ].filter(d => d.value > 0);

  const repurchaseData = [
    { name: 'High', value: summary?.repurchase_breakdown?.high || 0, color: COLORS.high },
    { name: 'Medium', value: summary?.repurchase_breakdown?.medium || 0, color: COLORS.medium },
    { name: 'Low', value: summary?.repurchase_breakdown?.low || 0, color: COLORS.low }
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          CustomerIQ
        </h1>
        <select 
          value={selectedBrand} 
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
        >
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </header>

      <main className="p-6 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total Conversations</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{summary?.total_conversations || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Positive Sentiment</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{positivePct}%</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">High Repurchase Intent</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{highRepurchasePct}%</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Top Issue This Week</p>
            <p className="text-lg font-medium text-gray-900 mt-1 truncate">{topIssue}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={80}
                    paddingAngle={2} dataKey="value" nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {sentimentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'conversations']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Repurchase Intent</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={repurchaseData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={60} />
                  <Tooltip formatter={(value) => [value, 'conversations']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {repurchaseData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              Top Issues
            </h3>
            <div className="space-y-3">
              {summary?.top_issues?.map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-gray-700 truncate pr-2">{item.issue}</span>
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm font-medium">{item.count}</span>
                </div>
              )) || <p className="text-gray-400 text-sm">No data yet</p>}
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              Competitor Mentions
            </h3>
            <div className="space-y-3">
              {summary?.competitor_mentions?.map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-gray-700 truncate pr-2">{item.competitor_mention}</span>
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm font-medium">{item.count}</span>
                </div>
              )) || <p className="text-gray-400 text-sm">No data yet</p>}
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              Feature Requests
            </h3>
            <div className="space-y-3">
              {summary?.feature_requests?.map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-gray-700 truncate pr-2">{item.feature_request}</span>
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm font-medium">{item.count}</span>
                </div>
              )) || <p className="text-gray-400 text-sm">No data yet</p>}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ask Anything</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ask about your customers</label>
              <div className="relative">
                <input
                  type="text"
                  value={askQuestion}
                  onChange={(e) => setAskQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAsk(askQuestion)}
                  placeholder="e.g. Why are customers not giving 5 stars?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={() => handleAsk(askQuestion)}
                  disabled={askLoading || !askQuestion.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {askLoading ? 'Thinking...' : 'Ask'}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleAsk(q)}
                  disabled={askLoading}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
            {askAnswer && (
              <div className="p-4 bg-green-50 border border-green-100 rounded-lg space-y-3">
                <div className="text-gray-800 whitespace-pre-wrap">{askAnswer.answer}</div>
                <div className="text-sm text-green-700 font-medium">Based on {askAnswer.sourcesUsed} conversations</div>
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="text-sm text-green-600 hover:underline"
                >
                  {showSources ? 'Hide sources' : 'Show sources'} ({askAnswer.insights?.length || 0})
                </button>
                {showSources && askAnswer.insights && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-green-200">
                    {askAnswer.insights.map((insight, i) => (
                      <div key={i} className="text-sm text-gray-600 p-3 bg-white rounded border">
                        <p className="font-medium">[Conversation {i + 1}]</p>
                        <p>{insight.summary}</p>
                        <p className="text-xs text-gray-500 mt-1">Sentiment: {insight.sentiment} | Repurchase: {insight.repurchase_intent}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Conversation Explorer</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sentiment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repurchase</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {conversations.map(conv => (
                  <tr key={conv.id} onClick={() => fetchConversationMessages(conv.id)} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{conv.customer_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{conv.product_name}</td>
                    <td className="px-4 py-3">{getStatusBadge(conv.status)}</td>
                    <td className="px-4 py-3">—</td>
                    <td className="px-4 py-3">—</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(conv.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {sidebarOpen && selectedConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="sidebar-overlay absolute inset-0" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-full max-w-md md:max-w-lg h-full bg-white shadow-xl flex flex-col z-10">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{selectedConversation.customer_name}</p>
                <p className="text-sm text-gray-500">{selectedConversation.product_name} • {selectedConversation.status}</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 whatsapp-dark chat-container p-4 space-y-4 scrollbar-thin">
              {selectedConversation.messages?.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'customer' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${msg.role === 'customer' ? 'bubble-customer rounded-br-none' : 'bubble-ai rounded-bl-none'}`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Extracted Insights</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Positive</span>
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">High Repurchase</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {demoModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Select brand for live demo</h3>
            <div className="space-y-2">
              {brands.map(b => (
                <button
                  key={b.id}
                  onClick={() => triggerDemo(b.id)}
                  className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {demoConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
          <div className="relative w-full max-w-md h-[80vh] bg-white rounded-xl shadow-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Live Demo: {brand?.name}</p>
                <p className="text-sm text-gray-500">{demoConversation.customer_name} • {demoConversation.product_name}</p>
              </div>
              <button onClick={() => { setDemoConversation(null); setDemoPolling(false); }} className="p-2 text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 whatsapp-dark chat-container p-4 space-y-4 scrollbar-thin">
              {demoMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'customer' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${msg.role === 'customer' ? 'bubble-customer rounded-br-none' : 'bubble-ai rounded-bl-none'}`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1 text-right">{msg.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">Polling for new messages... {demoPolling ? '🟢 Live' : '🔴 Complete'}</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setDemoModal({ open: true, brandId: '' })}
        className="fixed bottom-6 right-6 z-40 px-5 py-3 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
      >
        <span>▶</span> Trigger Live Demo
      </button>

      <style jsx>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Dashboard />);