import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  Search, 
  Star, 
  User, 
  MessageSquare, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight,
  Flame,
  Activity,
  Award,
  Zap,
  Filter,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Lock,
  X
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Stock {
  symbol: string;
  name: string;
  price: number;
  change_percent: number;
  volume: number;
  heat_score: number;
  tags: string; // JSON string
  rank?: number;
  bull_count?: number;
  bear_count?: number;
}

interface Danmaku {
  id: number;
  stock_symbol: string;
  username: string;
  content: string;
  timestamp: number;
  likes: number;
}

interface UserProfile {
  id: number;
  username: string;
  reputation: number;
  is_pro: boolean;
  avatar: string;
}

interface Tag {
  id: number;
  content: string;
  likes: number;
  dislikes: number;
}

// --- Components ---

const Navbar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 md:top-0 md:bottom-auto md:border-b md:border-t-0">
    <div className="hidden md:flex items-center gap-2 mr-8">
      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
        <TrendingUp className="text-white w-5 h-5" />
      </div>
      <span className="font-bold text-xl tracking-tight">智股舆情</span>
    </div>
    <div className="flex justify-around w-full md:w-auto md:gap-8">
      {[
        { id: 'heat', icon: Flame, label: '热度' },
        { id: 'watchlist', icon: Star, label: '自选' },
        { id: 'profile', icon: User, label: '我的' }
      ].map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === item.id ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <item.icon className="w-6 h-6" />
          <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
        </button>
      ))}
    </div>
  </nav>
);

const ProModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
          
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-indigo-600" />
          </div>
          
          <h3 className="text-2xl font-bold mb-2">解锁 Pro 权限</h3>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            升级 Pro 会员，解锁全量热度榜单、深度行业筛选及高声望大神预测参考。
          </p>
          
          <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all mb-4">
            立即升级 ¥29.9/月
          </button>
          <p className="text-[10px] text-gray-400">订阅即代表同意《会员服务协议》</p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const INDUSTRIES = ['All', '互联网', '消费', '家电', '金融', '汽车', '医药', '科技'];

const HeatRanking = ({ 
  stocks, 
  onSelect, 
  onProClick,
  filters,
  setFilters,
  isPro
}: { 
  stocks: Stock[], 
  onSelect: (s: Stock) => void,
  onProClick: () => void,
  filters: any,
  setFilters: (f: any) => void,
  isPro: boolean
}) => {
  const [isIndustryOpen, setIsIndustryOpen] = useState(false);
  const visibleStocks = isPro ? stocks : stocks.slice(0, 20);

  return (
    <div className="p-4 space-y-4 pb-24 md:pt-20">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold tracking-tight">实时热度榜</h2>
        <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
          <Zap className="w-3 h-3" />
          每5分钟更新
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="relative">
          <select
            value={filters.market}
            onChange={(e) => setFilters({ ...filters, market: e.target.value })}
            className="w-full appearance-none bg-gray-100 border-none rounded-xl px-3 py-2 text-[10px] font-bold text-gray-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="All">全部市场</option>
            <option value="A">A股</option>
            <option value="HK">港股</option>
          </select>
          <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 rotate-90 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filters.cycle}
            onChange={(e) => setFilters({ ...filters, cycle: e.target.value })}
            className="w-full appearance-none bg-gray-100 border-none rounded-xl px-3 py-2 text-[10px] font-bold text-gray-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="Day">本日</option>
            <option value="Week">本周</option>
            <option value="Month">本月</option>
            <option value="Year">本年</option>
          </select>
          <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 rotate-90 pointer-events-none" />
        </div>

        <div className="relative">
          <button 
            onClick={() => isPro ? setIsIndustryOpen(!isIndustryOpen) : onProClick()}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-xl border text-[10px] font-bold transition-all",
              isPro ? "bg-white border-gray-100" : "bg-gray-50 border-dashed border-gray-300 text-gray-400"
            )}
          >
            <span className="truncate">{filters.industry === 'All' ? '全部行业' : filters.industry}</span>
            {!isPro ? <Lock className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5 rotate-90" />}
          </button>
          
          {isIndustryOpen && isPro && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 p-2 max-h-48 overflow-y-auto">
              {INDUSTRIES.map(ind => (
                <button
                  key={ind}
                  onClick={() => {
                    setFilters({ ...filters, industry: ind });
                    setIsIndustryOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold transition-all",
                    filters.industry === ind ? "bg-indigo-50 text-indigo-600" : "hover:bg-gray-50 text-gray-500"
                  )}
                >
                  {ind === 'All' ? '全部' : ind}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {visibleStocks.map((stock, index) => (
          <motion.div
            key={stock.symbol}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect(stock)}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                  index < 3 ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500"
                )}>
                  {index + 1}
                </div>
                <div>
                  <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{stock.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{stock.symbol}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">¥{stock.price.toFixed(2)}</div>
                <div className={cn(
                  "text-xs font-bold flex items-center justify-end gap-1",
                  stock.change_percent >= 0 ? "text-emerald-500" : "text-rose-500"
                )}>
                  {stock.change_percent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(stock.change_percent).toFixed(2)}%
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {stock.tags && JSON.parse(stock.tags).map((tag: string) => (
                <span key={tag} className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-[10px] font-medium border border-gray-100">
                  #{tag}
                </span>
              ))}
              <div className="ml-auto flex items-center gap-1 text-orange-500">
                <Flame className="w-3 h-3 fill-current" />
                <span className="text-xs font-bold">{stock.heat_score}</span>
              </div>
            </div>
          </motion.div>
        ))}
        
        {!isPro && stocks.length > 20 && (
          <button 
            onClick={onProClick}
            className="w-full py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-all"
          >
            <Lock className="w-4 h-4" />
            查看更多热度榜单 (Pro)
          </button>
        )}
      </div>
    </div>
  );
};

const StockDetail = ({ stock, onClose, onWatchlistChange }: { stock: Stock, onClose: () => void, onWatchlistChange?: () => void }) => {
  const [danmaku, setDanmaku] = useState<Danmaku[]>([]);
  const [stats, setStats] = useState({ bull: 0, bear: 0 });
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [newDanmaku, setNewDanmaku] = useState('');
  const [attribution, setAttribution] = useState<any>(null);
  const [loadingAttribution, setLoadingAttribution] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetch(`/api/danmaku/${stock.symbol}`).then(res => res.json()).then(setDanmaku);
    fetch(`/api/predictions/stats/${stock.symbol}`).then(res => res.json()).then(setStats);
    fetch(`/api/watchlist/check/1/${stock.symbol}`).then(res => res.json()).then(data => setIsInWatchlist(data.exists));
    fetch(`/api/stocks/${stock.symbol}/tags`).then(res => res.json()).then(setTags);
    
    // Auto-fetch attribution for demo
    setLoadingAttribution(true);
    fetch(`/api/stocks/${stock.symbol}/attribution`)
      .then(res => res.json())
      .then(data => {
        setAttribution(data);
        setLoadingAttribution(false);
      })
      .catch(() => setLoadingAttribution(false));

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws.current = new WebSocket(`${protocol}//${window.location.host}`);
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'danmaku' && data.payload.stock_symbol === stock.symbol) {
        setDanmaku(prev => [data.payload, ...prev]);
      }
    };

    return () => ws.current?.close();
  }, [stock.symbol]);

  const handleVote = async (direction: number) => {
    await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 1, stock_symbol: stock.symbol, direction })
    });
    fetch(`/api/predictions/stats/${stock.symbol}`).then(res => res.json()).then(setStats);
  };

  const handleTagVote = async (tagId: number, type: 'like' | 'dislike') => {
    await fetch(`/api/tags/${tagId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    fetch(`/api/stocks/${stock.symbol}/tags`).then(res => res.json()).then(setTags);
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    const res = await fetch(`/api/stocks/${stock.symbol}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newTag })
    });
    if (res.ok) {
      setNewTag('');
      fetch(`/api/stocks/${stock.symbol}/tags`).then(res => res.json()).then(setTags);
    } else {
      const err = await res.json();
      alert(err.error || '添加失败');
    }
  };

  const handleSuggestTags = async () => {
    setIsSuggesting(true);
    try {
      const res = await fetch(`/api/stocks/${stock.symbol}/suggest-tags`);
      const data = await res.json();
      if (data.tags) {
        for (const tagContent of data.tags) {
          await fetch(`/api/stocks/${stock.symbol}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: tagContent })
          });
        }
        fetch(`/api/stocks/${stock.symbol}/tags`).then(res => res.json()).then(setTags);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSuggesting(false);
    }
  };

  const sendDanmaku = () => {
    if (!newDanmaku.trim()) return;
    ws.current?.send(JSON.stringify({
      type: 'danmaku',
      stock_symbol: stock.symbol,
      user_id: 1,
      content: newDanmaku
    }));
    setNewDanmaku('');
  };

  const mockChartData = Array.from({ length: 20 }, (_, i) => ({
    time: i,
    price: stock.price + (Math.random() - 0.5) * 5
  }));

  const toggleWatchlist = async () => {
    const method = isInWatchlist ? 'DELETE' : 'POST';
    await fetch('/api/watchlist', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 1, stock_symbol: stock.symbol })
    });
    setIsInWatchlist(!isInWatchlist);
    onWatchlistChange?.();
  };

  const totalVotes = stats.bull + stats.bear;
  const bullPercent = totalVotes > 0 ? (stats.bull / totalVotes) * 100 : 50;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 bg-white z-[60] overflow-y-auto"
    >
      <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <div className="text-center flex-1">
          <div className="font-bold text-sm">{stock.name}</div>
          <div className="text-[10px] text-gray-400 font-mono">{stock.symbol}</div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handleVote(1)}
            className="p-2 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition-colors"
            title="看多"
          >
            <ArrowUpRight className="w-5 h-5" />
          </button>
          <button 
            onClick={() => handleVote(-1)}
            className="p-2 bg-rose-50 text-rose-600 rounded-full hover:bg-rose-100 transition-colors"
            title="看空"
          >
            <ArrowDownRight className="w-5 h-5" />
          </button>
          <button 
            onClick={toggleWatchlist}
            className={cn(
              "p-2 rounded-full transition-colors",
              isInWatchlist ? "text-yellow-500 bg-yellow-50" : "text-gray-300 hover:bg-gray-100"
            )}
          >
            <Star className={cn("w-6 h-6", isInWatchlist && "fill-current")} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-3xl font-bold tracking-tighter">¥{stock.price.toFixed(2)}</div>
            <div className={cn(
              "font-bold flex items-center gap-1",
              stock.change_percent >= 0 ? "text-emerald-500" : "text-rose-500"
            )}>
              {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
            </div>
          </div>
          <div className="text-right text-xs text-gray-400">
            成交额: {(stock.volume / 10000).toFixed(2)}万
          </div>
        </div>

        <div className="h-80 w-full mb-8 relative group overflow-hidden rounded-3xl bg-gray-900">
          <div className="absolute inset-0 z-0 opacity-50">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="time" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Danmaku Track Overlay */}
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden py-4">
            <AnimatePresence>
              {danmaku.slice(0, 10).map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ x: '100%' }}
                  animate={{ x: '-200%' }}
                  transition={{ duration: 8 + Math.random() * 4, ease: "linear", repeat: Infinity }}
                  className="absolute whitespace-nowrap text-white text-sm font-bold drop-shadow-md bg-black/20 px-2 py-1 rounded-lg backdrop-blur-sm"
                  style={{ top: `${(i % 5) * 20 + 10}%` }}
                >
                  <span className="text-indigo-300 mr-2">{d.username}:</span>
                  {d.content}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Floating Input Overlay */}
          <div className="absolute bottom-4 left-4 right-4 z-20 flex gap-2">
            <input 
              value={newDanmaku}
              onChange={(e) => setNewDanmaku(e.target.value)}
              placeholder="随时发弹幕..."
              className="flex-1 bg-white/10 border border-white/20 backdrop-blur-md rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/40 focus:ring-2 focus:ring-indigo-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && sendDanmaku()}
            />
            <button 
              onClick={sendDanmaku}
              className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-500/40"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tags Section moved below Sparkline */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">舆情标签</h3>
            <div className="flex gap-2">
              <button 
                onClick={handleSuggestTags}
                disabled={isSuggesting}
                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                title="AI 预测标签"
              >
                {isSuggesting ? <Activity className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              </button>
              <input 
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="添加标签..."
                className="bg-gray-100 border-none rounded-lg px-3 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <button onClick={handleAddTag} className="p-1 bg-indigo-600 text-white rounded-lg">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-2 bg-white border border-gray-100 px-3 py-2 rounded-xl shadow-sm">
                <span className="text-sm font-medium">#{tag.content}</span>
                <div className="flex items-center gap-1 ml-2 border-l border-gray-100 pl-2">
                  <button onClick={() => handleTagVote(tag.id, 'like')} className="p-1 hover:text-indigo-600 transition-colors flex items-center gap-0.5">
                    <ThumbsUp className="w-3 h-3" />
                    <span className="text-[10px] font-bold">{tag.likes}</span>
                  </button>
                  <button onClick={() => handleTagVote(tag.id, 'dislike')} className="p-1 hover:text-rose-600 transition-colors flex items-center gap-0.5">
                    <ThumbsDown className="w-3 h-3" />
                    <span className="text-[10px] font-bold">{tag.dislikes}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-3xl mb-8">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">涨跌预测</h3>
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: '50%' }}
              animate={{ width: `${bullPercent}%` }}
              className="absolute left-0 h-full bg-emerald-500" 
            />
            <div className="absolute right-0 h-full bg-rose-500" style={{ width: `${100 - bullPercent}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400">
            <span>{bullPercent.toFixed(0)}% 看多</span>
            <span>{totalVotes} 参与</span>
            <span>{(100 - bullPercent).toFixed(0)}% 看空</span>
          </div>
        </div>

        {/* Deep Attribution Section */}
        <div className="bg-indigo-50 p-6 rounded-3xl mb-8 border border-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4" />
              AI 深度归因
            </h3>
            <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold">PRO</span>
          </div>
          
          {loadingAttribution ? (
            <div className="flex flex-col items-center py-4 space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-indigo-400 font-medium">Gemini 正在分析舆情...</span>
            </div>
          ) : attribution ? (
            <div className="space-y-3">
              <p className="text-sm text-indigo-900 leading-relaxed">
                {attribution.summary || "分析中..."}
              </p>
              <div className="flex flex-wrap gap-2">
                {attribution.reason_tags?.map((tag: string) => (
                  <span key={tag} className="px-2 py-1 bg-white text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-indigo-100">
                <div className="text-[10px] font-bold text-indigo-400 uppercase">舆情评分</div>
                <div className="flex-1 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600" 
                    style={{ width: `${((attribution.sentiment_score + 1) / 2) * 100}%` }} 
                  />
                </div>
                <div className="text-xs font-bold text-indigo-600">
                  {(attribution.sentiment_score * 100).toFixed(0)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-indigo-400">无法获取分析数据</div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">历史互动</h3>
            <span className="text-xs text-gray-400">{danmaku.length} 条记录</span>
          </div>

          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {danmaku.map((d) => (
                <motion.div 
                  key={d.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-indigo-600">{d.username}</span>
                    <span className="text-[10px] text-gray-400">{new Date(d.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-gray-700">{d.content}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Watchlist = ({ onSelect }: { onSelect: (s: Stock) => void }) => {
  const [watchlist, setWatchlist] = useState<Stock[]>([]);

  const fetchWatchlist = () => {
    fetch('/api/watchlist/1').then(res => res.json()).then(setWatchlist);
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  return (
    <div className="p-4 space-y-4 pb-24 md:pt-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight">自选监控</h2>
        <div className="text-xs text-gray-400 font-medium">
          共 {watchlist.length} 只股票
        </div>
      </div>
      
      {watchlist.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
            <Star className="w-8 h-8 text-gray-200" />
          </div>
          <p className="text-gray-400 text-sm">暂无自选股，去热度榜看看吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {watchlist.map((stock) => {
            const total = (stock.bull_count || 0) + (stock.bear_count || 0);
            const bullRatio = total > 0 ? ((stock.bull_count || 0) / total) * 100 : 50;
            
            return (
              <motion.div 
                key={stock.symbol} 
                layout
                onClick={() => onSelect(stock)}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold text-gray-900">{stock.name}</div>
                    <div className="text-xs text-gray-400 font-mono flex items-center gap-2">
                      {stock.symbol}
                      <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        热度 R{stock.rank}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">¥{stock.price.toFixed(2)}</div>
                    <div className={cn(
                      "text-xs font-bold",
                      stock.change_percent >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span>看多 {bullRatio.toFixed(0)}%</span>
                    <span>情绪比例</span>
                    <span>看空 {(100 - bullRatio).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${bullRatio}%` }} />
                    <div className="h-full bg-rose-500" style={{ width: `${100 - bullRatio}%` }} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Profile = ({ user }: { user: UserProfile | null }) => (
  <div className="p-4 space-y-6 pb-24 md:pt-20">
    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-24 bg-indigo-600" />
      <div className="relative mt-8">
        <div className="w-24 h-24 bg-white rounded-full mx-auto p-1 shadow-lg">
          <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-gray-300" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mt-4">{user?.username || '加载中...'}</h2>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
            <Award className="w-3 h-3" />
            声望 {user?.reputation || 0}
          </div>
          {user?.is_pro && (
            <div className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Zap className="w-3 h-3" />
              PRO 会员
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="text-gray-400 text-xs mb-1">预测成功率</div>
        <div className="text-xl font-bold">68%</div>
      </div>
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="text-gray-400 text-xs mb-1">累计获赞</div>
        <div className="text-xl font-bold">1.2k</div>
      </div>
    </div>

    <div className="space-y-2">
      <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest px-2">功能设置</h3>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {[
          { label: '我的预测记录', icon: Activity },
          { label: '自选股预警', icon: Zap },
          { label: '实盘交易设置', icon: TrendingUp },
          { label: '订阅管理', icon: Star }
        ].map((item, i) => (
          <button key={i} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-gray-400" />
              <span className="font-medium">{item.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('heat');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [filters, setFilters] = useState({ market: 'All', cycle: 'Day', industry: 'All' });

  useEffect(() => {
    const params = new URLSearchParams(filters);
    fetch(`/api/stocks?${params}`).then(res => res.json()).then(setStocks);
    fetch('/api/user/1').then(res => res.json()).then(setUser);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'price_update') {
        setStocks(data.payload);
      }
    };
    return () => ws.close();
  }, [filters]);

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-gray-900 font-sans selection:bg-indigo-100">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl md:max-w-2xl lg:max-w-4xl">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="pb-20">
          {activeTab === 'heat' && (
            <HeatRanking 
              stocks={stocks} 
              onSelect={setSelectedStock} 
              onProClick={() => setIsProModalOpen(true)}
              filters={filters}
              setFilters={setFilters}
              isPro={user?.is_pro || false}
            />
          )}
          {activeTab === 'watchlist' && <Watchlist onSelect={setSelectedStock} />}
          {activeTab === 'profile' && <Profile user={user} />}
        </main>

        <AnimatePresence>
          {selectedStock && (
            <StockDetail 
              stock={selectedStock} 
              onClose={() => setSelectedStock(null)} 
              onWatchlistChange={() => {}}
            />
          )}
        </AnimatePresence>

        <ProModal isOpen={isProModalOpen} onClose={() => setIsProModalOpen(false)} />
      </div>
    </div>
  );
}
