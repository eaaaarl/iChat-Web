'use client'
import { useParams } from 'next/navigation'
import React, { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Phone, Video, MoreVertical, Send, Smile, Paperclip, Image, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export default function ConversationPage() {
  const { id } = useParams()
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Mock conversation data based on ID
  const conversations = {
    '1': {
      name: 'Sarah Wilson',
      avatar: 'SW',
      isOnline: true,
      lastSeen: 'Active now'
    },
    '2': {
      name: 'Dev Team',
      avatar: 'DT',
      isOnline: false,
      lastSeen: '5 members'
    },
    '3': {
      name: 'Mom',
      avatar: 'M',
      isOnline: true,
      lastSeen: 'Active now'
    }
  }

  // Mock messages data
  const mockMessages = [
    {
      id: 1,
      senderId: 'other',
      senderName: 'Sarah',
      content: 'Hey! How are you doing?',
      timestamp: '10:30 AM',
      isRead: true
    },
    {
      id: 2,
      senderId: 'me',
      content: 'I\'m doing great! Thanks for asking 😊',
      timestamp: '10:32 AM',
      isRead: true
    },
    {
      id: 3,
      senderId: 'other',
      senderName: 'Sarah',
      content: 'That\'s wonderful to hear! Are we still on for lunch tomorrow?',
      timestamp: '10:35 AM',
      isRead: true
    },
    {
      id: 4,
      senderId: 'me',
      content: 'Absolutely! Looking forward to it. Should we meet at the usual place?',
      timestamp: '10:36 AM',
      isRead: true
    },
    {
      id: 5,
      senderId: 'other',
      senderName: 'Sarah',
      content: 'Perfect! See you at 12:30 PM at Cafe Central 🍕',
      timestamp: '10:38 AM',
      isRead: false
    }
  ]

  const currentConversation = conversations[id as keyof typeof conversations] || {
    name: 'Unknown User',
    avatar: 'U',
    isOnline: false,
    lastSeen: 'Unknown'
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500'
    ]
    return colors[name.length % colors.length]
  }

  const handleSendMessage = () => {
    if (message.trim()) {
      // Here you would normally send the message to your backend/Supabase
      console.log('Sending message:', message)
      setMessage('')
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
  }, [mockMessages])

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="relative">
            <Avatar className={`w-10 h-10 ${getAvatarColor(currentConversation.name)}`}>
              <AvatarFallback className="text-white font-semibold">
                {currentConversation.avatar}
              </AvatarFallback>
            </Avatar>
            {currentConversation.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
            )}
          </div>

          <div>
            <h2 className="font-semibold text-foreground">{currentConversation.name}</h2>
            <p className="text-xs text-muted-foreground">
              {isTyping ? 'typing...' : currentConversation.lastSeen}
            </p>
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mockMessages.map((msg: any) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] ${msg.senderId === 'me' ? 'order-2' : 'order-1'}`}>
              {msg.senderId !== 'me' && (
                <p className="text-xs text-muted-foreground mb-1 px-3">
                  {msg.senderName}
                </p>
              )}
              <div
                className={`rounded-2xl px-4 py-2 ${msg.senderId === 'me'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted text-muted-foreground rounded-bl-md'
                  }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
              <p className={`text-xs text-muted-foreground mt-1 px-3 ${msg.senderId === 'me' ? 'text-right' : 'text-left'
                }`}>
                {msg.timestamp}
                {msg.senderId === 'me' && (
                  <span className={`ml-2 ${msg.isRead ? 'text-blue-500' : 'text-muted-foreground'}`}>
                    ✓✓
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t p-4 bg-background">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Image className="w-5 h-5" />
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