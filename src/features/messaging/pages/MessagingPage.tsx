// =============================================================
// MessagingPage — Messagerie in-app (temps réel via Supabase)
//
// Conversation 1-to-1. conversation_id = sorted UUIDs joined by "|".
// Admin voit tous les contacts. Tech/Client voient les admins.
//
// Fonctions : accusés de lecture (colonne `lu`), ticks façon WhatsApp,
// présence en ligne (points verts), compteur de messages non lus.
// =============================================================
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, MessageCircle, Loader2, ArrowLeft, CornerUpLeft, X, Check, CheckCheck, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase/client'

// ----- Types locaux -----

interface Contact {
  id: string
  nom: string
  prenom: string | null
  role: string
  email: string
}

interface ChatMessage {
  id: string
  conversation_id: string
  expediteur_id: string
  contenu: string
  reponse_a_id: string | null
  lu: boolean
  cree_le: string
}

// ----- Helpers -----

function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('|')
}

function displayName(c: Contact): string {
  return `${c.prenom ?? ''} ${c.nom}`.trim()
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', super_admin: 'Super Admin', client: 'Entreprise', technicien: 'Technicien',
}

const MESSAGE_COLS = 'id, conversation_id, expediteur_id, contenu, reponse_a_id, lu, cree_le'

// ----- Présence (statut en ligne) -----

function useOnlineUsers(myId: string | undefined): Set<string> {
  const [online, setOnline] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!myId) return
    const channel = supabase.channel('presence:online', {
      config: { presence: { key: myId } },
    })
    channel
      .on('presence', { event: 'sync' }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() })
        }
      })
    return () => { supabase.removeChannel(channel) }
  }, [myId])

  return online
}

// ----- Requêtes -----

// Contacts via fonction SECURITY DEFINER (contourne la RLS util_select).
// admin/super_admin : clients + techniciens.
// technicien : admins + entreprises liées à une intervention active assignée.
// client : admins + techniciens affectés à une intervention active.
async function fetchContacts(): Promise<Contact[]> {
  const { data, error } = await supabase.rpc('mes_contacts_messagerie')
  if (error) throw error
  return (data ?? []) as Contact[]
}

async function fetchConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from('messages')
    .select(MESSAGE_COLS)
    .eq('conversation_id', conversationId)
    .order('cree_le', { ascending: true })
  return (data ?? []) as ChatMessage[]
}

// Compte les messages non lus reçus, regroupés par expéditeur
async function fetchUnreadCounts(myId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('messages')
    .select('expediteur_id, conversation_id')
    .eq('lu', false)
    .neq('expediteur_id', myId)
    .like('conversation_id', `%${myId}%`)
  const counts: Record<string, number> = {}
  for (const m of (data ?? []) as { expediteur_id: string }[]) {
    counts[m.expediteur_id] = (counts[m.expediteur_id] ?? 0) + 1
  }
  return counts
}

// Marque comme lus tous les messages reçus de la conversation
async function markConversationRead(conversationId: string, myId: string) {
  await supabase
    .from('messages')
    .update({ lu: true })
    .eq('conversation_id', conversationId)
    .neq('expediteur_id', myId)
    .eq('lu', false)
}

async function sendMessage(params: {
  conversationId: string
  senderId: string
  content: string
  replyToId: string | null
}) {
  const { error } = await supabase.from('messages').insert({
    conversation_id: params.conversationId,
    expediteur_id: params.senderId,
    contenu: params.content.trim(),
    reponse_a_id: params.replyToId,
  })
  if (error) throw error
}

// ----- Composant liste contacts -----

// Catégories de contacts (sections distinctes)
const CONTACT_GROUPS: { key: string; title: string; roles: string[] }[] = [
  { key: 'admins', title: 'Administration', roles: ['admin', 'super_admin'] },
  { key: 'techs',  title: 'Techniciens',    roles: ['technicien'] },
  { key: 'clients', title: 'Entreprises',   roles: ['client'] },
]

function ContactRow({
  c, selected, online, unread, onSelect,
}: {
  c: Contact; selected: boolean; online: boolean; unread: number; onSelect: (c: Contact) => void
}) {
  return (
    <button
      onClick={() => onSelect(c)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent border-l-2 ${
        selected ? 'bg-accent border-primary' : 'border-transparent'
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center">
          <span className="text-sm font-bold text-white">{c.nom.charAt(0).toUpperCase()}</span>
        </div>
        {online && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${unread > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
          {displayName(c)}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {online ? <span className="text-emerald-600 dark:text-emerald-400">En ligne</span> : ROLE_LABEL[c.role]}
        </p>
      </div>
      {unread > 0 && (
        <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-primary text-white text-xs font-bold rounded-full flex-shrink-0">
          {unread}
        </span>
      )}
    </button>
  )
}

function ContactList({
  contacts,
  search,
  selectedId,
  onlineIds,
  unreadCounts,
  onSelect,
}: {
  contacts: Contact[]
  search: string
  selectedId: string | null
  onlineIds: Set<string>
  unreadCounts: Record<string, number>
  onSelect: (contact: Contact) => void
}) {
  const q = search.trim().toLowerCase()
  const filtered = q
    ? contacts.filter((c) =>
        displayName(c).toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q))
    : contacts

  if (filtered.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        {q ? 'Aucun contact ne correspond' : 'Aucun contact disponible'}
      </p>
    )
  }

  return (
    <div>
      {CONTACT_GROUPS.map((group) => {
        const members = filtered
          .filter((c) => group.roles.includes(c.role))
          .sort((a, b) => (unreadCounts[b.id] ?? 0) - (unreadCounts[a.id] ?? 0) || displayName(a).localeCompare(displayName(b)))
        if (members.length === 0) return null
        return (
          <div key={group.key}>
            <p className="px-4 pt-3 pb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
              {group.title} · {members.length}
            </p>
            <div className="divide-y divide-border">
              {members.map((c) => (
                <ContactRow
                  key={c.id}
                  c={c}
                  selected={selectedId === c.id}
                  online={onlineIds.has(c.id)}
                  unread={unreadCounts[c.id] ?? 0}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ----- Indicateur de lecture (ticks WhatsApp) -----

function ReadTicks({ read, online }: { read: boolean; online: boolean }) {
  if (read) {
    // Lu → double trait bleu
    return <CheckCheck size={14} className="text-sky-300" />
  }
  if (online) {
    // Destinataire en ligne (délivré) → double trait
    return <CheckCheck size={14} className="text-white/60" />
  }
  // Hors ligne → simple trait
  return <Check size={14} className="text-white/60" />
}

// ----- Composant chat -----

function ChatView({
  contact,
  myId,
  isOnline,
  onBack,
  onReadChange,
}: {
  contact: Contact
  myId: string
  isOnline: boolean
  onBack: () => void
  onReadChange: () => void
}) {
  const conversationId = getConversationId(myId, contact.id)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  // Marque la conversation comme lue puis prévient le parent
  const markRead = useCallback(async () => {
    await markConversationRead(conversationId, myId)
    onReadChange()
  }, [conversationId, myId, onReadChange])

  useEffect(() => {
    setLoading(true)
    fetchConversationMessages(conversationId).then((msgs) => {
      setMessages(msgs)
      setLoading(false)
      scrollToBottom()
      markRead()
    })
  }, [conversationId, scrollToBottom, markRead])

  useEffect(() => {
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]))
          scrollToBottom()
          // Message reçu pendant que la conversation est ouverte → marquer lu
          if (newMsg.expediteur_id !== myId) markRead()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const upd = payload.new as ChatMessage
          setMessages((prev) => prev.map((m) => (m.id === upd.id ? { ...m, lu: upd.lu } : m)))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, scrollToBottom, markRead, myId])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    const currentInput = input.trim()
    const currentReply = replyTo
    setInput('')
    setReplyTo(null)
    try {
      await sendMessage({
        conversationId,
        senderId: myId,
        content: currentInput,
        replyToId: currentReply?.id ?? null,
      })
      const msgs = await fetchConversationMessages(conversationId)
      setMessages(msgs)
      scrollToBottom()
    } catch {
      setInput(currentInput)
      setReplyTo(currentReply)
    } finally {
      setSending(false)
    }
  }

  function handleLongPressStart(msg: ChatMessage) {
    longPressTimer.current = setTimeout(() => setReplyTo(msg), 500)
  }

  function handleLongPressEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const grouped: { day: string; msgs: ChatMessage[] }[] = []
  for (const msg of messages) {
    const day = formatDay(msg.cree_le)
    const last = grouped[grouped.length - 1]
    if (last && last.day === day) last.msgs.push(msg)
    else grouped.push({ day, msgs: [msg] })
  }

  function getReplyPreview(replyToId: string | null): string {
    if (!replyToId) return ''
    const msg = messages.find((m) => m.id === replyToId)
    return msg ? msg.contenu.slice(0, 60) + (msg.contenu.length > 60 ? '…' : '') : ''
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0 shadow-sm">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-accent md:hidden">
          <ArrowLeft size={18} className="text-muted-foreground" />
        </button>
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center">
            <span className="text-sm font-bold text-white">{contact.nom.charAt(0).toUpperCase()}</span>
          </div>
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{displayName(contact)}</p>
          <p className="text-xs">
            {isOnline
              ? <span className="text-emerald-600 dark:text-emerald-400">En ligne</span>
              : <span className="text-muted-foreground">{ROLE_LABEL[contact.role]}</span>}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <MessageCircle size={24} className="text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Démarrez la conversation</p>
          </div>
        ) : (
          grouped.map(({ day, msgs }) => (
            <div key={day}>
              <p className="text-xs text-muted-foreground text-center my-3">{day}</p>
              {msgs.map((msg) => {
                const isMine = msg.expediteur_id === myId
                return (
                  <div
                    key={msg.id}
                    className={`flex mb-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                    onMouseDown={() => handleLongPressStart(msg)}
                    onMouseUp={handleLongPressEnd}
                    onTouchStart={() => handleLongPressStart(msg)}
                    onTouchEnd={handleLongPressEnd}
                  >
                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 space-y-1 ${
                      isMine
                        ? 'gradient-primary text-white rounded-br-sm shadow-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}>
                      {msg.reponse_a_id && (
                        <div className={`text-xs opacity-70 border-l-2 pl-2 ${isMine ? 'border-white/50' : 'border-primary/50'}`}>
                          {getReplyPreview(msg.reponse_a_id)}
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">{msg.contenu}</p>
                      <div className={`flex items-center gap-1 ${isMine ? 'justify-end' : 'justify-end'}`}>
                        <span className={`text-xs ${isMine ? 'text-white/60' : 'text-muted-foreground'}`}>
                          {formatTime(msg.cree_le)}
                        </span>
                        {isMine && <ReadTicks read={msg.lu} online={isOnline} />}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted border-t border-border">
          <CornerUpLeft size={14} className="text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              {replyTo.expediteur_id === myId ? 'Vous' : displayName(contact)} · {replyTo.contenu.slice(0, 60)}
            </p>
          </div>
          <button onClick={() => setReplyTo(null)}>
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 px-4 py-3 border-t border-border bg-card flex-shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Votre message…"
          className="flex-1 px-3.5 py-2.5 bg-background border border-input rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 flex items-center justify-center gradient-primary text-white rounded-full disabled:opacity-50 flex-shrink-0 shadow-sm"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  )
}

// ----- Page principale -----

export function MessagingPage() {
  const { profile } = useAuthStore()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')

  const onlineIds = useOnlineUsers(profile?.id)

  const refreshUnread = useCallback(() => {
    if (!profile) return
    fetchUnreadCounts(profile.id).then(setUnreadCounts)
  }, [profile?.id])

  const refreshContacts = useCallback(() => {
    if (!profile) return
    fetchContacts().then(setContacts)
  }, [profile?.id])

  useEffect(() => {
    if (!profile) return
    fetchContacts().then((c) => {
      setContacts(c)
      setLoading(false)
    })
    refreshUnread()
  }, [profile?.id, refreshUnread])

  // Liste de contacts en temps réel : une intervention planifiée fait apparaître
  // le contact (entreprise/technicien), une signature le fait disparaître.
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel(`contacts:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interventions' },
        () => refreshContacts()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `utilisateur_id=eq.${profile.id}` },
        () => refreshContacts()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, refreshContacts])

  // Met à jour le compteur global de non-lus en temps réel
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel(`messages:inbox:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { conversation_id?: string }
          if (row?.conversation_id?.includes(profile.id)) refreshUnread()
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, refreshUnread])

  if (!profile) return null

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="h-[calc(100vh-7.5rem)] md:h-[calc(100vh-6.5rem)] flex overflow-hidden rounded-xl border border-border">
      <div className={`
        w-full md:w-72 border-r border-border bg-card flex flex-col flex-shrink-0
        ${selectedContact ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-foreground">Messages</h1>
            {totalUnread > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-primary text-white text-xs font-bold rounded-full">
                {totalUnread}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {contacts.length} contact{contacts.length > 1 ? 's' : ''}
          </p>
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un contact…"
              className="w-full pl-8 pr-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ContactList
              contacts={contacts}
              search={search}
              selectedId={selectedContact?.id ?? null}
              onlineIds={onlineIds}
              unreadCounts={unreadCounts}
              onSelect={setSelectedContact}
            />
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col min-w-0 ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
        {selectedContact ? (
          <ChatView
            key={selectedContact.id}
            contact={selectedContact}
            myId={profile.id}
            isOnline={onlineIds.has(selectedContact.id)}
            onBack={() => setSelectedContact(null)}
            onReadChange={refreshUnread}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
            <MessageCircle size={48} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Sélectionnez un contact pour démarrer une conversation
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
