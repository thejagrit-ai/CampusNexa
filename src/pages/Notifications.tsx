import { useEffect, useMemo, useState } from 'react';
import { onSnapshot, collection, deleteDoc, doc, query, updateDoc, where } from 'firebase/firestore';
import { Bell, CheckCheck, Trash2, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type Category = 'academic' | 'placement' | 'finance' | 'system' | 'general';
interface NotificationRecord { id: string; title?: string; message?: string; type?: string; category?: Category; read?: boolean; createdAt?: { toDate?: () => Date } | Date; }

const relativeTime = (value: NotificationRecord['createdAt']) => {
  const date = value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function' ? value.toDate() : value instanceof Date ? value : null;
  if (!date) return 'Just now';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Just now'; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`; return date.toLocaleDateString();
};

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const records = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as NotificationRecord));
      records.sort((a, b) => { const aDate = a.createdAt && 'toDate' in a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0; const bDate = b.createdAt && 'toDate' in b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0; return bDate - aDate; });
      setNotifications(records); setLoading(false);
    }, (error) => { console.error('Notification listener failed', error); toast.error('Could not load notifications'); setLoading(false); });
    return unsubscribe;
  }, [user?.uid]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const categories = new Set(notifications.map((notification) => notification.category || 'general'));
  const filteredNotifications = useMemo(() => notifications.filter((notification) => activeTab === 'all' || (activeTab === 'unread' ? !notification.read : (notification.category || 'general') === activeTab)), [activeTab, notifications]);
  const markAsRead = async (id: string) => { try { await updateDoc(doc(db, 'notifications', id), { read: true, readAt: new Date() }); } catch { toast.error('Could not update notification'); } };
  const markAllAsRead = async () => { try { await Promise.all(notifications.filter((item) => !item.read).map((item) => updateDoc(doc(db, 'notifications', item.id), { read: true, readAt: new Date() }))); } catch { toast.error('Could not mark all notifications as read'); } };
  const removeNotification = async (id: string) => { try { await deleteDoc(doc(db, 'notifications', id)); } catch { toast.error('Could not delete notification'); } };

  return (
    <div className="w-full space-y-6 pb-8">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-3"><h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1><Badge variant="secondary">{unreadCount} unread</Badge></div><p className="mt-1 text-sm text-muted-foreground">Live alerts and updates for your account.</p></div><div className="flex items-center gap-2">{unreadCount > 0 && <Button variant="outline" size="sm" onClick={markAllAsRead}><CheckCheck className="mr-2 h-4 w-4" />Mark all as read</Button>}<Button variant="ghost" size="icon" onClick={() => window.location.reload()} title="Refresh notifications"><RefreshCw className="h-4 w-4" /></Button></div></div>
      <div className="grid gap-3 sm:grid-cols-3"><Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-muted p-2"><Bell className="h-5 w-5" /></div><div><p className="text-2xl font-semibold">{notifications.length}</p><p className="text-xs text-muted-foreground">Total notifications</p></div></CardContent></Card><Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-muted p-2"><Inbox className="h-5 w-5" /></div><div><p className="text-2xl font-semibold">{unreadCount}</p><p className="text-xs text-muted-foreground">Unread alerts</p></div></CardContent></Card><Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-muted p-2"><CheckCheck className="h-5 w-5" /></div><div><p className="text-2xl font-semibold">{categories.size}</p><p className="text-xs text-muted-foreground">Active categories</p></div></CardContent></Card></div>
      <Card><CardHeader className="border-b border-border/60 pb-4"><CardTitle className="text-lg">Activity feed</CardTitle><Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3"><TabsList className="h-auto max-w-full justify-start overflow-x-auto"><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="unread">Unread {unreadCount > 0 && <Badge className="ml-2 h-5 px-1.5" variant="secondary">{unreadCount}</Badge>}</TabsTrigger>{Array.from(categories).filter((category) => category !== 'general').map((category) => <TabsTrigger key={category} value={category} className="capitalize">{category}</TabsTrigger>)}</TabsList></Tabs></CardHeader><CardContent className="p-4 sm:p-6">{loading ? <div className="flex items-center justify-center py-16 text-sm text-muted-foreground"><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Syncing live notifications…</div> : filteredNotifications.length === 0 ? <div className="py-16 text-center"><Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" /><p className="font-medium text-foreground">No notifications</p><p className="mt-1 text-sm text-muted-foreground">New alerts will appear here in real time.</p></div> : <div className="divide-y divide-border">{filteredNotifications.map((notification) => <div key={notification.id} className={cn('group flex gap-3 py-4 first:pt-0 last:pb-0', !notification.read && 'bg-muted/20 -mx-3 px-3 rounded-lg')} onClick={() => !notification.read && markAsRead(notification.id)}><div className="mt-0.5 rounded-full border border-border bg-background p-2"><Bell className={cn('h-4 w-4', notification.read ? 'text-muted-foreground' : 'text-foreground')} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><p className={cn('font-medium', !notification.read && 'font-semibold')}>{notification.title || 'Notification'}</p><div className="flex items-center gap-2"><span className="whitespace-nowrap text-xs text-muted-foreground">{relativeTime(notification.createdAt)}</span><Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(event) => { event.stopPropagation(); removeNotification(notification.id); }} aria-label="Delete notification"><Trash2 className="h-3.5 w-3.5" /></Button></div></div><p className="mt-1 text-sm text-muted-foreground">{notification.message || 'You have a new update.'}</p><div className="mt-2 flex items-center gap-2">{notification.category && <Badge variant="outline" className="capitalize">{notification.category}</Badge>}{!notification.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Unread" />}</div></div></div>)}</div>}</CardContent></Card>
    </div>
  );
}
