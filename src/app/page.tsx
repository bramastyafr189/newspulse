"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Bell, 
  BellOff, 
  Settings, 
  Plus, 
  X, 
  Newspaper,
  TrendingUp,
  Clock,
  FolderPlus,
  Trash2,
  ChevronRight,
  Hash,
  Search,
  Globe,
  Zap,
  LayoutGrid,
  RefreshCcw,
  Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchNews, NewsArticle } from "@/lib/news";

interface InterestGroup {
  id: number;
  name: string;
  language?: string | null;
  country?: string | null;
  refreshInterval: number; // minutes
  notificationsEnabled: boolean;
  lastScanAt?: string | null;
  keywords: { id: number; word: string }[];
}

const LANGUAGES = [
  { code: 'any', name: 'Global (All)', flag: '🌐' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
];

const INTERVAL_OPTIONS = [
  { value: 0, label: 'Manual' },
  { value: 15, label: '15 Min' },
  { value: 30, label: '30 Min' },
  { value: 60, label: '1 Hour' },
  { value: 360, label: '6 Hours' },
  { value: 720, label: '12 Hours' },
];

export default function Home() {
  const [groups, setGroups] = useState<InterestGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupLang, setNewGroupLang] = useState("any");
  const [newKeyword, setNewKeyword] = useState("");
  const [news, setNews] = useState<NewsArticle[]>([]);
  
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const groupsRef = useRef<InterestGroup[]>([]);

  // Update ref whenever groups change so polling has latest config
  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  // Load Groups and Keywords
  const loadData = useCallback(async () => {
    try {
      const resp = await fetch('/api/interests');
      const data = await resp.json();
      
      if (Array.isArray(data)) {
        setGroups(data);
        if (data.length > 0 && activeGroupId === null) {
          setActiveGroupId(data[0].id);
        }
      } else {
        setGroups([]);
      }
    } catch (e) {
      setGroups([]);
    }
  }, [activeGroupId]);

  useEffect(() => {
    loadData();
    if ("Notification" in window) {
      setNotificationsAllowed(Notification.permission === "granted");
    }
  }, [loadData]);

  const activeGroup = groups.find(g => g.id === activeGroupId);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsAllowed(permission === "granted");
  };

  const handleFetch = async (keywords: string[], lang?: string | null, country?: string | null, groupId?: number) => {
    if (groupId === activeGroupId) setLoading(true);
    try {
      const data = await fetchNews(keywords, lang, country);
      if (groupId === activeGroupId) setNews(data);
      
      // Update lastScanAt in DB
      if (groupId) {
        const now = new Date().toISOString();
        await fetch(`/api/interests?id=${groupId}`, {
          method: 'PATCH',
          body: JSON.stringify({ lastScanAt: now })
        });
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, lastScanAt: now } : g));
      }
      
      return data;
    } catch (error) {
      console.error("Failed to fetch news", error);
      return [];
    } finally {
      if (groupId === activeGroupId) setLoading(false);
    }
  };

  const triggerManualFetch = () => {
    if (activeGroup && activeGroup.keywords.length > 0) {
      handleFetch(
        activeGroup.keywords.map(k => k.word),
        activeGroup.language,
        activeGroup.country,
        activeGroup.id
      );
    }
  };

  // Background Polling Logic
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const now = new Date();
      
      for (const group of groupsRef.current) {
        if (!group.notificationsEnabled || group.refreshInterval <= 0 || group.keywords.length === 0) continue;
        
        const lastScan = group.lastScanAt ? new Date(group.lastScanAt) : new Date(0);
        const diffMinutes = (now.getTime() - lastScan.getTime()) / (1000 * 60);

        if (diffMinutes >= group.refreshInterval) {
          console.log(`[Auto-Scan] Processing: ${group.name}`);
          const fetchedNews = await handleFetch(
            group.keywords.map(k => k.word),
            group.language,
            group.country,
            group.id
          );

          // Find "New" articles (published after last scan)
          const newArticles = fetchedNews.filter(a => new Date(a.publishedAt) > lastScan);
          
          if (newArticles.length > 0 && Notification.permission === "granted") {
            new Notification(`NewsPulse: ${group.name}`, {
              body: `${newArticles.length} new articles found for your keywords!`,
              icon: '/icons/icon-192x192.png'
            });
          }
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(pollInterval);
  }, [activeGroupId]); // Re-run if active group id changes (to sync loading states correctly)

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const resp = await fetch('/api/interests', {
        method: 'POST',
        body: JSON.stringify({ 
          name: newGroupName.trim(),
          language: newGroupLang === 'any' ? null : newGroupLang
        })
      });
      const newGroup = await resp.json();
      setGroups([...groups, { ...newGroup, keywords: [] }]);
      setActiveGroupId(newGroup.id);
      setNewGroupName("");
      setNewGroupLang("any");
      setIsCreatingGroup(false);
    } catch (e) {
      console.error(e);
    }
  };

  const updateGroupSetting = async (id: number, settings: Partial<InterestGroup>) => {
    try {
      await fetch(`/api/interests?id=${id}`, {
        method: 'PATCH',
        body: JSON.stringify(settings)
      });
      setGroups(prev => prev.map(g => g.id === id ? { ...g, ...settings } : g));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleAllNotifications = async (enabled: boolean) => {
    try {
      // Parallel update for all groups
      await Promise.all(groups.map(g => 
        fetch(`/api/interests?id=${g.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ notificationsEnabled: enabled })
        })
      ));
      setGroups(prev => prev.map(g => ({ ...g, notificationsEnabled: enabled })));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteGroup = async (id: number) => {
    if (!confirm("Hapus grup ini?")) return;
    try {
      await fetch(`/api/interests?id=${id}`, { method: 'DELETE' });
      const newGroups = groups.filter(g => g.id !== id);
      setGroups(newGroups);
      if (activeGroupId === id) {
        setActiveGroupId(newGroups.length > 0 ? newGroups[0].id : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addKeyword = async () => {
    if (!activeGroupId || !newKeyword.trim()) return;
    try {
      const resp = await fetch('/api/keywords', {
        method: 'POST',
        body: JSON.stringify({ interestId: activeGroupId, word: newKeyword.trim() })
      });
      const savedKeyword = await resp.json();
      
      setGroups(groups.map(g => {
        if (g.id === activeGroupId) {
          return { ...g, keywords: [...g.keywords, savedKeyword] };
        }
        return g;
      }));
      setNewKeyword("");
    } catch (e) {
      console.error(e);
    }
  };

  const removeKeyword = async (id: number) => {
    try {
      await fetch(`/api/keywords?id=${id}`, { method: 'DELETE' });
      setGroups(groups.map(g => {
        if (g.id === activeGroupId) {
          return { ...g, keywords: g.keywords.filter(k => k.id !== id) };
        }
        return g;
      }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main className="fade-in pb-10">
      <div className="bg-blob-1" />
      <div className="bg-blob-2" />
      {/* Premium Navigation */}
      <nav className="glass fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="nav-container mx-auto">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent to-purple-400 flex items-center justify-center shadow-lg shadow-accent/30">
              <Zap size={22} className="text-white" fill="white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tighter leading-none">NEWSPULSE</h1>
              <span className="text-[10px] font-bold text-accent tracking-[.2em] uppercase">V2 PRO</span>
            </div>
          </motion.div>
          
          <div className="flex items-center gap-2">
            {!notificationsAllowed && (
              <button 
                onClick={requestNotificationPermission}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
              >
                <Bell size={14} /> Enable Alerts
              </button>
            )}
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 hover:bg-white/10 transition-all active:scale-95"
            >
              <LayoutGrid size={20} className="text-white/70" />
            </button>
          </div>
        </div>
      </nav>

      <div className="content-wrapper max-w-[720px] px-6 sm:px-10 w-full">
        
        {/* Horizontal Channel Bar */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30">Intelligence Hub</h2>
            <button 
              onClick={() => setIsCreatingGroup(!isCreatingGroup)}
              className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent hover:bg-accent hover:text-white transition-all shadow-lg shadow-accent/10"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
            {groups.map(group => (
              <motion.button
                key={group.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setActiveGroupId(group.id);
                  setNews([]);
                }}
                className={`flex-shrink-0 flex flex-col items-center gap-1 group relative`}
              >
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 border-2 ${
                  activeGroupId === group.id 
                  ? 'bg-accent border-accent shadow-xl shadow-accent/30' 
                  : 'bg-white/5 border-transparent hover:border-white/10'
                }`}>
                  <Hash size={24} className={activeGroupId === group.id ? 'text-white' : 'text-white/20 group-hover:text-white/40'} />
                </div>
                {group.notificationsEnabled && (
                  <div className="absolute top-0 right-0 w-3 h-3 bg-accent-secondary rounded-full border-2 border-background animate-pulse" />
                )}
                <span className={`text-[11px] font-bold truncate max-w-[70px] ${activeGroupId === group.id ? 'text-white' : 'text-white/40'}`}>
                  {group.name}
                </span>
              </motion.button>
            ))}
          </div>
          
          <AnimatePresence>
            {isCreatingGroup && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                className="card flex flex-col gap-4 bg-gradient-to-br from-white/[0.08] to-transparent p-6 border-accent/20"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider">New Channel</h3>
                  <X size={18} className="text-white/20 cursor-pointer hover:text-white" onClick={() => setIsCreatingGroup(false)} />
                </div>
                <div className="flex flex-col gap-3">
                  <input 
                    type="text" 
                    autoFocus
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="E.g. Middle East War, Crypto..."
                    className="input-field"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select 
                      value={newGroupLang}
                      onChange={(e) => setNewGroupLang(e.target.value)}
                      className="input-field py-3 text-sm appearance-none cursor-pointer"
                    >
                      {LANGUAGES.map(l => (
                        <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                      ))}
                    </select>
                    <button onClick={createGroup} className="button-primary py-3">
                      Initialize
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Active Channel Dashboard */}
        {activeGroup && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
          >
            <div className="card-rich p-8 sm:p-14 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Hash size={140} strokeWidth={4} />
              </div>
              
              <div className="relative z-10 flex flex-col gap-10">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="badge bg-accent text-white shadow-lg shadow-accent/20">Active Channel</div>
                      <div className="badge bg-white/10 text-white/60 border border-white/5 flex items-center gap-1.5 backdrop-blur-sm">
                        <span>{LANGUAGES.find(l => l.code === (activeGroup.language || 'any'))?.flag}</span>
                        <span>{LANGUAGES.find(l => l.code === (activeGroup.language || 'any'))?.name}</span>
                      </div>
                    </div>
                    <h3 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter italic break-words leading-[0.9]">{activeGroup.name}</h3>
                  </div>
                  <button 
                    onClick={() => deleteGroup(activeGroup.id)} 
                    className="w-12 h-12 rounded-2xl bg-white/5 flex-shrink-0 flex items-center justify-center hover:bg-error/20 hover:text-error transition-all border border-white/5"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {/* Per-Channel Automation Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-6 rounded-[28px] border border-white/5">
                   <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Auto Alerts</span>
                        <span className="text-xs font-bold text-white uppercase">{activeGroup.notificationsEnabled ? 'Active' : 'Muted'}</span>
                      </div>
                      <button 
                        onClick={() => updateGroupSetting(activeGroup.id, { notificationsEnabled: !activeGroup.notificationsEnabled })}
                        className={`w-14 h-8 rounded-full relative transition-all duration-300 ${activeGroup.notificationsEnabled ? 'bg-accent-secondary' : 'bg-white/10'}`}
                      >
                         <motion.div 
                           animate={{ x: activeGroup.notificationsEnabled ? 24 : 4 }}
                           className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg" 
                         />
                      </button>
                   </div>
                   <div className="flex items-center justify-between sm:border-l sm:border-white/10 sm:pl-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Interval</span>
                        <span className="text-xs font-bold text-white uppercase">{INTERVAL_OPTIONS.find(o => o.value === activeGroup.refreshInterval)?.label}</span>
                      </div>
                      <select 
                        value={activeGroup.refreshInterval}
                        onChange={(e) => updateGroupSetting(activeGroup.id, { refreshInterval: parseInt(e.target.value) })}
                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-black text-white outline-none cursor-pointer"
                      >
                        {INTERVAL_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                   </div>
                </div>
                
                {activeGroup.notificationsEnabled && activeGroup.refreshInterval === 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-accent/5 border border-accent/20 p-4 rounded-2xl flex items-start gap-3 -mt-4"
                  >
                    <Settings size={16} className="text-accent mt-0.5" />
                    <p className="text-[10px] font-bold text-accent/80 leading-relaxed uppercase tracking-wider">
                      Note: Alerts are enabled but Interval is Manual. NewsPulse will only notify you when you trigger a manual scan.
                    </p>
                  </motion.div>
                )}

                <div className="flex flex-col gap-6">
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                      placeholder="Focus area..."
                      className="input-field flex-1 bg-black/40 border-white/5 py-5 px-6"
                    />
                    <button onClick={addKeyword} className="w-14 h-14 rounded-2xl bg-white/10 flex-shrink-0 flex items-center justify-center hover:bg-white/20 transition-all border border-white/5">
                      <Plus size={28} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {activeGroup.keywords.map(kw => (
                      <motion.div 
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        key={kw.id}
                        className="bg-accent/5 border border-accent/20 rounded-2xl px-5 py-2.5 flex items-center gap-3 transition-colors hover:border-accent/40"
                      >
                        <span className="text-xs font-black text-accent tracking-tight">{kw.word.toUpperCase()}</span>
                        <X size={16} className="text-accent/40 cursor-pointer hover:text-white" onClick={() => removeKeyword(kw.id)} />
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-10 border-t border-white/5 mt-4 gap-8">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Source Localization</span>
                      <select 
                        value={activeGroup.language || 'any'}
                        onChange={(e) => updateGroupSetting(activeGroup.id, { language: e.target.value === 'any' ? null : e.target.value })}
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-black text-white outline-none cursor-pointer hover:border-accent transition-all min-w-[160px] shadow-inner"
                      >
                        {LANGUAGES.map(l => (
                          <option key={l.code} value={l.code} className="bg-[#121214]">{l.flag} {l.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button 
                    onClick={triggerManualFetch} 
                    className="button-primary flex items-center gap-4 group/btn py-5 px-10 shadow-2xl"
                    disabled={activeGroup.keywords.length === 0}
                  >
                    <Search size={22} className="group-hover/btn:rotate-12 transition-transform" />
                    <span className="text-xs uppercase tracking-[0.2em] font-black italic">Scan Pipeline</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* News Feed Gallery */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-white/40">
              Intelligence Feed
            </h2>
            {news.length > 0 && (
              <span className="text-[10px] font-black text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
                {news.length} ARTICLES SCAN RESULT
              </span>
            )}
          </div>

          {!activeGroup ? (
            <div className="py-20 flex flex-col items-center gap-6 text-center">
              <div className="w-24 h-24 rounded-[32px] bg-white/5 flex items-center justify-center border border-white/10 animate-pulse">
                <Newspaper size={40} className="text-white/10" />
              </div>
              <p className="text-sm text-white/30 max-w-[200px] leading-relaxed">Select or create a channel to begin scanning data.</p>
            </div>
          ) : loading ? (
            <div className="py-20 flex flex-col items-center gap-8 text-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
                <Zap size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-accent" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-bold text-white uppercase tracking-widest">Injecting Keywords...</p>
                <div className="flex items-center gap-1 justify-center">
                  {activeGroup.keywords.slice(0, 3).map((k, i) => (
                    <span key={i} className="text-[10px] text-white/20">#{k.word}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : news.length > 0 ? (
            <div className="grid grid-cols-1 gap-8">
              {news.map((article, i) => (
                <motion.div 
                  key={article.id}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ 
                    duration: 0.5,
                    delay: i * 0.05,
                    type: "spring",
                    stiffness: 100
                  }}
                  className="card-rich group cursor-pointer"
                  onClick={() => window.open(article.url, '_blank')}
                >
                  <div className="relative aspect-video overflow-hidden">
                    {article.image ? (
                      <img 
                        src={article.image} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        alt=""
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/20 to-purple-900/40 flex items-center justify-center">
                         <Globe size={40} className="text-white/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    
                    <div className="absolute top-6 left-6 flex gap-2">
                      <div className="badge glass bg-black/40 text-[9px]">
                        {article.source}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-10 pb-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                       <Clock size={12} /> {new Date(article.publishedAt).toLocaleDateString()} • {new Date(article.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <h3 className="text-2xl font-black leading-tight tracking-tight group-hover:text-accent transition-colors">{article.title}</h3>
                    <p className="text-sm text-white/50 line-clamp-2 leading-relaxed">{article.description}</p>
                  </div>
                  
                  <div className="px-10 py-6 flex items-center justify-between border-t border-white/5 mt-2">
                    <span className="text-[10px] font-black text-accent uppercase tracking-widest">Secure Link Available</span>
                    <ChevronRight size={18} className="text-accent transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-24 px-8 flex flex-col items-center gap-8 text-center bg-white/5 rounded-[48px] border border-dashed border-white/10">
              <Search size={60} strokeWidth={1} className="text-white/10" />
              <div className="flex flex-col gap-4 max-w-[280px]">
                <p className="text-xl font-black tracking-tight uppercase italic">{activeGroup.keywords.length > 0 ? 'Ready to Scan' : 'Pipeline Empty'}</p>
                <p className="text-xs text-white/40 leading-relaxed font-bold">
                  {activeGroup.keywords.length > 0 
                   ? `Click below to scan for ${activeGroup.name} intelligence.` 
                   : 'Add keywords to this channel to begin scanning the news database.'}
                </p>
                {activeGroup.keywords.length > 0 && (
                  <button 
                    onClick={triggerManualFetch}
                    className="button-primary mt-8 mb-4 py-5"
                  >
                    Start Intelligence Scan
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modern tray Settings */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-end justify-center"
            onClick={() => setShowSettings(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-[#0a0a0c] w-full max-w-lg rounded-t-[48px] p-10 border-t border-white/10 flex flex-col gap-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-2" />
              
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter">System</h3>
                  <p className="text-sm text-white/30">Application Configuration</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="card bg-white/5 border-white/5 p-6 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-2xl ${notificationsAllowed ? 'bg-accent/20 text-accent' : 'bg-white/5 text-muted'}`}>
                            {notificationsAllowed ? <Bell size={28} /> : <BellOff size={28} />}
                            </div>
                            <div className="flex flex-col">
                            <span className="font-black text-lg tracking-tight">BROWSER ALERTS</span>
                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{notificationsAllowed ? 'Permission Granted' : 'Block Detected'}</span>
                            </div>
                        </div>
                        {!notificationsAllowed && (
                            <button onClick={requestNotificationPermission} className="text-accent text-[10px] font-black uppercase underline decoration-2 underline-offset-4">Fix</button>
                        ) }
                    </div>
                </div>

                <div className="card bg-white/5 border-white/5 p-6 flex flex-col gap-6">
                  <div className="flex flex-col gap-1">
                      <span className="font-black text-lg tracking-tight">GLOBAL AUTOMATION</span>
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Bulk Actions</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => toggleAllNotifications(true)}
                        className="bg-accent/10 border border-accent/20 text-accent text-[10px] font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-accent hover:text-white transition-all uppercase tracking-widest"
                      >
                         <Bell size={14} /> Activate All
                      </button>
                      <button 
                         onClick={() => toggleAllNotifications(false)}
                         className="bg-white/5 border border-white/10 text-white/40 text-[10px] font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-error/20 hover:text-error transition-all uppercase tracking-widest"
                      >
                         <BellOff size={14} /> Silence All
                      </button>
                  </div>
                </div>

                <div className="card bg-white/5 border-white/5 p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-accent/20 text-accent">
                      <Volume2 size={28} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-lg tracking-tight">GLOBAL SYNC</span>
                      <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Background Pipeline Active</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full relative">
                    <motion.div 
                      animate={{ 
                        opacity: [0.3, 1, 0.3],
                        scaleX: [1, 1.02, 1],
                        backgroundColor: ["#814cff", "#a855f7", "#814cff"],
                        boxShadow: [
                            "0 0 0px rgba(129, 76, 255, 0)",
                            "0 0 15px rgba(129, 76, 255, 0.8)",
                            "0 0 0px rgba(129, 76, 255, 0)"
                        ]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        ease: "easeInOut" 
                      }}
                      className="h-full w-full rounded-full origin-left"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)} 
                className="button-primary py-5 text-lg font-black uppercase italic tracking-tighter"
              >
                Close Settings
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
