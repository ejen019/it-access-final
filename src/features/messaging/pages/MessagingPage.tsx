// =============================================================
// MessagingPage — Messagerie in-app (temps réel via Supabase)
//
// Conversation 1-to-1. conversation_id = sorted UUIDs joined by "|".
// Admin voit tous les contacts. Tech/Entreprise voient les admins.
// =============================================================
import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, MessageCircle, Loader2, ArrowLeft, CornerUpLeft, X } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase/client'

// ----- Types locaux -----

interface Contact {
  id: string
  full_name: string
  role: string
  email: string
}

interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  reply_to_id: string | null
  created_at: string
  // Dénormalisé côté client
  senderName?: string
  replyPreview?: string
}

// ----- Helpers -----

function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('|')
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
  admin: 'Admin', sudo: 'Admin', entreprise: 'Entreprise', technicien: 'Technicien',
}

// ----- Hooks -----

async function fetchContacts(role: string): Promise<Contact[]> {
  if (role === 'admin') {
    // L'admin voit entreprises et techniciens (validés, actifs) — pas les sudos
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .in('role', ['entreprise', 'technicien'])
      .eq('is_validated', true)
      .eq('is_active', true)
      .order('full_name')
    return data ?? []
  }
  // Entreprise et technicien : voient seulement les admins (pas les sudos)
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role, email')
    .eq('role', 'admin')
    .eq('is_active', true)
    .order('full_name')
  return data ?? []
}

async function fetchConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, reply_to_id, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  return (data ?? []) as ChatMessage[]
}

async function sendMessage(params: {
  conversationId: string
  senderId: string
  content: string
  replyToId: string | null
}) {
  const { error } = await supabase.from('messages').insert({
    conversation_id: params.conversationId,
    sender_id: params.senderId,
    content: params.content.trim(),
    reply_to_id: params.replyToId,
  })
  if (error) throw error
}

// ----- Composant liste contacts -----

function ContactList({
  contacts,
  selectedId,
  onSelect,
}: {
  contacts: Contact[]
  selectedId: string | null
  myId: string
  onSelect: (contact: Contact) => void
}) {
  return (
    <div className="divide-y divide-border">
      {contacts.length === 0 && (
        <p className="p-6 text-center text-sm text-muted-foreground">Aucun contact disponible</p>
      )}
      {contacts.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent border-l-2 ${
            selectedId === c.id ? 'bg-accent border-primary' : 'border-transparent'
          }`}
        >
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-white">{c.full_name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{c.full_name}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABEL[c.role]}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

// ----- Composant chat -----

function ChatView({
  contact,
  myId,
  onBack,
}: {
  contact: Contact
  myId: string
  myName: string
  onBack: () => void
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

  // Charger les messages initiaux
  useEffect(() => {
    setLoading(true)
    fetchConversationMessages(conversationId).then((msgs) => {
      setMessages(msgs)
      setLoading(false)
      scrollToBottom()
    })
  }, [conversationId, scrollToBottom])

  // Abonnement Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          scrollToBottom()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, scrollToBottom])

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
      // Refresh to show own message immediately (don't wait for Realtime)
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

  // Grouper les messages par jour
  const grouped: { day: string; msgs: ChatMessage[] }[] = []
  for (const msg of messages) {
    const day = formatDay(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last && last.day === day) {
      last.msgs.push(msg)
    } else {
      grouped.push({ day, msgs: [msg] })
    }
  }

  function getReplyPreview(replyToId: string | null): string {
    if (!replyToId) return ''
    const msg = messages.find((m) => m.id === replyToId)
    return msg ? msg.content.slice(0, 60) + (msg.content.length > 60 ? '…' : '') : ''
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header conversation */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0 shadow-sm">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-accent md:hidden">
          <ArrowLeft size={18} className="text-muted-foreground" />
        </button>
        <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-white">{contact.full_name.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{contact.full_name}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[contact.role]}</p>
        </div>
      </div>

      {/* Messages */}
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
                const isMine = msg.sender_id === myId
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
                      {/* Réponse à */}
                      {msg.reply_to_id && (
                        <div className={`text-xs opacity-70 border-l-2 pl-2 ${isMine ? 'border-white/50' : 'border-primary/50'}`}>
                          {getReplyPreview(msg.reply_to_id)}
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <p className={`text-xs ${isMine ? 'text-white/60' : 'text-muted-foreground'} text-right`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Zone réponse */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted border-t border-border">
          <CornerUpLeft size={14} className="text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              {replyTo.sender_id === myId ? 'Vous' : contact.full_name} · {replyTo.content.slice(0, 60)}
            </p>
          </div>
          <button onClick={() => setReplyTo(null)}>
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Input message */}
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

  useEffect(() => {
    if (!profile) return
    fetchContacts(profile.role).then((c) => {
      setContacts(c)
      setLoading(false)
    })
  }, [profile?.id])

  if (!profile) return null

  return (
    <div className="h-[calc(100vh-7.5rem)] md:h-[calc(100vh-4rem)] flex overflow-hidden">
      {/* Liste contacts — masquée sur mobile quand conversation ouverte */}
      <div className={`
        w-full md:w-72 border-r border-border bg-card flex flex-col flex-shrink-0
        ${selectedContact ? 'hidden md:flex' : 'flex'}
      `}>
        <div className="px-4 py-4 border-b border-border">
          <h1 className="text-lg font-bold text-foreground">Messages</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {contacts.length} contact{contacts.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ContactList
              contacts={contacts}
              selectedId={selectedContact?.id ?? null}
              myId={profile.id}
              onSelect={setSelectedContact}
            />
          )}
        </div>
      </div>

      {/* Zone de chat */}
      <div className={`flex-1 flex flex-col min-w-0 ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
        {selectedContact ? (
          <ChatView
            contact={selectedContact}
            myId={profile.id}
            myName={profile.full_name}
            onBack={() => setSelectedContact(null)}
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
