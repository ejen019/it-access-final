// =============================================================
// NotificationBell — cloche avec badge de comptage
// Actualisation automatique toutes les 60 secondes.
// =============================================================
import { Bell } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import type { Notification } from '@/types'

export function NotificationBell() {
  const { profile } = useAuthStore()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      if (!profile) return []
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20)
      return (data ?? []) as Notification[]
    },
    enabled: !!profile,
    refetchInterval: 60_000,
  })

  // Realtime : nouvelle notification → invalider le cache immédiatement
  useEffect(() => {
    if (!profile?.id) return

    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', profile.id] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, queryClient])

  const unreadCount = notifications.length

  async function markAllRead() {
    if (!profile) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id)
    queryClient.invalidateQueries({ queryKey: ['notifications', profile.id] })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label={`${unreadCount} notification${unreadCount > 1 ? 's' : ''}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucune notification</p>
              ) : (
                notifications.map((notif) => (
                  <NotifItem
                    key={notif.id}
                    notif={notif}
                    onClose={() => setOpen(false)}
                    onRead={() => queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] })}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function NotifItem({
  notif,
  onClose,
  onRead,
}: {
  notif: Notification
  onClose: () => void
  onRead: () => void
}) {
  const navigate = useNavigate()

  async function handleClick() {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id)
    onRead()
    if (notif.link) navigate(notif.link)
    onClose()
  }

  return (
    <button onClick={handleClick} className="w-full text-left px-4 py-3 hover:bg-accent transition-colors">
      <p className="text-sm font-medium text-foreground line-clamp-1">{notif.title}</p>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        {new Date(notif.created_at).toLocaleDateString('fr-FR', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        })}
      </p>
    </button>
  )
}
