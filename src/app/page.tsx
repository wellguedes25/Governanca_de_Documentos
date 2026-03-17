"use client";

export default function Dashboard() {
  const cards = [
    { title: 'Total Documentos', value: '1,284', change: '+12%', icon: '📄', color: 'from-[var(--primary)] to-emerald-600' },
    { title: 'Em Uso Agora', value: '42', change: '+3%', icon: '🔥', color: 'from-orange-500 to-red-600' },
    { title: 'Últimas 24h', value: '156', change: '-2%', icon: '🕒', color: 'from-emerald-500 to-[var(--primary)]' },
    { title: 'Tempo Médio', value: '2.4s', change: 'Estável', icon: '⚡', color: 'from-[var(--primary)] to-cyan-600' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header>
        <h2 className="text-3xl font-bold text-white">Dashboard</h2>
        <p className="text-slate-400 mt-2">Visão geral do tráfego de documentos e saúde do banco.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div key={idx} className="glass rounded-2xl p-6 card-hover relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm font-medium">{card.title}</p>
                <h3 className="text-3xl font-bold text-white mt-2">{card.value}</h3>
              </div>
              <span className="text-3xl">{card.icon}</span>
            </div>
            <div className="mt-4 flex items-center space-x-2">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                card.change.startsWith('+') ? 'bg-emerald-500/20 text-emerald-400' : 
                card.change === 'Estável' ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'bg-red-500/20 text-red-400'
              }`}>
                {card.change}
              </span>
              <span className="text-xs text-slate-500 italic">vs. semana anterior</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass rounded-2xl p-8 border border-slate-700/50">
          <h3 className="text-xl font-bold text-white mb-6">Volume de Consultas (Mock)</h3>
          <div className="h-64 flex items-end justify-between space-x-2 pb-2">
            {[40, 70, 45, 90, 65, 80, 50, 85, 100, 75, 60, 95].map((h, i) => (
              <div 
                key={i} 
                className="w-full bg-gradient-to-t from-[var(--primary)]/40 to-[var(--primary)] rounded-t-lg transition-all duration-500 hover:scale-x-110 shadow-[0_0_15px_var(--primary)]/20" 
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-slate-500 font-mono">
            <span>JAN</span>
            <span>MAR</span>
            <span>MAI</span>
            <span>JUL</span>
            <span>SET</span>
            <span>NOV</span>
          </div>
        </div>
        
        <div className="glass rounded-2xl p-8 border border-slate-700/50">
          <h3 className="text-xl font-bold text-white mb-6">Status dos Ambientes</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-[var(--primary)] animate-pulse shadow-[0_0_8px_var(--primary)]" />
                <span className="text-slate-300">PRODUÇÃO</span>
              </div>
              <span className="text-xs font-mono text-[var(--primary)] uppercase font-bold">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-[var(--accent)]" />
                <span className="text-slate-300">HOMOLOGAÇÃO</span>
              </div>
              <span className="text-xs font-mono text-[var(--accent)] uppercase">Standby</span>
            </div>
            <div className="flex items-center justify-between opacity-50">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-slate-500" />
                <span className="text-slate-300">DESENVOLVIMENTO</span>
              </div>
              <span className="text-xs font-mono text-slate-500">OFFLINE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
