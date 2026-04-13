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
  Volume2,
  Home as HomeIcon,
  Compass,
  User,
  ChevronDown,
  Calendar,
  Radio,
  Satellite,
  Terminal,
  Activity,
  Cpu,
  Radar,
  Rocket,
  Shield,
  Target,
  Wifi,
  Edit2,
  MoreVertical
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchNews, NewsArticle } from "@/lib/news";

interface AppNotification {
  id: string;
  title: string;
  body: string;
  channel: string;
  timestamp: string;
  articles?: NewsArticle[];
}

// Helper for professional time formatting
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  // Format to local HH:MM
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (diffInHours < 1) {
    const mins = Math.max(1, Math.floor(diffInHours * 60));
    return `${mins}M AGO • ${timeStr}`;
  }
  
  if (date.toDateString() === now.toDateString()) {
    return `TODAY • ${timeStr}`;
  }
  
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `YESTERDAY • ${timeStr}`;
  }
  
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase()} • ${timeStr}`;
};

const triggerNotification = async (title: string, body: string) => {
  if (Notification.permission === "granted") {
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [100, 50, 100],
        tag: 'intelligence-report',
        renotify: true
      });
    } catch (e) {
      console.error("SW notification failed, falling back", e);
      new Notification(title, { body, icon: '/icon-192x192.png' });
    }
  }
};

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  // Format to local HH:MM
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (diffInMins < 60) {
    return `${Math.max(1, diffInMins)}M AGO • ${timeStr}`;
  }
  if (diffInHours < 24) {
    return `${diffInHours}H AGO • ${timeStr}`;
  }
  return `${diffInDays}D AGO • ${timeStr}`;
};

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

const CHANNEL_ICONS = [Hash, Globe, Activity, Cpu, Radar, Shield, Rocket, Target, Wifi, Radio, Satellite, Terminal];

const getChannelIcon = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CHANNEL_ICONS[Math.abs(hash) % CHANNEL_ICONS.length];
};

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

function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!ref.current) return;
    setIsDragging(true);
    setStartX(e.pageX - ref.current.offsetLeft);
    setScrollLeft(ref.current.scrollLeft);
  };
  const onMouseLeave = () => setIsDragging(false);
  const onMouseUp = () => setIsDragging(false);
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX) * 2;
    ref.current.scrollLeft = scrollLeft - walk;
  };

  return {
    ref,
    onMouseDown,
    onMouseLeave,
    onMouseUp,
    onMouseMove,
    className: `overflow-x-auto scrollbar-hide ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`,
  };
}

export default function Home() {
  const [groups, setGroups] = useState<InterestGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const channelScroll = useDragScroll();
  const filterScroll = useDragScroll();
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupLang, setNewGroupLang] = useState("any");
  const [newKeyword, setNewKeyword] = useState("");
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [historyLogs, setHistoryLogs] = useState<AppNotification[]>([]);
  const [tickerTime, setTickerTime] = useState(Date.now());
  const [showClearLogsModal, setShowClearLogsModal] = useState(false);
  const [logChannelFilter, setLogChannelFilter] = useState<string>("all");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isRenamingGroupId, setIsRenamingGroupId] = useState<number | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [showActionMenu, setShowActionMenu] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScrollDir = () => {
      const scrollY = window.scrollY;
      if (Math.abs(scrollY - lastScrollY) < 10) {
        ticking = false;
        return;
      }
      setIsNavVisible(scrollY < lastScrollY || scrollY < 50);
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDir);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Initialize logs from DB
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const res = await fetch('/api/logs');
        if (res.ok) {
          const data = await res.json();
          setHistoryLogs(data);
        }
      } catch (e) {
        console.error("Failed to load global logs", e);
      }
    };
    loadLogs();
  }, []);

  // Real-time ticker for countdown precision
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);
  const [keywordToDelete, setKeywordToDelete] = useState<{ id: number; word: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'account'>('home');
  const [isGlobalSyncEnabled, setIsGlobalSyncEnabled] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  const [selectedLog, setSelectedLog] = useState<AppNotification | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

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
    
    // Load global sync preference
    const savedSync = localStorage.getItem('newspulse_global_sync');
    if (savedSync !== null) {
      setIsGlobalSyncEnabled(savedSync === 'true');
    }
  }, [loadData]);

  const toggleGlobalSync = (enabled: boolean) => {
    setIsGlobalSyncEnabled(enabled);
    localStorage.setItem('newspulse_global_sync', String(enabled));
    showToast(enabled ? "Global monitoring activated" : "Global monitoring suspended", enabled ? "success" : "info");
  };

  const activeGroup = groups.find(g => g.id === activeGroupId);
  const uniqueSources = Array.from(new Set(news.map(n => n.source))).filter(Boolean).sort();
  const filteredNews = sourceFilter === "all" ? news : news.filter(n => n.source === sourceFilter);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsAllowed(permission === "granted");
  };

  const testNotification = () => {
    if (Notification.permission === "granted") {
      if (permission === 'granted') {
        triggerNotification(
          "Intelligence Report: Target Acquired", 
          "Encrypted signal established. Real-time surveillance protocols are active."
        );
      }
    } else {
      alert("Please allow notifications first!");
    }
  };

  const handleFetch = async (keywords: string[], lang?: string | null, country?: string | null, groupId?: number) => {
    if (groupId === activeGroupId) setLoading(true);
    try {
      const data = await fetchNews(keywords, lang, country);
      
      const targetGroup = groups.find(g => g.id === groupId);
      const lastScan = targetGroup?.lastScanAt ? new Date(targetGroup.lastScanAt) : new Date(0);
      const newArticles = data.filter(a => new Date(a.publishedAt) > lastScan);

      if (groupId === activeGroupId) {
        setNews(data);
        setSourceFilter("all");
      }
      
      // Update lastScanAt in DB
      if (groupId) {
        const now = new Date().toISOString();
        await fetch(`/api/interests?id=${groupId}`, {
          method: 'PATCH',
          body: JSON.stringify({ lastScanAt: now })
        });
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, lastScanAt: now } : g));

        // Create log entry for intelligence persistence
        if (newArticles.length > 0) {
          const newLog = {
            id: Math.random().toString(36).substr(2, 9),
            title: `+${newArticles.length}`,
            body: `Sync complete for "${targetGroup?.name || 'Channel'}" pipeline.`,
            channel: targetGroup?.name || 'Unknown',
            timestamp: now,
            articles: newArticles
          };
          
          try {
            await fetch('/api/logs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newLog)
            });
            // Update local state after successful POST
            setHistoryLogs(prev => [newLog, ...prev].slice(0, 100));
          } catch (e) {
            console.error("Failed to sync log to database", e);
          }
        }
      }
      
      return data;
    } catch (error) {
      console.error("Failed to fetch news", error);
      return [];
    } finally {
      if (groupId === activeGroupId) setLoading(false);
    }
  };

  const saveRename = async (id: number) => {
    if (!editGroupName.trim()) {
      setIsRenamingGroupId(null);
      return;
    }
    await updateGroupSetting(id, { name: editGroupName.trim() });
    setIsRenamingGroupId(null);
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

  // Background Polling Logic: Ensures news is always fresh and alerts are sent
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      // 1. Check Global Master Switch
      if (!isGlobalSyncEnabled) return;

      const now = new Date();
      let scanPerformed = false;
      
      for (const group of groupsRef.current) {
        // Skip if alerts are off (to save API quota), or no keywords/interval defined
        if (!group.notificationsEnabled || group.refreshInterval <= 0 || group.keywords.length === 0) continue;
        
        const lastScan = group.lastScanAt ? new Date(group.lastScanAt) : new Date(0);
        const diffMinutes = (now.getTime() - lastScan.getTime()) / (1000 * 60);

        if (diffMinutes >= group.refreshInterval) {
          if (!scanPerformed) {
             scanPerformed = true;
             setIsScanning(true);
          }

          console.log(`[Auto-Scan] Processing: ${group.name}`);
          const fetchedNews = await handleFetch(
            group.keywords.map(k => k.word),
            group.language,
            group.country,
            group.id
          );

          // Find "New" articles (published after last scan)
          const newArticles = fetchedNews.filter(a => new Date(a.publishedAt) > lastScan);
          
          // Only notify if alerts are specifically enabled for this group AND browser permission is granted
          if (group.notificationsEnabled && newArticles.length > 0) {
            triggerNotification(
              `NewsPulse: ${group.name}`, 
              `${newArticles.length} new articles found for your keywords!`
            );
          }
        }
      }

      if (scanPerformed) {
        setTimeout(() => setIsScanning(false), 3000); // Visual feedback duration
      }
    }, 10000); // Pulse check every 10 seconds for precise monitoring

    return () => clearInterval(pollInterval);
  }, [activeGroupId, isGlobalSyncEnabled]); // Re-run if global sync changes

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
      showToast(`Intelligence channel "${newGroup.name}" established`);
    } catch (e) {
      console.error(e);
      showToast("Security breach: Failed to initialize channel", "error");
    }
  };

  const updateGroupSetting = async (id: number, settings: Partial<InterestGroup>) => {
    try {
      await fetch(`/api/interests?id=${id}`, {
        method: 'PATCH',
        body: JSON.stringify(settings)
      });
      const targetGroup = groups.find(g => g.id === id);
      setGroups(prev => prev.map(g => g.id === id ? { ...g, ...settings } : g));
      
      const gName = targetGroup?.name || "Channel";
      if ('notificationsEnabled' in settings) {
        showToast(settings.notificationsEnabled ? `"${gName}" monitoring activated` : `"${gName}" monitoring suspended`, "success");
      } else if ('refreshInterval' in settings) {
        showToast(`Tracking frequency for "${gName}" set to ${settings.refreshInterval} min`, "info");
      } else if ('language' in settings) {
        const langName = LANGUAGES.find(l => l.code === (settings.language || 'any'))?.name || "Global";
        showToast(`Intelligence source for "${gName}" updated to ${langName}`, "success");
      } else {
        showToast(`Configuration protocols for "${gName}" updated`);
      }
    } catch (e) {
      console.error(e);
      showToast("Critical Error: Update sequence failed", "error");
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
      showToast(enabled ? "Bulk monitoring activated" : "Bulk monitoring suspended", enabled ? "success" : "info");
    } catch (e) {
      console.error(e);
      showToast("Critical Error: Bulk update sequence aborted", "error");
    }
  };

  const deleteGroup = async () => {
    if (!groupToDelete) return;
    const id = groupToDelete;
    try {
      await fetch(`/api/interests?id=${id}`, { method: 'DELETE' });
      const newGroups = groups.filter(g => g.id !== id);
      setGroups(newGroups);
      if (activeGroupId === id) {
        setActiveGroupId(newGroups.length > 0 ? newGroups[0].id : null);
      }
      const deletedName = groups.find(g => g.id === id)?.name || "Channel";
      setGroupToDelete(null);
      showToast(`Intelligence channel "${deletedName}" decommissioned`, "info");
    } catch (e) {
      console.error(e);
      showToast("Security Breach: Decommissioning sequence failed", "error");
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
      showToast(`Entity "${savedKeyword.word.toUpperCase()}" integrated into "${activeGroup?.name}" surveillance`);
    } catch (e) {
      console.error(e);
      showToast("Security Breach: Failed to integrate mission target", "error");
    }
  };

  const removeKeyword = (id: number, word: string) => {
    setKeywordToDelete({ id, word });
  };

  const confirmRemoveKeyword = async () => {
    if (!keywordToDelete) return;
    const { id, word } = keywordToDelete;
    try {
      await fetch(`/api/keywords?id=${id}`, { method: 'DELETE' });
      setGroups(groups.map(g => {
        if (g.id === activeGroupId) {
          return { ...g, keywords: g.keywords.filter(k => k.id !== id) };
        }
        return g;
      }));
      setKeywordToDelete(null);
      showToast(`Entity "${word.toUpperCase()}" decoupled from "${activeGroup?.name}" monitoring`, "info");
    } catch (e) {
      console.error(e);
      showToast("Security Breach: Failed to decouple target", "error");
    }
  };

  return (
    <main className="relative z-0 pb-28">
      <div className="bg-blob-1" />
      <div className="bg-blob-2" />
      {/* Premium Navigation */}
      <motion.nav 
        initial={{ y: 0 }}
        animate={{ y: isNavVisible ? 0 : "-100%" }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="glass fixed top-0 left-0 right-0 z-50 px-4 py-2"
      >
        <div className="nav-container mx-auto">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-accent/20 rounded-xl blur-md group-hover:bg-accent/30 transition-all animate-pulse-slow" />
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden border border-white/10 glass-light">
                <img src="/icon-192x192.png" alt="NewsPulse Logo" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tighter leading-none bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">NEWSPULSE</h1>
              <span className="text-[9px] font-black text-accent tracking-[.3em] uppercase opacity-80">Smart News Tracker</span>
            </div>
          </motion.div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center border border-white/5 hover:bg-white/10 transition-all active:scale-95"
            >
              <LayoutGrid size={20} className="text-white/70" />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Main Content Areas */}
      {activeTab === 'home' && (
        <div className="pt-20 px-4 sm:px-6 w-full max-w-[720px] mx-auto flex flex-col gap-4 fade-in">
        
        {/* Horizontal Channel Bar */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30">Intelligence Hub</h2>
            <button 
              onClick={() => setIsCreatingGroup(!isCreatingGroup)}
              className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent hover:bg-accent hover:text-white transition-all shadow-lg shadow-accent/10"
            >
              <Plus size={20} />
            </button>
          </div>

          <div 
            className={`flex gap-3 pb-2 -mx-1 px-1 ${channelScroll.className}`}
            ref={channelScroll.ref}
            onMouseDown={channelScroll.onMouseDown}
            onMouseLeave={channelScroll.onMouseLeave}
            onMouseUp={channelScroll.onMouseUp}
            onMouseMove={channelScroll.onMouseMove}
          >
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
                  {(() => {
                    const IconObj = getChannelIcon(group.name);
                    return <IconObj size={24} className={activeGroupId === group.id ? 'text-white' : 'text-white/20 group-hover:text-white/40'} />;
                  })()}
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
                className="card-rich p-4 sm:p-6 border-accent/20"
              >
                <div className="flex flex-col gap-4 sm:gap-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">New Channel</h3>
                    <X size={18} className="text-white/20 cursor-pointer hover:text-white" onClick={() => setIsCreatingGroup(false)} />
                  </div>
                  <div className="flex flex-col gap-3">
                    <input 
                      type="text" 
                      autoFocus
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="E.g. Middle East War, Crypto..."
                      className="input-field py-3 px-4 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <select 
                          value={newGroupLang}
                          onChange={(e) => setNewGroupLang(e.target.value)}
                          className="input-field py-3 pr-10 text-xs appearance-none cursor-pointer"
                        >
                          {LANGUAGES.map(l => (
                            <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                      </div>
                      <button onClick={createGroup} className="button-primary py-3 px-4 text-xs font-black uppercase">
                        Initialize
                      </button>
                    </div>
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
            className="flex flex-col gap-4"
          >
            <div className="card-rich p-4 sm:p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                {(() => {
                    const IconObj = getChannelIcon(activeGroup.name);
                    return <IconObj size={140} strokeWidth={4} />;
                })()}
              </div>
              
              <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="badge bg-accent text-white shadow-lg shadow-accent/20">Active Channel</div>
                      <div className="badge bg-white/10 text-white/60 border border-white/5 flex items-center gap-1.5 backdrop-blur-sm">
                        <span>{LANGUAGES.find(l => l.code === (activeGroup.language || 'any'))?.flag}</span>
                        <span>{LANGUAGES.find(l => l.code === (activeGroup.language || 'any'))?.name}</span>
                      </div>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter italic break-words leading-tight">{activeGroup.name}</h3>
                  </div>
                  <div className="relative flex-shrink-0">
                    <button 
                      onClick={() => setShowActionMenu(!showActionMenu)} 
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border border-white/5 shadow-xl ${
                        showActionMenu ? 'bg-accent text-white border-accent' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <MoreVertical size={20} />
                    </button>

                    <AnimatePresence>
                      {showActionMenu && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setShowActionMenu(false)} 
                          />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: -10, x: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10, x: 10 }}
                            className="absolute right-0 top-14 w-48 bg-[#1a1b26]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden flex flex-col p-1.5"
                          >
                             <button 
                               onClick={() => {
                                 setShowActionMenu(false);
                                 setEditGroupName(activeGroup.name);
                                 setIsRenamingGroupId(activeGroup.id);
                               }}
                               className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-xs font-bold text-white/70 hover:text-white transition-all text-left"
                             >
                                <Edit2 size={16} className="text-accent" />
                                <span>Rename Channel</span>
                             </button>
                             <div className="h-px bg-white/5 mx-2 my-1" />
                             <button 
                               onClick={() => {
                                 setShowActionMenu(false);
                                 setGroupToDelete(activeGroup.id);
                               }}
                               className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-error/10 text-xs font-bold text-white/50 hover:text-error transition-all text-left"
                             >
                                <Trash2 size={16} className="text-error/70" />
                                <span>Delete Channel</span>
                             </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Per-Channel Automation Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-4 rounded-[28px] border border-white/5">
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
                        <span className="text-xs font-bold text-white uppercase">
                           {INTERVAL_OPTIONS.find(o => o.value === activeGroup.refreshInterval)?.label || `${activeGroup.refreshInterval} Mins`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="relative">
                           <select 
                             value={INTERVAL_OPTIONS.some(o => o.value === activeGroup.refreshInterval) ? activeGroup.refreshInterval : "custom"}
                             onChange={(e) => {
                               const val = e.target.value;
                               if (val === "custom") {
                                 setIsCustomMode(true);
                               } else {
                                 setIsCustomMode(false);
                                 updateGroupSetting(activeGroup.id, { refreshInterval: parseInt(val) });
                               }
                             }}
                             className="bg-black/40 border border-white/10 rounded-xl pl-3 pr-10 h-8 text-[10px] font-black text-white outline-none cursor-pointer appearance-none hover:border-white/20 transition-all flex items-center"
                           >
                             {INTERVAL_OPTIONS.map(opt => (
                               <option key={opt.value} value={opt.value} className="bg-[#121214]">{opt.label}</option>
                             ))}
                             <option value="custom" className="bg-[#121214]">Custom...</option>
                           </select>
                           <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                         </div>
                         {isCustomMode && (
                           <input 
                             type="number"
                             min="1"
                             autoFocus
                             placeholder="Mins"
                             value={activeGroup.refreshInterval === 0 ? '' : activeGroup.refreshInterval}
                             onChange={(e) => updateGroupSetting(activeGroup.id, { refreshInterval: parseInt(e.target.value) || 0 })}
                             className="w-16 h-8 bg-black/40 border border-white/10 rounded-xl px-2 text-[10px] font-black text-white outline-none focus:border-accent"
                           />
                         )}
                      </div>
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

                <div className="flex flex-col gap-4 sm:gap-6">
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                      placeholder="Focus area..."
                      className="input-field flex-1 bg-black/40 border-white/5 py-3 px-4"
                    />
                    <button onClick={addKeyword} className="w-12 h-12 rounded-2xl bg-white/10 flex-shrink-0 flex items-center justify-center hover:bg-white/20 transition-all border border-white/5">
                      <Plus size={28} />
                    </button>
                  </div>

                  {activeGroup.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {activeGroup.keywords.map(kw => (
                        <motion.div 
                          layout
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          key={kw.id}
                          className="bg-accent/5 border border-accent/20 rounded-2xl px-5 py-2.5 flex items-center gap-3 transition-colors hover:border-accent/40"
                        >
                          <span className="text-xs font-black text-accent tracking-tight break-all">{kw.word.toUpperCase()}</span>
                          <X size={16} className="text-accent/40 cursor-pointer hover:text-white flex-shrink-0" onClick={() => removeKeyword(kw.id, kw.word)} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-white/5 gap-4 ${
                  activeGroup.keywords.length > 0 ? 'pt-5 mt-0' : 'pt-4 mt-0'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Source Localization</span>
                      <div className="relative">
                        <select 
                          value={activeGroup.language || 'any'}
                          onChange={(e) => updateGroupSetting(activeGroup.id, { language: e.target.value === 'any' ? null : e.target.value })}
                          className="bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-xs font-black text-white outline-none cursor-pointer hover:border-accent transition-all min-w-[180px] shadow-inner appearance-none"
                        >
                          {LANGUAGES.map(l => (
                            <option key={l.code} value={l.code} className="bg-[#121214]">{l.flag} {l.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  {activeGroup.keywords.length > 0 && (
                    <button 
                      onClick={triggerManualFetch} 
                      className="button-primary flex items-center gap-4 group/btn py-3 px-6 shadow-2xl"
                    >
                      <Search size={22} className="group-hover/btn:rotate-12 transition-transform" />
                      <span className="text-xs uppercase tracking-[0.2em] font-black italic">Scan Pipeline</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* News Feed Gallery */}
        <section className="flex flex-col gap-4">
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
            <div className="flex flex-col gap-6">
              {uniqueSources.length > 1 && (
                <div 
                  className={`flex items-center gap-3 pb-2 -mx-1 px-1 ${filterScroll.className}`}
                  ref={filterScroll.ref}
                  onMouseDown={filterScroll.onMouseDown}
                  onMouseLeave={filterScroll.onMouseLeave}
                  onMouseUp={filterScroll.onMouseUp}
                  onMouseMove={filterScroll.onMouseMove}
                >
                 <button 
                   onClick={() => setSourceFilter("all")} 
                   className={`flex-shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${sourceFilter === 'all' ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white/80'}`}
                 >
                   ALL SOURCES
                 </button>
                 {uniqueSources.map(source => (
                   <button 
                     key={source}
                     onClick={() => setSourceFilter(source)}
                     className={`flex-shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${sourceFilter === source ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white/80'}`}
                   >
                     {source}
                   </button>
                 ))}
                </div>
              )}
              <div className="flex flex-col gap-3">
                {filteredNews.map((article, i) => (
                <motion.div 
                  key={article.id}
                  initial={{ opacity: 0, scale: 0.98, x: -10 }}
                  whileInView={{ opacity: 1, scale: 1, x: 0 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ 
                    duration: 0.3,
                    delay: Math.min(i * 0.03, 0.3),
                    ease: "easeOut"
                  }}
                  className="card-rich group cursor-pointer p-4 sm:p-6 flex gap-4 sm:gap-6 items-start relative overflow-hidden pr-8 sm:pr-14"
                  onClick={() => window.open(article.url, '_blank')}
                >
                  <div className="flex-1 flex flex-col gap-2 min-w-0 z-10">
                    <div className="flex items-center flex-wrap gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">
                       <Clock size={12} className="text-accent/60 flex-shrink-0" /> 
                       <span>{formatTime(article.publishedAt)}</span>
                       <span className="w-1 h-1 rounded-full bg-white/20" />
                       <span className="text-white/80">{article.source}</span>
                    </div>
                    <h3 className="text-[17px] sm:text-xl font-black leading-[1.2] tracking-tight group-hover:text-accent transition-colors">{article.title}</h3>
                    <p className="text-xs sm:text-sm text-white/50 line-clamp-2 leading-relaxed">{article.description}</p>
                  </div>
                  
                  {article.image && (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 z-10 hidden sm:block">
                      <img 
                        src={article.image} 
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        alt=""
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Subtle right chevron indicating it's a clickable link */}
                  <ChevronRight size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/5 group-hover:text-accent transform group-hover:translate-x-1 transition-all" />
                </motion.div>
              ))}
              </div>
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
      )}

      {activeTab === 'explore' && (
        <div className="pt-20 px-4 sm:px-6 w-full max-w-[720px] mx-auto flex flex-col gap-4 fade-in pb-20">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30">Monitoring Hub</h2>
            <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${isGlobalSyncEnabled ? 'bg-accent animate-pulse shadow-[0_0_10px_var(--accent)]' : 'bg-white/10'}`} />
               <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{isGlobalSyncEnabled ? 'Live Connection' : 'Offline'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {(() => {
              const activeTrackers = groups.filter(g => g.notificationsEnabled);
              
              if (activeTrackers.length === 0) {
                return (
                  <div className="py-12 flex flex-col items-center gap-4 text-center bg-white/5 rounded-[48px] border border-dashed border-white/10">
                    <Radar size={60} strokeWidth={1} className="text-white/10" />
                    <p className="text-sm text-white/30 max-w-[200px] leading-relaxed font-bold uppercase tracking-widest leading-relaxed">No active signals found. Enable Auto-Alerts on a channel to begin monitoring.</p>
                  </div>
                );
              }

              return activeTrackers.map(group => {
                const lastScan = group.lastScanAt ? new Date(group.lastScanAt) : new Date(0);
                const nextScan = new Date(lastScan.getTime() + group.refreshInterval * 60000);
                const msRemaining = nextScan.getTime() - tickerTime;
                const isImminent = msRemaining > 0 && msRemaining < 60000;
                const isOverdue = msRemaining <= 0 && group.refreshInterval > 0 && isGlobalSyncEnabled;

                return (
                  <motion.div 
                    layout
                    key={group.id}
                    className="card-rich p-4 flex items-center justify-between relative overflow-hidden"
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                        isOverdue ? 'bg-error/20 border-error/40 text-error' :
                        isImminent ? 'bg-accent/20 border-accent/40 text-accent animate-pulse' :
                        'bg-white/5 border-white/10 text-white/20'
                      }`}>
                        {(() => {
                          const Icon = getChannelIcon(group.name);
                          return <Icon size={20} className={isImminent ? 'animate-bounce' : ''} />;
                        })()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-lg font-black tracking-tight uppercase italic leading-none">{group.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[10px] font-black text-accent bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20 uppercase tracking-tighter">
                             {group.refreshInterval}M PULSE
                           </span>
                           <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none">
                             {group.keywords.length} TARGETS • {group.language || 'GLOBAL'}
                           </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-0.5 relative z-10">
                      {group.refreshInterval > 0 ? (
                        <>
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Next Scan</span>
                          <span className={`text-xl font-black tabular-nums tracking-tighter italic leading-none ${
                            isOverdue || isImminent ? 'text-red-500 animate-pulse' : 'text-white'
                          }`}>
                            {msRemaining > 0 ? (() => {
                              const totalSecs = Math.floor(msRemaining / 1000);
                              const h = Math.floor(totalSecs / 3600);
                              const m = Math.floor((totalSecs % 3600) / 60);
                              const s = totalSecs % 60;
                              if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                              return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                            })() : (isGlobalSyncEnabled ? 'Scanning...' : 'Paused')}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Manual Trigger Required</span>
                      )}
                    </div>
                  </motion.div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="pt-20 px-4 sm:px-6 w-full max-w-[720px] mx-auto flex flex-col gap-4 fade-in pb-20">
          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30">Intelligence Logs</h2>
              <span className="text-[9px] font-bold text-white/20 uppercase">Encrypted Signal History</span>
            </div>
            <button 
              onClick={() => setShowClearLogsModal(true)}
              className="text-[10px] font-black text-error/60 hover:text-error transition-all uppercase tracking-widest border border-error/20 px-4 py-2 rounded-xl bg-error/5"
            >
              Purge Logs
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* Log Channel Filter */}
            {historyLogs.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                <button
                  onClick={() => setLogChannelFilter("all")}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    logChannelFilter === "all" 
                      ? "bg-accent text-white shadow-lg shadow-accent/30" 
                      : "bg-white/5 text-white/40 hover:bg-white/10"
                  }`}
                >
                  All Channels
                </button>
                {Array.from(new Set(historyLogs.map(l => l.channel))).map(channel => (
                  <button
                    key={channel}
                    onClick={() => setLogChannelFilter(channel)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                      logChannelFilter === channel 
                        ? "bg-accent text-white shadow-lg shadow-accent/30" 
                        : "bg-white/5 text-white/40 hover:bg-white/10"
                    }`}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            )}

            {(() => {
              const filtered = logChannelFilter === "all" 
                ? historyLogs 
                : historyLogs.filter(l => l.channel === logChannelFilter);

              if (filtered.length === 0) {
                return (
                  <div className="py-16 flex flex-col items-center gap-4 text-center bg-white/5 rounded-[48px] border border-dashed border-white/10">
                    <Terminal size={60} strokeWidth={1} className="text-white/10" />
                    <div className="flex flex-col gap-2">
                      <p className="text-xl font-black uppercase italic tracking-tighter">No signals found</p>
                      <p className="text-xs text-white/20 max-w-[200px] leading-relaxed font-bold uppercase tracking-widest">
                        {logChannelFilter === "all" ? "Target acquisitions will be recorded here." : `No logs found for channel "${logChannelFilter}".`}
                      </p>
                    </div>
                  </div>
                );
              }

              return filtered.map((log, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.2) }}
                  key={log.id}
                  className="card-rich p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 group border border-white/5 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                    {(() => {
                      const BgIcon = getChannelIcon(log.channel);
                      return <BgIcon size={140} strokeWidth={4} />;
                    })()}
                  </div>
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-black text-accent border border-accent/20 bg-accent/5 px-2 py-0.5 rounded-lg uppercase tracking-widest">{log.channel}</span>
                       <span className="w-1 h-1 rounded-full bg-white/10" />
                       <span className="text-[10px] font-black text-white/40 uppercase tracking-tighter">Intelligence:</span>
                       <span className="text-[12px] font-black text-accent italic uppercase tracking-tight">
                         {log.title.includes('Intelligence Acquired') ? `+${log.title.match(/\d+/)?.[0] || ''}` : log.title}
                       </span>
                    </div>
                    <span className="text-[9px] font-black text-white/20 tabular-nums uppercase">
                      {formatTimeAgo(log.timestamp)}
                    </span>
                  </div>
                  
                  {log.articles && log.articles.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-1.5">
                        {log.articles.slice(0, 3).map((art, i) => (
                          <div 
                            key={i} 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(art.url, '_blank');
                            }}
                            className="flex flex-col gap-0.5 border-l border-white/5 pl-3 py-0.5 cursor-pointer hover:border-accent/40 group/art transition-all"
                          >
                            <span className="text-[11px] font-bold text-white/70 line-clamp-1 leading-tight group-hover/art:text-white transition-colors">{art.title}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black text-accent/50 uppercase tracking-widest">{art.source}</span>
                              <span className="w-0.5 h-0.5 rounded-full bg-white/10" />
                              <span className="text-[8px] font-black text-white/20 uppercase tabular-nums">{formatTimeAgo(art.publishedAt)}</span>
                            </div>
                          </div>
                        ))}
                        {log.articles.length > 3 && (
                          <button 
                            onClick={() => setSelectedLog(log)}
                            className="text-[9px] font-black text-accent/60 hover:text-accent italic ml-3 transition-colors uppercase tracking-widest"
                          >
                            + {log.articles.length - 3} MORE ENTRIES • CLICK TO EXPAND
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Premium Bottom Navigation */}
      <motion.nav 
        initial={{ y: 0 }}
        animate={{ y: isNavVisible ? 0 : "100%" }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#050507]/90 backdrop-blur-3xl border-t border-white/10 pb-safe pb-3 sm:pb-4 pt-3 px-6 flex items-center justify-center"
      >
        <div className="flex items-center gap-10 sm:gap-20">
           <button 
             onClick={() => setActiveTab('home')}
             className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-accent scale-110 drop-shadow-[0_0_15px_rgba(129,76,255,0.8)]' : 'text-white/40 hover:text-white/70'}`}
           >
             <HomeIcon size={20} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
             <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
           </button>
           <button 
             onClick={() => setActiveTab('explore')}
             className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'explore' ? 'text-accent scale-110 drop-shadow-[0_0_15px_rgba(129,76,255,0.8)]' : 'text-white/40 hover:text-white/70'}`}
           >
             <Radio size={20} strokeWidth={activeTab === 'explore' ? 2.5 : 2} />
             <span className="text-[9px] font-black uppercase tracking-widest">Monitor</span>
           </button>
           <button 
             onClick={() => setActiveTab('account')}
             className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'account' ? 'text-accent scale-110 drop-shadow-[0_0_15px_rgba(129,76,255,0.8)]' : 'text-white/40 hover:text-white/70'}`}
           >
             <Terminal size={20} strokeWidth={activeTab === 'account' ? 2.5 : 2} />
             <span className="text-[9px] font-black uppercase tracking-widest">Logs</span>
           </button>
        </div>
      </motion.nav>

      {/* Modern tray Settings */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-end justify-center p-0"
            onClick={() => setShowSettings(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300, restDelta: 0.1, restSpeed: 0.1 }}
              style={{ willChange: 'transform' }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  setShowSettings(false);
                }
              }}
              className="bg-[#0a0a0c] w-full max-w-2xl rounded-t-[48px] border border-white/10 border-b-0 flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Draggable Handle and Header Area */}
              <div className="pt-4 sm:pt-6 pb-3 px-6 sm:px-8 flex-shrink-0 cursor-grab active:cursor-grabbing w-full flex flex-col gap-3 rounded-t-[48px]">
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto flex-shrink-0" />
                <div className="flex items-center justify-between flex-shrink-0">
                  <div className="flex flex-col cursor-default">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">System Config</h3>
                    <p className="text-xs text-white/30 hidden sm:block">Application control panel</p>
                  </div>
                  <button 
                    onClick={() => setShowSettings(false)} 
                    onPointerDownCapture={e => e.stopPropagation()} // Exclude from drag
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content Area (Excluded from Drag) */}
              <div 
                className="px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col sm:grid sm:grid-cols-2 gap-4 flex-1 max-h-[70vh] overflow-y-auto no-scrollbar"
                onPointerDownCapture={e => e.stopPropagation()}
              >
                {/* Column 1: Alerts & Sync */}
                <div className="flex flex-col gap-4">
                  <div className="card bg-white/5 border-white/5 p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-xl ${notificationsAllowed ? 'bg-accent/20 text-accent' : 'bg-white/5 text-muted'}`}>
                              {notificationsAllowed ? <Bell size={18} /> : <BellOff size={18} />}
                              </div>
                              <div className="flex flex-col">
                              <span className="font-black text-sm tracking-tight text-white/90">ALERTS</span>
                              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{notificationsAllowed ? 'Active' : 'Blocked'}</span>
                              </div>
                          </div>
                          {!notificationsAllowed ? (
                              <button onClick={requestNotificationPermission} className="text-accent text-[10px] font-black uppercase tracking-wider bg-accent/10 px-3 py-1.5 rounded-lg hover:bg-accent hover:text-white transition-all">Fix</button>
                          ) : (
                              <button onClick={testNotification} className="text-accent text-[10px] font-black uppercase tracking-wider bg-accent/10 px-3 py-1.5 rounded-lg hover:bg-accent hover:text-white transition-all">Test</button>
                          )}
                      </div>
                  </div>

                  <div className="card bg-white/5 border-white/5 p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl transition-colors ${isGlobalSyncEnabled ? 'bg-accent/20 text-accent' : 'bg-white/5 text-white/20'}`}>
                          <Volume2 size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-sm tracking-tight text-white/90">PIPELINE SYNC</span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${isGlobalSyncEnabled ? 'text-accent' : 'text-white/20'}`}>
                             {isGlobalSyncEnabled ? (isScanning ? 'Synchronizing Intelligence...' : 'Active') : 'Standby'}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleGlobalSync(!isGlobalSyncEnabled)}
                        className={`w-12 h-7 rounded-full relative transition-all duration-300 ${isGlobalSyncEnabled ? 'bg-accent/40 border-accent/20' : 'bg-white/5 border-white/5'} border`}
                      >
                         <motion.div 
                           animate={{ x: isGlobalSyncEnabled ? 22 : 4 }}
                           className={`absolute top-1 w-4 h-4 rounded-full shadow-lg ${isGlobalSyncEnabled ? 'bg-white' : 'bg-white/20'}`} 
                         />
                      </button>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full relative overflow-hidden">
                      <motion.div 
                        initial={false}
                        animate={{ 
                          x: isScanning ? ["-100%", "100%"] : "-100%"
                        }}
                        transition={isScanning ? { 
                          duration: 1.5, 
                          repeat: Infinity,
                          ease: "linear" 
                        } : { duration: 0.5 }}
                        className="h-full w-1/2 bg-accent rounded-full shadow-[0_0_10px_var(--accent)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Column 2: Bulk Actions (Moved inside a single card) */}
                <div className="card bg-white/5 border-white/5 p-3 flex flex-col justify-between gap-3">
                  <div className="flex flex-col gap-1">
                      <span className="font-black text-sm tracking-tight text-white/90">BULK ACTIONS</span>
                      <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Global Automation</span>
                  </div>
                  <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => toggleAllNotifications(true)}
                        className="w-full bg-accent/10 border border-accent/20 text-accent text-xs font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-accent hover:text-white transition-all uppercase tracking-widest"
                      >
                         <Bell size={14} /> Enable All
                      </button>
                      <button 
                         onClick={() => toggleAllNotifications(false)}
                         className="w-full bg-white/5 border border-white/10 text-white/50 text-xs font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-error/20 hover:text-error transition-all uppercase tracking-widest"
                      >
                         <BellOff size={14} /> Silence All
                      </button>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 flex-shrink-0">
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="button-primary py-3 text-sm font-black uppercase italic tracking-tighter w-full"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Premium Delete Confirmation Modal */}
      <AnimatePresence>
        {groupToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="card max-w-[400px] w-full bg-gradient-to-br from-[#1a1b26] to-[#0a0b12] border-error/20 p-8 flex flex-col gap-6"
            >
              <div className="w-20 h-20 rounded-[32px] bg-error/10 flex items-center justify-center border border-error/20 mx-auto">
                <Trash2 size={40} className="text-error" />
              </div>
              
              <div className="flex flex-col gap-2 text-center">
                <h3 className="text-xl font-black uppercase italic tracking-tighter">Destroy Channel?</h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  Are you sure you want to delete <span className="text-white font-bold break-all">"{groups.find(g => g.id === groupToDelete)?.name}"</span>? This action is irreversible.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <button 
                  onClick={() => setGroupToDelete(null)}
                  className="py-4 rounded-2xl bg-white/5 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteGroup}
                  className="py-4 rounded-2xl bg-error text-white text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-error/20"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Premium Keyword Delete Confirmation Modal */}
      <AnimatePresence>
        {keywordToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="card max-w-[400px] w-full bg-gradient-to-br from-[#1a1b26] to-[#0a0b12] border-accent/20 p-8 flex flex-col gap-6"
            >
              <div className="w-20 h-20 rounded-[32px] bg-accent/10 flex items-center justify-center border border-accent/20 mx-auto">
                <Settings size={40} className="text-accent" />
              </div>
              
              <div className="flex flex-col gap-2 text-center">
                <h3 className="text-xl font-black uppercase italic tracking-tighter">Destroy Keyword?</h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  Are you sure you want to remove <span className="text-white font-bold break-all">"{keywordToDelete.word.toUpperCase()}"</span>? This target will no longer be tracked.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmRemoveKeyword}
                  className="w-full bg-error text-white font-black py-4 rounded-xl hover:bg-error/80 transition-all uppercase tracking-widest text-xs"
                >
                  Confirm Destroy
                </button>
                <button 
                  onClick={() => setKeywordToDelete(null)}
                  className="w-full bg-white/5 text-white/40 font-black py-4 rounded-xl hover:bg-white/10 transition-all uppercase tracking-widest text-xs"
                >
                  Abort
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Rename Modal */}
      <AnimatePresence>
        {isRenamingGroupId !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="card max-w-[400px] w-full bg-gradient-to-br from-[#1a1b26] to-[#0a0b12] border-accent/20 p-8 flex flex-col gap-6 shadow-[0_0_50px_rgba(168,85,247,0.1)]"
            >
               <div className="w-20 h-20 rounded-[32px] bg-accent/10 flex items-center justify-center border border-accent/20 mx-auto">
                <Edit2 size={40} className="text-accent" />
              </div>
              <div className="flex flex-col gap-2 text-center">
                <h3 className="text-xl font-black uppercase italic tracking-tighter">Rename Channel</h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  Update the intelligence identifier for this monitoring pipeline.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <input 
                  autoFocus
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename(isRenamingGroupId);
                    if (e.key === 'Escape') setIsRenamingGroupId(null);
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-accent transition-all shadow-inner"
                  placeholder="Encryption handle..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <button 
                  onClick={() => setIsRenamingGroupId(null)}
                  className="py-4 rounded-2xl bg-white/5 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                >
                  Abort
                </button>
                <button 
                  onClick={() => saveRename(isRenamingGroupId)}
                  className="py-4 rounded-2xl bg-accent text-white text-xs font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-accent/20 transition-all"
                >
                  Confirm Rename
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logs Clear Confirmation Modal */}
      <AnimatePresence>
        {showClearLogsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="card max-w-[400px] w-full bg-[#0a0b12] border-error/20 p-8 flex flex-col gap-6 shadow-[0_0_50px_rgba(255,51,51,0.1)]"
            >
               <div className="w-20 h-20 rounded-[32px] bg-error/10 flex items-center justify-center border border-error/20 mx-auto">
                <Trash2 size={40} className="text-error" />
              </div>
              <div className="flex flex-col gap-2 text-center">
                <h3 className="text-xl font-black uppercase italic tracking-tighter">Clear All Logs?</h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  This will permanently erase your entire intelligence notification history from memory.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <button 
                  onClick={() => setShowClearLogsModal(false)}
                  className="py-4 rounded-2xl bg-white/5 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => { 
                    try {
                      await fetch('/api/logs', { method: 'DELETE' });
                      setHistoryLogs([]); 
                    } catch (e) {
                      console.error("Failed to clear cloud logs", e);
                    }
                    setShowClearLogsModal(false); 
                  }}
                  className="py-4 rounded-2xl bg-error text-white text-xs font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-error/20 transition-all"
                >
                  Confirm Clear
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Toast Notification System */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 z-[250] px-6 py-3 rounded-full shadow-2xl border backdrop-blur-xl flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-accent/20 border-accent/40 text-accent' : 
              toast.type === 'error' ? 'bg-error/20 border-error/40 text-error' : 
              'bg-white/10 border-white/20 text-white'
            }`}
          >
            <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Log Article Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-10"
             onClick={() => setSelectedLog(null)}
          >
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="bg-[#0a0a0c] w-full max-w-2xl max-h-[80vh] rounded-[48px] border border-white/10 flex flex-col shadow-2xl overflow-hidden"
               onClick={e => e.stopPropagation()}
             >
                <div className="p-8 pb-4 flex items-center justify-between border-b border-white/5">
                   <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black text-accent border border-accent/20 bg-accent/5 px-3 py-1 rounded-lg uppercase tracking-[.2em]">{selectedLog.channel}</span>
                         <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{formatTimeAgo(selectedLog.timestamp)}</span>
                      </div>
                      <h3 className="text-lg font-black italic uppercase tracking-tighter mt-1">
                        {selectedLog.title.includes('Intelligence Acquired') ? `+${selectedLog.title.match(/\d+/)?.[0] || ''}` : selectedLog.title} ARTICLES RECOVERED
                      </h3>
                   </div>
                   <button 
                     onClick={() => setSelectedLog(null)}
                     className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/5"
                   >
                     <X size={20} />
                   </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col gap-3 no-scrollbar">
                   {selectedLog.articles?.map((article, i) => (
                      <motion.div 
                         initial={{ opacity: 0, x: -10 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ delay: i * 0.05 }}
                         key={article.id}
                         className="flex flex-col gap-1.5 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-accent/40 hover:bg-accent/5 transition-all group/art cursor-pointer"
                         onClick={() => window.open(article.url, '_blank')}
                      >
                         <div className="flex items-center gap-3 text-[9px] font-black text-accent/60 uppercase tracking-widest">
                            <span>{article.source}</span>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-white/20">{formatTimeAgo(article.publishedAt)}</span>
                         </div>
                         <h4 className="text-[13px] font-bold text-white group-hover/art:text-white leading-snug transition-colors">{article.title}</h4>
                      </motion.div>
                   ))}
                </div>
                
                <div className="p-8 pt-0 mt-4 h-2 bg-gradient-to-t from-[#0a0a0c] to-transparent pointer-events-none" />
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
