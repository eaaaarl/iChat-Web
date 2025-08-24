'use client'
import { useParams, useRouter } from 'next/navigation'
import React, { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Phone, Video, MoreVertical, Send, Smile, Paperclip, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  read: boolean
  senderName?: string
  isRead?: boolean
}

export default function ConversationPage() {
  const { id } = useParams()
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [otherUser, setOtherUser] = useState<any | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setCurrentUser(session?.user || null)
    }
    getUser()
  }, [])

  useEffect(() => {
    if (!currentUser || !id) return

    const fetchOtherUser = async () => {
      const { data, error } = await supabase.from("profiles")
        .select("*")
        .eq('id', id)
        .single()

      if (!error) {
        setOtherUser(data)
      } else {
        console.error('Error fetching other user', error)
      }
    }

    const fetchConversation = async () => {
      const { data, error } = await supabase
        .from('conversation')
        .select('*')
        .or(`and(sender_id.eq.${currentUser?.id}, receiver_id.eq.${id}), and(sender_id.eq.${id},receiver_id.eq.${currentUser?.id})`)
        .order('created_at', { ascending: true })

      if (!error) {
        setMessages(data || [])
      } else {
        console.error('Error fetching messages:', error)
      }
    }

    fetchOtherUser()
    fetchConversation()


    const channels = supabase.channel('custom-insert-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation',
        },
        (payload) => {
          const message = payload.new as Message;

          const isMyConversation =
            (message.sender_id === currentUser.id && message.receiver_id === id) ||
            (message.sender_id === id && message.receiver_id === currentUser.id);

          if (isMyConversation) {
            setMessages(prev => [...prev, message]);
          }
        }
      )
      .subscribe()

    return () => {
      channels.unsubscribe()
    }

  }, [id, currentUser, otherUser?.id])


  const handleSendMessage = async () => {
    if (message.trim() && currentUser && id) {
      try {
        const { error } = await supabase
          .from('conversation')
          .insert({
            sender_id: currentUser?.id,
            receiver_id: id as string,
            content: message.trim(),
            read: false
          })
          .select()

        if (!error) {
          setMessage('')
        } else {
          console.error('Error sending message:', error)
        }
      } catch (error) {
        console.error('Error sending message:', error)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  /* if (!otherUser) {
    return (
      <div className="flex flex-col h-screen bg-background max-w-md mx-auto items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading conversation...</p>
      </div>
    )
  } */


  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center space-x-3">
          <Button onClick={() => { router.push('/home') }} variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="relative">
            {otherUser?.avatar_url ? (
              <Image
                alt={otherUser.display_name}
                src={otherUser.avatar_url}
                width={48}
                height={48}
                className='rounded-full'
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-lg">
                {otherUser?.display_name ? otherUser.display_name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            {otherUser?.status === 'online' && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
            )}

          </div>

          <div>
            <h2 className="font-semibold text-foreground">{otherUser?.display_name}</h2>
            {/* <p className="text-xs text-muted-foreground">
              {isTyping ? 'typing...' : currentConversation.lastSeen}
            </p> */}
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Start a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Send a message to {otherUser?.display_name || 'this person'} to start chatting. Your messages are end-to-end encrypted.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg: Message) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${msg.sender_id === currentUser?.id ? 'order-2' : 'order-1'}`}>
                {msg.sender_id !== currentUser?.id && (
                  <p className="text-xs text-muted-foreground mb-1 px-3">
                    {msg.senderName}
                  </p>
                )}
                <div
                  className={`rounded-2xl px-4 py-2 ${msg.sender_id === currentUser?.id
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-muted-foreground rounded-bl-md'
                    }`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
                <p className={`text-xs text-muted-foreground mt-1 px-3 ${msg.sender_id === currentUser?.id ? 'text-right' : 'text-left'
                  }`}>
                  {formatTime(msg.created_at)}
                  {msg.sender_id === currentUser?.id && (
                    <span className={`ml-2 ${msg.isRead ? 'text-blue-500' : 'text-muted-foreground'}`}>
                      ✓✓
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t p-4 bg-background">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0">
            {/* <Image className="w-5 h-5" /> */}
          </Button>

          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="pr-20 rounded-full"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Smile className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {message.trim() ? (
            <Button size="icon" onClick={handleSendMessage} className="shrink-0">
              <Send className="w-5 h-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="shrink-0">
              <Mic className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}