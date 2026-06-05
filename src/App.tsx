/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Layers, 
  Users, 
  FileText, 
  Sparkles, 
  Bell, 
  CalendarDays, 
  HelpCircle,
  TrendingUp,
  Mail,
  Receipt,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  Link2,
  GitBranch,
  Key,
  RefreshCw
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

// Imports types and components
import { Task, Member, Invoice, SystemRole, RolePermissions, AppNotification } from './types';
import { INITIAL_MEMBERS, INITIAL_TASKS, INITIAL_INVOICES } from './data/mockData';
import Dashboard from './components/Dashboard';
import TaskManager from './components/TaskManager';
// Removed BillingTracker import
import TeamPerformance from './components/TeamPerformance';
import PermissionsManager from './components/PermissionsManager';
import InternalAdminLinks from './components/InternalAdminLinks';

const DEFAULT_ROLE_PERMISSIONS: Record<SystemRole, RolePermissions> = {
  Admin: {
    tasks_create: true,
    tasks_edit_all: true,
    tasks_delete: true,
    billing_view: true,
    billing_create: true,
    billing_status_update: true,
    billing_delete: true,
    team_add_member: true,
    roles_manage: true
  },
  Manager: {
    tasks_create: true,
    tasks_edit_all: true,
    tasks_delete: false,
    billing_view: true,
    billing_create: true,
    billing_status_update: true,
    billing_delete: false,
    team_add_member: true,
    roles_manage: false
  },
  Member: {
    tasks_create: false,
    tasks_edit_all: false,
    tasks_delete: false,
    billing_view: false,
    billing_create: false,
    billing_status_update: false,
    billing_delete: false,
    team_add_member: false,
    roles_manage: false
  }
};

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    memberId: 'm1', // Nguyễn Văn Hải (Admin)
    title: '📢 Chào mừng bạn đến với MKT Portal',
    message: 'Hệ thống Quản lý Vận hành Marketing đã sẵn sàng phục vụ. Bạn đang hoạt động với vai trò Admin kiểm soát vị trí rộng rãi.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4h ago
    isRead: false
  },
  {
    id: 'notif-2',
    memberId: 'm2', // Trần Thị Mai (Manager)
    title: '📬 Công việc mới trong phòng ban',
    message: 'Nguyễn Văn Hải đã giao công việc "Viết bộ bài đăng 10 bài Facebook mở màn" cho bạn thuộc phòng Content.',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    isRead: true
  },
  {
    id: 'notif-3',
    memberId: 'm3', // Phạm Minh Đức (Member)
    title: '📬 Bạn được giao công việc mới',
    message: 'Trần Thị Mai đã giao công việc "Thi công ấn phẩm Banner Carousel tuyển dụng" cho bạn. Phòng ban: Design.',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1h ago
    isRead: false
  }
];

export default function App() {
  const [appTime, setAppTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setAppTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const cached = localStorage.getItem('mkt_dark_mode');
    if (cached) {
      return cached === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mkt_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mkt_dark_mode', 'false');
    }
  }, [isDarkMode]);

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>(() => {
    const cached = localStorage.getItem('mkt_members');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list = parsed.map((m: any) => {
            if (m.id === 'm1' && m.email && m.email.endsWith('@gmail.co')) {
              return { ...m, email: 'dungngocpham8386@gmail.com', password: m.password || '123' };
            }
            return m.password ? m : { ...m, password: '123' };
          }).filter((m: any) => m.email && m.email.toLowerCase().trim().endsWith('@gmail.com'));
          // Auto-merge all predefined accounts from INITIAL_MEMBERS if they are missing from list
          INITIAL_MEMBERS.forEach((initMem) => {
            if (!list.some((m: any) => m.email.toLowerCase().trim() === initMem.email.toLowerCase().trim())) {
              list.push(initMem);
            }
          });
          return list;
        }
      } catch (e) {
        console.error("Error loading cached members synchronously:", e);
      }
    }
    return INITIAL_MEMBERS;
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  const [dailyChecklists, setDailyChecklists] = useState<Record<string, { id: string; text: string; completed: boolean }[]>>(() => {
    try {
      const saved = localStorage.getItem('mkt_daily_checklists');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  // Synchronization with Express full-stack backend server
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastLocalWrite, setLastLocalWrite] = useState<number>(0);

  const isSyncingActiveRef = React.useRef(false);
  const lastLocalWriteRef = React.useRef(0);
  const syncRequestIdRef = React.useRef(0);
  const lastSuccessPushTimeRef = React.useRef(0);

  useEffect(() => {
    lastLocalWriteRef.current = lastLocalWrite;
  }, [lastLocalWrite]);

  const saveDailyChecklists = (newChecklists: Record<string, { id: string; text: string; completed: boolean }[]>) => {
    setLastLocalWrite(Date.now());
    setDailyChecklists(newChecklists);
    localStorage.setItem('mkt_daily_checklists', JSON.stringify(newChecklists));
    syncWithServer({ dailyChecklists: newChecklists });
  };

  // Sync state function can represent either a full push/pull or differential merge
  const syncWithServer = async (clientDataToPush?: {
    members?: Member[];
    tasks?: Task[];
    invoices?: Invoice[];
    divisions?: string[];
    notifications?: AppNotification[];
    dailyChecklists?: Record<string, { id: string; text: string; completed: boolean }[]>;
  }) => {
    // Prevent overlapping background sync (get) requests
    if (isSyncingActiveRef.current && !clientDataToPush) {
      return;
    }

    // Keep track of request order sequence to avoid stale overrides
    syncRequestIdRef.current += 1;
    const currentId = syncRequestIdRef.current;

    isSyncingActiveRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    // Secure helper to safely parse any potentially corrupted localStorage values
    const safeParse = (key: string, fallback: any) => {
      try {
        const val = localStorage.getItem(key);
        if (!val || val === 'undefined' || val === 'null' || val === '[object Object]') return fallback;
        return JSON.parse(val);
      } catch (e) {
        return fallback;
      }
    };

    try {
      if (clientDataToPush) {
        // Push client changes to server
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(clientDataToPush)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            // Discard response if a newer request has already updated the sequence
            if (syncRequestIdRef.current !== currentId) {
              return;
            }

            lastSuccessPushTimeRef.current = Date.now();

            // Instantly update local React and disk storage state with server-authoritative reply
            if (data.members && data.members.length > 0) {
              setMembers(data.members);
              localStorage.setItem('mkt_members', JSON.stringify(data.members));
            }
            if (data.tasks) {
              setTasks(data.tasks);
              localStorage.setItem('mkt_tasks', JSON.stringify(data.tasks));
            }
            if (data.invoices) {
              setInvoices(data.invoices);
              localStorage.setItem('mkt_invoices', JSON.stringify(data.invoices));
            }
            if (data.divisions) {
              setDivisions(data.divisions);
              localStorage.setItem('mkt_divisions', JSON.stringify(data.divisions));
            }
            if (data.notifications) {
              setNotifications(data.notifications);
              localStorage.setItem('mkt_notifications', JSON.stringify(data.notifications));
            }
            if (data.dailyChecklists) {
              setDailyChecklists(data.dailyChecklists);
              localStorage.setItem('mkt_daily_checklists', JSON.stringify(data.dailyChecklists));
            }

            // Sync current user context safely
            const savedUserStr = localStorage.getItem('mkt_current_user');
            if (savedUserStr && savedUserStr !== 'undefined' && data.members) {
              try {
                const savedUserSnapshot = JSON.parse(savedUserStr);
                const freshUser = data.members.find((m: any) => m.id === savedUserSnapshot.id);
                if (freshUser) {
                  setCurrentUser(freshUser);
                  localStorage.setItem('mkt_current_user', JSON.stringify(freshUser));
                }
              } catch (e) {}
            } else if (data.members && data.members.length > 0) {
              // Fail-safe initialization
              try {
                const savedUserSnapshot = JSON.parse(savedUserStr || '{}');
                const freshUser = data.members.find((m: any) => m.id === savedUserSnapshot.id) || data.members[0];
                setCurrentUser(freshUser);
                localStorage.setItem('mkt_current_user', JSON.stringify(freshUser));
              } catch (e) {
                setCurrentUser(data.members[0]);
                localStorage.setItem('mkt_current_user', JSON.stringify(data.members[0]));
              }
            }

            setLastSyncTime(new Date());
          }
        } else {
          throw new Error("HTTP " + res.status);
        }
      } else {
        // Fetch from server database
        // Prevent background overwrite if user recently engaged in local edits to avoid flickering / state overrides
        if (Date.now() - lastLocalWriteRef.current < 4000 || Date.now() - lastSuccessPushTimeRef.current < 4000) {
          isSyncingActiveRef.current = false;
          setIsSyncing(false);
          return;
        }

        const res = await fetch('/api/sync');
        if (res.ok) {
          // Double check before parsing
          if (syncRequestIdRef.current !== currentId || Date.now() - lastLocalWriteRef.current < 4000) {
            return;
          }

          const data = await res.json();

          // Double check after fetch completes to avoid race conditions overriding fresh edits
          if (syncRequestIdRef.current !== currentId || Date.now() - lastLocalWriteRef.current < 4000) {
            return;
          }

          if (data.success && data.members && data.members.length > 0) {
            // Load and merge with local state
            setMembers(data.members);
            localStorage.setItem('mkt_members', JSON.stringify(data.members));
            
            if (data.tasks) {
              setTasks(data.tasks);
              localStorage.setItem('mkt_tasks', JSON.stringify(data.tasks));
            }
            if (data.invoices) {
              setInvoices(data.invoices);
              localStorage.setItem('mkt_invoices', JSON.stringify(data.invoices));
            }
            if (data.divisions) {
              setDivisions(data.divisions);
              localStorage.setItem('mkt_divisions', JSON.stringify(data.divisions));
            }
            if (data.notifications) {
              setNotifications(data.notifications);
              localStorage.setItem('mkt_notifications', JSON.stringify(data.notifications));
            }
            if (data.dailyChecklists) {
              setDailyChecklists(data.dailyChecklists);
              localStorage.setItem('mkt_daily_checklists', JSON.stringify(data.dailyChecklists));
            }
            
            // Sync current user context
            const savedUserStr = localStorage.getItem('mkt_current_user');
            if (savedUserStr && savedUserStr !== 'undefined') {
              try {
                const savedUserSnapshot = JSON.parse(savedUserStr);
                const freshUser = data.members.find((m: any) => m.id === savedUserSnapshot.id);
                if (freshUser) {
                  setCurrentUser(freshUser);
                  localStorage.setItem('mkt_current_user', JSON.stringify(freshUser));
                }
              } catch (e) {}
            } else if (data.members.length > 0) {
              setCurrentUser(data.members[0]);
              localStorage.setItem('mkt_current_user', JSON.stringify(data.members[0]));
            }
            setLastSyncTime(new Date());
          } else {
            // Server database has no records yet!
            // Push our complete state to populate the server database
            const locMembers = safeParse('mkt_members', []);
            const locTasks = safeParse('mkt_tasks', []);
            const locInvoices = safeParse('mkt_invoices', []);
            const locDivisions = safeParse('mkt_divisions', []);
            const locNotifications = safeParse('mkt_notifications', []);
            const locDailyChecklists = safeParse('mkt_daily_checklists', {});
            
            const payload = {
              members: locMembers.length > 0 ? locMembers : INITIAL_MEMBERS,
              tasks: locTasks.length > 0 ? locTasks : INITIAL_TASKS,
              invoices: locInvoices.length > 0 ? locInvoices : INITIAL_INVOICES,
              divisions: locDivisions.length > 0 ? locDivisions : ['Content', 'Design', 'Digital Ads', 'Event & PR'],
              notifications: locNotifications.length > 0 ? locNotifications : [],
              dailyChecklists: locDailyChecklists
            };
            
            await fetch('/api/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });
            setLastSyncTime(new Date());
          }
        } else {
          throw new Error("HTTP " + res.status);
        }
      }
    } catch (err: any) {
      console.error("Sync error:", err);
      setSyncError("Lỗi kết nối bộ đồng bộ đám mây.");
    } finally {
      if (syncRequestIdRef.current === currentId) {
        isSyncingActiveRef.current = false;
        setIsSyncing(false);
      }
    }
  };
  
  // Authentication configuration and session login states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const cached = localStorage.getItem('mkt_is_authenticated');
    if (cached === null) {
      localStorage.setItem('mkt_is_authenticated', 'false');
      return false;
    }
    return cached === 'true';
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // RBAC System States
  const [currentUser, setCurrentUser] = useState<Member>(() => {
    const cachedMembers = localStorage.getItem('mkt_members');
    let useMembers = INITIAL_MEMBERS;
    if (cachedMembers) {
      try {
        const parsed = JSON.parse(cachedMembers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          useMembers = parsed.map((m: any) => {
            if (m.id === 'm1' && m.email && m.email.endsWith('@gmail.co')) {
              return { ...m, email: 'dungngocpham8386@gmail.com', password: m.password || '123' };
            }
            return m.password ? m : { ...m, password: '123' };
          }).filter((m: any) => m.email && m.email.toLowerCase().trim().endsWith('@gmail.com'));
          // Auto-merge all predefined accounts from INITIAL_MEMBERS if they are missing from list
          INITIAL_MEMBERS.forEach((initMem) => {
            if (!useMembers.some((m: any) => m.email.toLowerCase().trim() === initMem.email.toLowerCase().trim())) {
              useMembers.push(initMem);
            }
          });
        }
      } catch (e) {}
    }

    const cached = localStorage.getItem('mkt_current_user');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.systemRole) {
          const freshUser = useMembers.find((m: any) => m.id === parsed.id);
          if (freshUser) return freshUser;
          if (parsed.id === 'm1' && parsed.email && parsed.email.endsWith('@gmail.co')) {
            return { ...parsed, email: 'dungngocpham8386@gmail.com' };
          }
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing cached user:", e);
      }
    }
    return useMembers.find((m: any) => m.systemRole === 'Admin') || useMembers[0];
  });

  const [rolePermissions, setRolePermissions] = useState<Record<SystemRole, RolePermissions>>(() => {
    const cached = localStorage.getItem('mkt_role_permissions');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Deep merge with DEFAULT_ROLE_PERMISSIONS to ensure all fields/new keys exist
        const merged = { ...DEFAULT_ROLE_PERMISSIONS };
        (Object.keys(DEFAULT_ROLE_PERMISSIONS) as SystemRole[]).forEach(role => {
          merged[role] = {
            ...DEFAULT_ROLE_PERMISSIONS[role],
            ...(parsed[role] || {})
          };
        });
        return merged;
      } catch (e) {
        console.error("Error parsing cached permissions:", e);
      }
    }
    return DEFAULT_ROLE_PERMISSIONS;
  });

  const activePermissions = (currentUser && currentUser.systemRole && rolePermissions[currentUser.systemRole])
    ? rolePermissions[currentUser.systemRole]
    : (DEFAULT_ROLE_PERMISSIONS[currentUser?.systemRole] || DEFAULT_ROLE_PERMISSIONS.Member);

  const [divisions, setDivisions] = useState<string[]>(() => {
    const cached = localStorage.getItem('mkt_divisions');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Error parsing divisions:", e);
      }
    }
    return ['Content', 'Design', 'Digital Ads', 'Event & PR'];
  });

  const saveDivisions = (newDivs: string[]) => {
    setLastLocalWrite(Date.now());
    setDivisions(newDivs);
    localStorage.setItem('mkt_divisions', JSON.stringify(newDivs));
    syncWithServer({ divisions: newDivs });
  };

  const handleAddDivision = (newDiv: string) => {
    if (!newDiv || newDiv.trim() === '') return;
    const trimmed = newDiv.trim();
    if (divisions.map(d => d.toLowerCase()).includes(trimmed.toLowerCase())) {
      triggerNotification(`Phân ban "${trimmed}" đã tồn tại!`);
      return;
    }
    const updated = [...divisions, trimmed];
    saveDivisions(updated);
    triggerNotification(`Đã tạo phân ban thành công: "${trimmed}"`);
  };

  const handleDeleteDivision = (divToDelete: string) => {
    const updated = divisions.filter(d => d !== divToDelete);
    saveDivisions(updated);
    triggerNotification(`Đã xóa phân ban: "${divToDelete}"`);
  };

  const handleClearAllDivisions = () => {
    saveDivisions([]);
    triggerNotification(`Đã xóa tất cả phân ban thành công!`);
  };

  // Initialize data from localStorage with reliable fallback to populated mockData
  useEffect(() => {
    const cachedMembers = localStorage.getItem('mkt_members');
    const cachedTasks = localStorage.getItem('mkt_tasks');
    const cachedInvoices = localStorage.getItem('mkt_invoices');

    let finalMembers = INITIAL_MEMBERS;
    let loadedFromCache = false;

    if (cachedMembers) {
      try {
        const parsed: Member[] = JSON.parse(cachedMembers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const migrated = parsed.map(m => {
            if (m.id === 'm1' && m.email && m.email.endsWith('@gmail.co')) {
              return { ...m, email: 'dungngocpham8386@gmail.com', password: m.password || '123' };
            }
            return m.password ? m : { ...m, password: '123' };
          }).filter(m => m.email && m.email.toLowerCase().trim().endsWith('@gmail.com'));
          // Auto-merge all predefined accounts from INITIAL_MEMBERS if they are missing from list
          INITIAL_MEMBERS.forEach((initMem) => {
            if (!migrated.some(m => m.email.toLowerCase().trim() === initMem.email.toLowerCase().trim())) {
              migrated.push(initMem);
            }
          });
          setMembers(migrated);
          finalMembers = migrated;
          loadedFromCache = true;
        }
      } catch (e) {
        console.error("Error loading cached members:", e);
      }
    }

    if (!loadedFromCache) {
      setMembers(INITIAL_MEMBERS);
      localStorage.setItem('mkt_members', JSON.stringify(INITIAL_MEMBERS));
      localStorage.setItem('mkt_current_user', JSON.stringify(INITIAL_MEMBERS[0]));
      setCurrentUser(INITIAL_MEMBERS[0]);
      setIsAuthenticated(false);
      localStorage.setItem('mkt_is_authenticated', 'false');
      finalMembers = INITIAL_MEMBERS;
    }

    // Đồng bộ hóa trạng thái tài khoản đăng nhập (currentUser) để luôn khớp với danh sách thành viên sau khi chỉnh sửa
    const savedUserStr = localStorage.getItem('mkt_current_user');
    if (savedUserStr) {
      try {
        const savedUserSnapshot = JSON.parse(savedUserStr) as Member;
        const freshUser = finalMembers.find(m => m.id === savedUserSnapshot.id);
        if (freshUser) {
          setCurrentUser(freshUser);
          localStorage.setItem('mkt_current_user', JSON.stringify(freshUser));
        }
      } catch (err) {
        console.error("Error synchronizing current user with latest member list:", err);
      }
    }

    if (!loadedFromCache || !cachedTasks) {
      // For demonstration, let's set t3 deadline to tomorrow (within 24 hours of today)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowYmd = tomorrow.toISOString().split('T')[0];
      const modifiedTasks = INITIAL_TASKS.map(t => {
        if (t.id === 't3') {
          return { ...t, deadline: tomorrowYmd, status: 'InProgress' as const };
        }
        return t;
      });
      setTasks(modifiedTasks);
      localStorage.setItem('mkt_tasks', JSON.stringify(modifiedTasks));
    } else {
      setTasks(JSON.parse(cachedTasks));
    }

    if (cachedInvoices) {
      setInvoices(JSON.parse(cachedInvoices));
    } else {
      setInvoices(INITIAL_INVOICES);
      localStorage.setItem('mkt_invoices', JSON.stringify(INITIAL_INVOICES));
    }

    const cachedNotifications = localStorage.getItem('mkt_notifications');
    if (cachedNotifications) {
      setNotifications(JSON.parse(cachedNotifications));
    } else {
      setNotifications(INITIAL_NOTIFICATIONS);
      localStorage.setItem('mkt_notifications', JSON.stringify(INITIAL_NOTIFICATIONS));
    }
  }, []);

  // Poll server for periodic synchronization updates (multi-user real-time sync)
  useEffect(() => {
    syncWithServer(); // Pull instantly on mount
    const interval = setInterval(() => {
      if (!document.hidden && !isSyncingActiveRef.current) {
        syncWithServer();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Tự động đồng bộ hóa thông tin tài khoản đăng nhập (currentUser) bất cứ khi nào danh sách thành viên (members) có thay đổi thông tin
  useEffect(() => {
    if (members && members.length > 0 && currentUser) {
      const freshUser = members.find(m => m.id === currentUser.id);
      if (freshUser) {
        if (JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
          setCurrentUser(freshUser);
          localStorage.setItem('mkt_current_user', JSON.stringify(freshUser));
        }
      }
    }
  }, [members, currentUser]);

  // Tự động kiểm tra hạn chót (Deadline Check Engine) và đồng bộ hóa trạng thái khi chỉnh sửa thủ công
  useEffect(() => {
    if (tasks.length === 0 || members.length === 0) return;

    const notifiedKey = 'mkt_notified_deadline_24h';
    const notifiedIds: string[] = (() => {
      try {
        return JSON.parse(localStorage.getItem(notifiedKey) || '[]');
      } catch {
        return [];
      }
    })();

    const now = new Date();

    // 1. Đồng bộ và làm sạch danh sách đã thông báo (notifiedIds):
    // Giữ lại các ID thông báo thỏa mãn: tác vụ vẫn tồn tại, chưa hoàn thành, đúng thời hạn cũ, và thời hạn vẫn nằm trong vòng 24 giờ tới.
    // Điều này cho phép hệ thống tự động tái thông báo nếu người dùng sửa ngày hạn về phạm vi 24h của tác vụ khác, hoặc kéo lùi lại.
    const cleanedNotifiedIds = notifiedIds.filter(notifId => {
      const parts = notifId.split('-');
      const taskId = parts[0];
      const deadlineStr = parts.slice(1).join('-'); // định dạng ngày đầy đủ
      const task = tasks.find(t => t.id === taskId);
      
      if (!task || task.status === 'Completed') return false;
      // Nếu thời hạn đã được chỉnh sửa thủ công khác với chuỗi đã lưu thì ID thông báo đó đã lỗi thời
      if (task.deadline !== deadlineStr) return false;
      
      const deadlineDate = new Date(task.deadline);
      if (isNaN(deadlineDate.getTime())) return false;
      deadlineDate.setHours(23, 59, 59, 999);
      
      const diffTime = deadlineDate.getTime() - now.getTime();
      const oneDayInMs = 24 * 60 * 60 * 1000;
      return diffTime > 0 && diffTime <= oneDayInMs;
    });

    let hasLocalChanges = cleanedNotifiedIds.length !== notifiedIds.length;
    const activeNotifiedIds = [...cleanedNotifiedIds];

    const newNotifications: AppNotification[] = [];
    let hasAlertedNew = false;

    // 2. Kiểm tra và thêm thông báo mới cho các công việc sắp hết hạn trong 24 giờ
    tasks.forEach(task => {
      if (task.status === 'Completed') return;
      
      const deadlineDate = new Date(task.deadline);
      if (isNaN(deadlineDate.getTime())) return;
      
      // Đặt mốc thời gian cuối ngày của deadline
      deadlineDate.setHours(23, 59, 59, 999);
      
      const diffTime = deadlineDate.getTime() - now.getTime();
      const oneDayInMs = 24 * 60 * 60 * 1000;
      
      // Sắp hết hạn trong 24h và chưa quá hạn
      if (diffTime > 0 && diffTime <= oneDayInMs) {
        // ID thông báo phân định duy nhất theo ID task và thời hạn
        const notificationUniqueId = `${task.id}-${task.deadline}`;
        
        if (!activeNotifiedIds.includes(notificationUniqueId)) {
          activeNotifiedIds.push(notificationUniqueId);
          hasLocalChanges = true;
          hasAlertedNew = true;

          // Tìm thành viên phụ trách
          const assignee = members.find(m => m.id === task.assigneeId);
          const assigneeName = assignee ? assignee.name : 'Chưa phân công';

          // Gửi thông báo cho mọi thành viên cùng phòng ban (division) hoặc người phụ trách chính
          members.forEach(m => {
            if (m.id === task.assigneeId || m.division === task.division) {
              const isDirectAssignee = m.id === task.assigneeId;
              const notifTitle = isDirectAssignee 
                ? '⚠️ Hạn chót công việc cận kề (24h)' 
                : '📢 Công việc của phòng sắp hết hạn';
              
              const notifMsg = isDirectAssignee
                ? `Công việc được giao cho bạn "${task.title}" sắp hết hạn lúc ${task.deadline} (Trong vòng 24 giờ tới). Vui lòng hoàn thành!`
                : `Công việc "${task.title}" do ${assigneeName} phụ trách trong phòng ban của bạn sắp hết hạn lúc ${task.deadline}.`;

              newNotifications.push({
                id: `notif-deadline-${Date.now()}-${m.id}-${task.id}`,
                memberId: m.id,
                title: notifTitle,
                message: notifMsg,
                createdAt: new Date().toISOString(),
                isRead: false,
                taskId: task.id,
                senderName: 'Hệ thống MKT Portal'
              });
            }
          });
        }
      }
    });

    if (hasLocalChanges) {
      localStorage.setItem(notifiedKey, JSON.stringify(activeNotifiedIds));
    }

    // 3. Tự động thu hồi/dọn dẹp các thông báo cũ bị treo của các công việc đã hoàn thành, bị xóa hoặc được dời hạn chót ra xa
    const currentNotifications: AppNotification[] = (() => {
      try {
        const cached = localStorage.getItem('mkt_notifications');
        return cached ? JSON.parse(cached) : notifications;
      } catch {
        return notifications;
      }
    })();

    const cleanExistingNotifs = currentNotifications.filter(notif => {
      // Xác định đây có phải thông báo về hạn chót 24h
      const isDeadlineNotif = notif.id.startsWith('notif-deadline-') || !!notif.taskId;
      if (!isDeadlineNotif) return true;

      // Lấy taskId
      const tId = notif.taskId || notif.id.split('-').pop();
      const associatedTask = tasks.find(t => t.id === tId);
      
      // Nếu công việc đã bị xóa hoặc đã chuyển sang trạng thái Hoàn thành -> Loại bỏ thông báo hết hạn
      if (!associatedTask || associatedTask.status === 'Completed') return false;

      // Nếu công việc đã được dời hạn chót ra ngoài vòng 24h -> Loại bỏ thông báo hết hạn cho bớt phiền phức
      const dDate = new Date(associatedTask.deadline);
      if (isNaN(dDate.getTime())) return false;
      dDate.setHours(23, 59, 59, 999);
      
      const diff = dDate.getTime() - now.getTime();
      const oneDayInMs = 24 * 60 * 60 * 1000;
      const isCậnKề = diff > 0 && diff <= oneDayInMs;
      
      return isCậnKề;
    });

    const isNotifListPruned = cleanExistingNotifs.length !== currentNotifications.length;

    if (newNotifications.length > 0 || isNotifListPruned) {
      const merged = [...newNotifications, ...cleanExistingNotifs];
      setNotifications(merged);
      localStorage.setItem('mkt_notifications', JSON.stringify(merged));
      
      if (hasAlertedNew && newNotifications.length > 0) {
        triggerNotification(`🚨 Có công việc sắp hết hạn trong 24 giờ tới! Đã gửi thông báo đến các thành viên liên quan.`);
      } else if (isNotifListPruned) {
        triggerNotification(`⚖️ Hệ thống đã tự động gỡ bỏ/đồng bộ thông báo của các công việc đã hoàn thành hoặc dời hạn chót.`);
      }
    }
  }, [tasks, members]);

  // Save changes to localStorage on any state modification
  const saveNotifications = (newNotifs: AppNotification[]) => {
    setLastLocalWrite(Date.now());
    setNotifications(newNotifs);
    localStorage.setItem('mkt_notifications', JSON.stringify(newNotifs));
    syncWithServer({ notifications: newNotifs });
  };

  const saveTasks = (newTasks: Task[]) => {
    setLastLocalWrite(Date.now());
    setTasks(newTasks);
    localStorage.setItem('mkt_tasks', JSON.stringify(newTasks));
    syncWithServer({ tasks: newTasks });
  };

  const saveMembers = (newMembers: Member[]) => {
    setLastLocalWrite(Date.now());
    setMembers(newMembers);
    localStorage.setItem('mkt_members', JSON.stringify(newMembers));
    syncWithServer({ members: newMembers });
  };

  const saveInvoices = (newInvoices: Invoice[]) => {
    setLastLocalWrite(Date.now());
    setInvoices(newInvoices);
    localStorage.setItem('mkt_invoices', JSON.stringify(newInvoices));
    syncWithServer({ invoices: newInvoices });
  };

  // Notification utility
  const triggerNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // --- Task Operations ---
  const handleAddTask = (newTaskFields: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...newTaskFields,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: newTaskFields.createdBy || currentUser.id
    };
    const updated = [newTask, ...tasks];
    
    const isSelfCreated = newTask.createdBy === newTask.assigneeId;

    // Gửi thông báo về tài khoản của các thành viên trong phòng hoặc người được phân công trực tiếp
    const assigneeName = members.find(m => m.id === newTask.assigneeId)?.name || 'Thành viên mới';
    const newNotifications: AppNotification[] = [];

    members.forEach(m => {
      // Nhận thông báo nếu thuộc phòng ban (division) của công việc hoặc nhận trực tiếp công việc đó
      if (m.division === newTask.division || m.id === newTask.assigneeId) {
        const isDirectAssignee = m.id === newTask.assigneeId;
        const notifTitle = isDirectAssignee 
          ? (isSelfCreated ? '📝 Bạn vừa tự lập một kế hoạch' : '📬 Bạn được giao công việc mới') 
          : '📢 Phòng của bạn có công việc mới';
        
        const notifMsg = isDirectAssignee
          ? (isSelfCreated 
              ? `Bạn vừa tự lập kế hoạch công việc: "${newTask.title}". Bộ phận: ${newTask.division}. Hạn chót: ${newTask.deadline}.`
              : `Bạn đã được giao công việc "${newTask.title}" bởi ${currentUser.name}. Phòng ban: ${newTask.division}. Hạn chót: ${newTask.deadline}.`)
          : `${currentUser.name} đã lập kế hoạch "${newTask.title}" cho ${assigneeName} thuộc bộ phận ${newTask.division} của bạn. Hạn chót: ${newTask.deadline}.`;

        newNotifications.push({
          id: `notif-${Date.now()}-${m.id}`,
          memberId: m.id,
          title: notifTitle,
          message: notifMsg,
          createdAt: new Date().toISOString(),
          isRead: false,
          taskId: newTask.id,
          senderName: currentUser.name
        });
      }
    });

    const nextNotifications = newNotifications.length > 0 
      ? [...newNotifications, ...notifications] 
      : notifications;

    setLastLocalWrite(Date.now());
    setTasks(updated);
    localStorage.setItem('mkt_tasks', JSON.stringify(updated));

    if (nextNotifications !== notifications) {
      setNotifications(nextNotifications);
      localStorage.setItem('mkt_notifications', JSON.stringify(nextNotifications));
      syncWithServer({ tasks: updated, notifications: nextNotifications });
    } else {
      syncWithServer({ tasks: updated });
    }

    if (isSelfCreated) {
      triggerNotification(`Đã tạo kế hoạch cá nhân: "${newTask.title}"`);
    } else {
      triggerNotification(`Đã giao công việc mới: "${newTask.title}"`);
    }
  };

  const handleUpdateTask = (id: string, updatedFields: Partial<Task>) => {
    const originalTask = tasks.find(t => t.id === id);
    const updated = tasks.map(t => t.id === id ? { ...t, ...updatedFields } : t);
    
    let nextNotifications = notifications;

    if (originalTask) {
      const assigneeId = updatedFields.assigneeId || originalTask.assigneeId;
      const division = updatedFields.division || originalTask.division;
      const title = updatedFields.title || originalTask.title;
      const deadline = updatedFields.deadline || originalTask.deadline;
      const assigneeName = members.find(m => m.id === assigneeId)?.name || 'Thành viên';
      
      const updateNotificationsStack: AppNotification[] = [];

      // TH1: Chuyển giao công việc (Re-assignee changed)
      if (updatedFields.assigneeId && updatedFields.assigneeId !== originalTask.assigneeId) {
        members.forEach(m => {
          if (m.id === assigneeId || m.id === originalTask.assigneeId || m.division === division) {
            const isTarget = m.id === assigneeId;
            const isOldAssignee = m.id === originalTask.assigneeId;
            
            let titleText = '🔄 Thay đổi người nhận việc trong phòng';
            let msgText = `${currentUser.name} đã bàn giao lại công việc "${title}" cho ${assigneeName}.`;
            
            if (isTarget) {
              titleText = '📬 Bạn được chuyển giao công việc mới';
              msgText = `Công việc "${title}" đã được bàn giao lại cho bạn từ ${currentUser.name}. Hạn chót: ${deadline}.`;
            } else if (isOldAssignee) {
              titleText = '📤 Công việc đã được chuyển giao';
              msgText = `Công việc "${title}" trước đây của bạn đã được ${currentUser.name} bàn giao lại cho ${assigneeName}.`;
            }

            updateNotificationsStack.push({
              id: `notif-${Date.now()}-${m.id}`,
              memberId: m.id,
              title: titleText,
              message: msgText,
              createdAt: new Date().toISOString(),
              isRead: false,
              taskId: id,
              senderName: currentUser.name
            });
          }
        });
      }
      // TH2: Cập nhật trạng thái công việc (Status updated)
      else if (updatedFields.status && updatedFields.status !== originalTask.status) {
        const viStatuses = { Todo: 'Đang chờ', InProgress: 'Đang làm', Completed: 'Hoàn thành' };
        const statusText = viStatuses[updatedFields.status] || updatedFields.status;

        members.forEach(m => {
          if (m.id === assigneeId || m.division === division) {
            const isDirectAssignee = m.id === assigneeId;
            updateNotificationsStack.push({
              id: `notif-${Date.now()}-${m.id}`,
              memberId: m.id,
              title: `📈 Cập nhật tiến độ: ${title}`,
              message: `${isDirectAssignee ? 'Bạn' : assigneeName} đã cập nhật trạng thái công việc "${title}" thành "${statusText}" (${updatedFields.progress || originalTask.progress}%).`,
              createdAt: new Date().toISOString(),
              isRead: false,
              taskId: id,
              senderName: currentUser.name
            });
          }
        });
      }

      if (updateNotificationsStack.length > 0) {
        nextNotifications = [...updateNotificationsStack, ...notifications];
      }
    }

    setLastLocalWrite(Date.now());
    setTasks(updated);
    localStorage.setItem('mkt_tasks', JSON.stringify(updated));

    if (nextNotifications !== notifications) {
      setNotifications(nextNotifications);
      localStorage.setItem('mkt_notifications', JSON.stringify(nextNotifications));
      syncWithServer({ tasks: updated, notifications: nextNotifications });
    } else {
      syncWithServer({ tasks: updated });
    }

    triggerNotification('Đã cập nhật thay đổi trạng thái công việc');
  };

  const handleDeleteTask = (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    const updated = tasks.filter(t => t.id !== id);
    saveTasks(updated);
    if (taskToDelete) {
      triggerNotification(`Đã gỡ bỏ công việc: "${taskToDelete.title}"`);
    }
  };

  // --- Member Operations ---
  const handleAddMember = (newMemberFields: Omit<Member, 'id'>) => {
    const newMember: Member = {
      ...newMemberFields,
      id: `member-${Date.now()}`
    };
    const updated = [...members, newMember];
    saveMembers(updated);
    triggerNotification(`Bổ nhiệm nhân sự mới: ${newMember.name}`);
  };

  const handleUpdateMember = (id: string, updatedFields: Partial<Member>) => {
    const oldMember = members.find(m => m.id === id);
    const updated = members.map(m => m.id === id ? { ...m, ...updatedFields } : m);
    saveMembers(updated);

    // Synchronize tasks assigned to this member if division is changed
    let taskSyncCount = 0;
    if (updatedFields.division && oldMember && oldMember.division !== updatedFields.division) {
      const updatedTasks = tasks.map(t => {
        if (t.assigneeId === id) {
          taskSyncCount++;
          return { ...t, division: updatedFields.division! };
        }
        return t;
      });
      if (taskSyncCount > 0) {
        saveTasks(updatedTasks);
      }
    }

    // If edited user is currently active currentUser, sync its data immediately
    if (currentUser && currentUser.id === id) {
      const updatedUser = { ...currentUser, ...updatedFields };
      setCurrentUser(updatedUser);
      localStorage.setItem('mkt_current_user', JSON.stringify(updatedUser));
    }

    const memberName = oldMember ? oldMember.name : 'Thành viên';
    if (taskSyncCount > 0) {
      triggerNotification(`🔄 Đã cập nhật thành viên "${memberName}" & tự động chuyển ${taskSyncCount} công việc sang phân ban mới: ${updatedFields.division}!`);
    } else {
      triggerNotification(`✅ Đã cập nhật thông tin thành viên "${memberName}" thành công!`);
    }
  };

  const handleDeleteMember = (id: string) => {
    if (id === 'm1') {
      triggerNotification('Không thể xóa quản trị viên tối cao (Admin) để tránh lỗi hệ thống!');
      return;
    }
    if (currentUser.id === id) {
      triggerNotification('Không thể tự xóa tài khoản chính bạn đang sử dụng!');
      return;
    }

    const memberToDelete = members.find(m => m.id === id);
    if (!memberToDelete) return;

    const updatedMembers = members.filter(m => m.id !== id);
    saveMembers(updatedMembers);

    const updatedTasks = tasks.map(t => t.assigneeId === id ? { ...t, assigneeId: '' } : t);
    saveTasks(updatedTasks);

    triggerNotification(`Đã xóa thành viên "${memberToDelete.name}" khỏi phòng ban.`);
  };

  const handleSyncAndClearMockUsers = () => {
    // Keep only members that have a gmail.com email
    const filteredMembers = members.filter(m => m.email && m.email.toLowerCase().trim().endsWith('@gmail.com'));
    
    // Ensure all INITIAL_MEMBERS (genuine Gmail accounts) are in the list
    INITIAL_MEMBERS.forEach(initMem => {
      if (!filteredMembers.some(m => m.email.toLowerCase().trim() === initMem.email.toLowerCase().trim())) {
        filteredMembers.push(initMem);
      }
    });

    saveMembers(filteredMembers);

    // Sync currentUser immediately to a valid Gmail user
    const adminUser = filteredMembers.find(m => m.id === 'm1' || m.systemRole === 'Admin') || filteredMembers[0];
    setCurrentUser(adminUser);
    localStorage.setItem('mkt_current_user', JSON.stringify(adminUser));

    // Update task assignee ids if the assignee was deleted (not in filtered list)
    const validIds = new Set(filteredMembers.map(m => m.id));
    const updatedTasks = tasks.map(t => {
      if (t.assigneeId && !validIds.has(t.assigneeId)) {
        return { ...t, assigneeId: '' };
      }
      return t;
    });
    saveTasks(updatedTasks);

    triggerNotification('🧹 Đã đồng bộ danh sách & dọn dẹp tất cả tài khoản không phải Gmail thành công!');
  };

  // --- Invoice Operations ---
  const handleAddInvoice = (newInvoiceFields: Omit<Invoice, 'id' | 'totalAmount'>) => {
    const calculatedTotal = newInvoiceFields.preTaxAmount * (1 + newInvoiceFields.vatPercent / 100);
    const newInvoice: Invoice = {
      ...newInvoiceFields,
      id: `invoice-${Date.now()}`,
      totalAmount: Math.round(calculatedTotal)
    };
    const updated = [newInvoice, ...invoices];
    saveInvoices(updated);
    triggerNotification(`Kê khai hóa đơn thành công [${newInvoice.invoiceNumber}]`);
  };

  const handleUpdateInvoiceStatus = (id: string, status: 'Pending' | 'Approved' | 'Paid') => {
    const updated = invoices.map(i => i.id === id ? { ...i, status } : i);
    saveInvoices(updated);
    triggerNotification('Trạng thái hóa đơn đã được cập nhật');
  };

  const handleDeleteInvoice = (id: string) => {
    const invoiceToDelete = invoices.find(i => i.id === id);
    const updated = invoices.filter(i => i.id !== id);
    saveInvoices(updated);
    if (invoiceToDelete) {
      triggerNotification(`Đã xóa hóa đơn lưu trữ [${invoiceToDelete.invoiceNumber}]`);
    }
  };

  // --- RBAC & Impersonation Operations ---
  const handleUpdateMemberRole = (memberId: string, systemRole: SystemRole) => {
    const updated = members.map(m => m.id === memberId ? { ...m, systemRole } : m);
    saveMembers(updated);
    
    // If the updated member is the currentUser, update currentUser as well!
    if (currentUser.id === memberId) {
      const updatedUser = { ...currentUser, systemRole };
      setCurrentUser(updatedUser);
      localStorage.setItem('mkt_current_user', JSON.stringify(updatedUser));
    }
    triggerNotification(`Đã chuyển chức vụ của thành viên thành: ${systemRole}`);
  };

  const handleUpdatePermissions = (role: SystemRole, updatedPerms: Partial<RolePermissions>) => {
    const updated = {
      ...rolePermissions,
      [role]: { ...rolePermissions[role], ...updatedPerms }
    };
    setRolePermissions(updated);
    localStorage.setItem('mkt_role_permissions', JSON.stringify(updated));
    triggerNotification(`Đã cập nhật chi tiết bảng quyền nhóm: ${role}`);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = members.find(m => m.email.toLowerCase().trim() === loginEmail.toLowerCase().trim());
    if (!found) {
      setLoginError('Không tìm thấy tài khoản với email này trong phòng!');
      return;
    }
    const expectedPassword = found.password || '123';
    if (loginPassword !== expectedPassword) {
      setLoginError('Mật khẩu không chính xác! Vui lòng thử lại.');
      return;
    }

    // Success Authentication
    setCurrentUser(found);
    localStorage.setItem('mkt_current_user', JSON.stringify(found));
    setIsAuthenticated(true);
    localStorage.setItem('mkt_is_authenticated', 'true');
    setLoginError(null);
    setLoginEmail('');
    setLoginPassword('');
    triggerNotification(`Đăng nhập thành công! Xin chào ${found.name} (${found.systemRole})`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.setItem('mkt_is_authenticated', 'false');
    triggerNotification('Đã đăng xuất tài khoản an toàn.');
  };

  const handleMarkAllNotificationsAsRead = () => {
    const updated = notifications.map(n => 
      n.memberId === currentUser.id ? { ...n, isRead: true } : n
    );
    saveNotifications(updated);
    triggerNotification('Đã đánh dấu tất cả thông báo là đã đọc');
  };

  const handleMarkNotificationAsRead = (id: string) => {
    const updated = notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
    saveNotifications(updated);
  };

  const handleClearAllNotifications = () => {
    const updated = notifications.filter(n => n.memberId !== currentUser.id);
    saveNotifications(updated);
    triggerNotification('Đã xóa toàn bộ lịch sử thông báo');
  };

  const currentUserNotifications = notifications.filter(n => n.memberId === currentUser.id);
  const unreadCount = currentUserNotifications.filter(n => !n.isRead).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
        {/* Decorative ambient blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2"></div>
        
        {/* Interactive Notification Alert */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="fixed top-5 left-1/2 -translate-x-1/2 z-55 bg-indigo-950 text-white px-5 py-3 rounded-2xl border border-indigo-800 shadow-2xl text-xs font-semibold flex items-center gap-2.5 max-w-sm sm:max-w-md"
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{notification}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-lg bg-slate-950/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative z-10 space-y-6">
          
          {/* Title header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/25">
              <ShieldCheck className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-lg font-black text-white tracking-tight pt-2 uppercase">CỔNG ĐĂNG NHẬP PHÒNG MARKETING</h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed font-medium">
              Vui lòng sử dụng địa chỉ email phòng ban và mật khẩu đã cài đặt để đăng nhập hệ thống.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-semibold leading-relaxed">
                ⚠️ {loginError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-slate-350 font-bold text-xs uppercase tracking-wider block">Email</label>
              <input 
                type="email" 
                required
                placeholder="Nhập Email"
                value={loginEmail} 
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full text-xs p-3.5 rounded-xl bg-slate-900 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-white placeholder-slate-500 transition-all font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-350 font-bold text-xs uppercase tracking-wider block">Mật khẩu</label>
              <input 
                type="password" 
                required
                placeholder="Nhập mật khẩu"
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full text-xs p-3.5 rounded-xl bg-slate-900 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-white placeholder-slate-500 transition-all font-mono"
              />
            </div>

            <button 
              type="submit"
              className="w-full p-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              Xác thực Đăng nhập
            </button>
          </form>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans" id="marketing_app_container">
      
      {/* Dynamic Floating Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-55 bg-indigo-950 text-white px-5 py-3 rounded-2xl border border-indigo-800 shadow-2xl text-xs font-semibold flex items-center gap-2.5 max-w-sm sm:max-w-md"
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Top Executive Header Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo / Title brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-indigo-155">
                <BarChart3 className="w-5.5 h-5.5" />
              </div>
              <div>
                <span className="text-indigo-400 font-black text-[9px] uppercase tracking-widest block font-mono">Phòng vận hành</span>
                <h1 className="text-base font-extrabold tracking-tight text-slate-900 leading-tight">MKT Portal</h1>
              </div>
            </div>

            {/* Middle Nav Links */}
            <nav className="hidden md:flex space-x-1 text-xs font-semibold text-slate-600">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
                  activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-extrabold' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <BarChart3 className="w-4 h-4" /> Bảng điều khiển
              </button>
              <button 
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
                  activeTab === 'tasks' ? 'bg-indigo-50 text-indigo-700 font-extrabold' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Layers className="w-4 h-4" /> Danh sách công việc
              </button>

              <button 
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
                  activeTab === 'members' ? 'bg-indigo-50 text-indigo-700 font-extrabold' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Users className="w-4 h-4" /> Hiệu suất thành viên
              </button>
              <button 
                onClick={() => setActiveTab('permissions')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
                  activeTab === 'permissions' ? 'bg-indigo-50 text-indigo-700 font-extrabold' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <ShieldCheck className="w-4 h-4" /> Phân quyền & Vai trò
              </button>
              <button 
                onClick={() => setActiveTab('links')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
                  activeTab === 'links' ? 'bg-indigo-50 text-indigo-700 font-extrabold' : 'hover:bg-slate-50 text-slate-600'
                }`}
                id="tab_btn_links"
              >
                <Link2 className="w-4 h-4" /> Liên kết bộ phận
              </button>
            </nav>

            {/* Right Quick Header User Controls */}
            <div className="flex items-center gap-3">
              
              {/* Cloud Synchronization Indicator */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-705 select-none transition-all">
                <span className="relative flex h-2 w-2">
                  {isSyncing && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isSyncing ? 'bg-amber-500' : syncError ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                </span>
                <span className="text-[11px] text-slate-600 font-medium">
                  {isSyncing ? 'Đang đồng bộ...' : syncError ? 'Lỗi kết nối' : 'Đồng bộ đám mây'}
                </span>
                <button 
                  onClick={() => syncWithServer()} 
                  disabled={isSyncing} 
                  className={`p-0.5 text-slate-400 hover:text-indigo-600 transition-all rounded-md focus:outline-none ${isSyncing ? 'opacity-50' : 'cursor-pointer'}`}
                  title="Đồng bộ thủ công"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Real-time System Time Stamp */}
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-650">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                <span>Hệ thống: <strong>{appTime.toLocaleString('vi-VN')}</strong></span>
              </div>

              {/* Chế độ Sáng/Tối (Dark Mode Toggle) */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-xl hover:bg-slate-100 border border-slate-200 dark:border-slate-700 transition cursor-pointer text-slate-600 dark:text-slate-300 block focus:outline-none shrink-0"
                aria-label="Toggle Dark Mode"
                title={isDarkMode ? 'Chuyển sang chế độ Sáng (Ban ngày)' : 'Chuyển sang chế độ Tối (Ban đêm)'}
                id="dark_mode_toggle_btn"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-500 animate-[spin_10s_linear_infinite]" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
              </button>

              {/* Notification bubble with interactive dropdown */}
              <div className="relative pointer-events-auto" id="notification_dropdown_wrapper">
                <button
                  onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                  className="p-2.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-100 transition cursor-pointer relative text-slate-600 shrink-0 block focus:outline-none"
                  aria-label="Notification Center"
                  id="notif_bell_button"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-[8px] px-1 animate-pulse select-none" id="notif_badge_count">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotifDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-100 shadow-2xl z-50 py-1 overflow-hidden"
                      id="notif_dropdown_menu"
                    >
                      {/* Dropdown Header */}
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between select-none">
                        <div>
                          <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">Thông báo tài khoản</h3>
                          <p className="text-[10px] text-indigo-650 font-bold block pt-0.5" id="current_user_nav_notif_sub">
                            {currentUser.name} • {currentUser.division}
                          </p>
                        </div>
                        {currentUserNotifications.length > 0 && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAllNotificationsAsRead();
                              }}
                              className="text-[9px] font-extrabold text-indigo-600 hover:text-indigo-850 bg-white hover:bg-indigo-50 border border-slate-200/80 px-2 py-1 rounded-lg transition cursor-pointer"
                              title="Đọc tất cả"
                            >
                              Đọc hết
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearAllNotifications();
                              }}
                              className="text-[9px] font-extrabold text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200/80 px-2 py-1 rounded-lg transition cursor-pointer"
                              title="Xóa tất cả"
                            >
                              Dọn sạch
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Dropdown List */}
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100" id="notif_dropdown_items">
                        {currentUserNotifications.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 select-none flex flex-col items-center justify-center gap-1.5 min-h-36">
                            <Bell className="w-8 h-8 text-slate-250 animate-bounce" />
                            <p className="text-xs font-bold text-slate-700">Tài khoản chưa có thông báo nào</p>
                            <p className="text-[10px] text-slate-400 leading-normal max-w-56">Mọi chỉ thị giao việc mới hoặc cập nhật công việc trong phòng [{currentUser.division}] sẽ cập nhật tức thì tại đây!</p>
                          </div>
                        ) : (
                          currentUserNotifications.map((notif) => {
                            const isUnread = !notif.isRead;
                            return (
                              <div
                                key={notif.id}
                                onClick={() => handleMarkNotificationAsRead(notif.id)}
                                className={`p-3.5 hover:bg-slate-50/90 hover:scale-[1.01] active:scale-[0.99] hover:shadow-[0_2px_8px_rgba(99,102,241,0.05)] transition-all transform duration-200 ease-out cursor-pointer text-left relative flex items-start gap-2.5 ${
                                  isUnread ? 'bg-indigo-50/25 border-l-2 border-indigo-500' : 'border-l-2 border-transparent'
                                }`}
                                id={`notif_item_${notif.id}`}
                              >
                                {isUnread && (
                                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-1.5 shrink-0 block" />
                                )}
                                <div className="space-y-1 w-full overflow-hidden">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-[11px] font-black text-slate-850 leading-tight block truncate pr-1">
                                      {notif.title}
                                    </span>
                                    <span className="text-[9px] text-slate-400 shrink-0 font-bold block">
                                      {(() => {
                                        try {
                                          const d = new Date(notif.createdAt);
                                          if (isNaN(d.getTime())) return 'Gần đây';
                                          return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                        } catch {
                                          return 'Vừa xong';
                                        }
                                      })()}
                                    </span>
                                  </div>
                                  <p className="text-[10.5px] text-slate-550 leading-normal font-semibold break-words">
                                    {notif.message}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 pt-0.5 font-bold">
                                    <span className="px-1 py-0.2 bg-slate-100 rounded border border-slate-200 text-[8px] uppercase tracking-wider font-extrabold text-[8px]">
                                      Hệ thống
                                    </span>
                                    {notif.senderName && (
                                      <span>bởi {notif.senderName}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Dropdown Footer */}
                      <div className="px-3 py-2 bg-slate-50 text-center text-[10px] text-slate-400 select-none font-bold border-t border-slate-150">
                        {unreadCount > 0 
                          ? `Có ${unreadCount} thông báo chưa đọc trong tài khoản của bạn`
                          : 'Bạn đã đọc toàn bộ thông báo!'
                        }
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Logged in dynamic user avatar preview (RBAC selection sync) */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-indigo-200 shadow-xs"
                  referrerPolicy="no-referrer"
                />
                <div className="hidden lg:block text-left">
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase font-mono tracking-wider block ${
                    currentUser.systemRole === 'Admin' ? 'bg-indigo-950 text-white' : currentUser.systemRole === 'Manager' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-105 text-slate-600 bg-slate-100'
                  }`}>
                    {currentUser.systemRole}
                  </span>
                  <span className="text-xs font-bold text-slate-705 block max-w-28 truncate" title={currentUser.name}>
                    {currentUser.name}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="ml-1.5 p-1.5 rounded-lg border border-slate-150 hover:border-rose-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  title="Đăng xuất khỏi hệ thống"
                  id="header_logout_btn"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* Secondary Mobile navigation helper - always accessible */}
      <div className="md:hidden sticky top-16 z-30 bg-white border-b border-indigo-50 p-2 overflow-x-auto whitespace-nowrap scrolling-touch scrollbar-hide text-[11px] font-semibold flex gap-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'dashboard' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-slate-600 bg-slate-50'
          }`}
        >
          📊 Tổng quan
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'tasks' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-slate-600 bg-slate-50'
          }`}
        >
          📋 Công việc ({tasks.length})
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'members' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-slate-600 bg-slate-50'
          }`}
        >
          👥 Vị trí & Nhân sự ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'permissions' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-slate-600 bg-slate-50'
          }`}
        >
          🛡️ Phân quyền
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`px-3.5 py-2 rounded-xl transition-all ${
            activeTab === 'links' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-slate-600 bg-slate-50'
          }`}
          id="mobile_tab_btn_links"
        >
          🔗 Liên kết
        </button>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="px-3.5 py-2 rounded-xl transition-all text-slate-705 bg-slate-50 border border-slate-200 font-bold flex items-center gap-1.5"
          id="mobile_tab_btn_darkmode"
        >
          {isDarkMode ? '☀️ Sáng' : '🌙 Tối'}
        </button>
        <button
          onClick={handleLogout}
          className="px-3.5 py-2 rounded-xl transition-all text-rose-600 bg-rose-50 border border-rose-100 font-bold"
          id="mobile_tab_btn_logout"
        >
          🚪 Đăng xuất
        </button>
      </div>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Animated Slide In switching view controller */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                tasks={tasks} 
                members={members} 
                invoices={invoices} 
                currentUser={currentUser}
                permissions={activePermissions}
                divisions={divisions}
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {activeTab === 'tasks' && (
              <TaskManager 
                tasks={tasks} 
                members={members} 
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                currentUser={currentUser}
                permissions={activePermissions}
                divisions={divisions}
              />
            )}



            {activeTab === 'members' && (
              <TeamPerformance 
                members={members}
                tasks={tasks}
                onAddMember={handleAddMember}
                currentUser={currentUser}
                permissions={activePermissions}
                onUpdateMemberRole={handleUpdateMemberRole}
                divisions={divisions}
                onAddDivision={handleAddDivision}
                onDeleteDivision={handleDeleteDivision}
                onClearAllDivisions={handleClearAllDivisions}
                onUpdateMember={handleUpdateMember}
                onDeleteMember={handleDeleteMember}
                onSyncAndClearMockUsers={handleSyncAndClearMockUsers}
                dailyChecklists={dailyChecklists}
                onUpdateDailyChecklists={saveDailyChecklists}
              />
            )}

            {activeTab === 'permissions' && (
              <PermissionsManager 
                members={members}
                currentUser={currentUser}
                permissions={rolePermissions}
                onUpdateMemberRole={handleUpdateMemberRole}
                onUpdatePermissions={handleUpdatePermissions}
              />
            )}

            {activeTab === 'links' && (
              <InternalAdminLinks 
                divisions={divisions}
                members={members}
                currentUser={currentUser}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* High craft beautiful minimal footer */}
      <footer className="bg-white border-t border-slate-150 py-12 mt-20 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <p className="font-bold text-slate-700 flex items-center gap-1 justify-center sm:justify-start">
              <span>Hệ thống Quản lý Vận hành Marketing</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            </p>
            <p>Hệ thống hỗ trợ duyệt VAT, phân tách KPIs tự động và quản trị tiến độ chiến dịch an toàn.</p>
          </div>
          <div className="text-slate-400">
            © 2026 MKT Portal • Thiết kế chuẩn tối ưu dữ liệu phẳng
          </div>
        </div>
      </footer>

    </div>
  );
}
