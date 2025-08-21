'use client'

import React, { useState } from 'react'
import { MessageCircle, Search, Phone, Video, Settings } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('')

  // Mock chat data
  const mockChats = [
    {
      id: 1,
      name: 'Sarah Wilson',
      lastMessage: 'Hey! Are we still on for lunch tomorrow?',
      timestamp: '2m ago',
      avatar: 'SW',
      unreadCount: 2,
      isOnline: true,
      isTyping: false
    },
    {
      id: 2,
      name: 'Dev Team',
      lastMessage: 'John: The new feature is ready for testing 🚀',
      timestamp: '15m ago',
      avatar: 'DT',
      unreadCount: 5,
      isOnline: false,
      isTyping: false
    },
    {
      id: 3,
      name: 'Mom',
      lastMessage: 'Don\'t forget to call grandma today ❤️',
      timestamp: '1h ago',
      avatar: 'M',
      unreadCount: 0,
      isOnline: true,
      isTyping: true
    },
    {
      id: 4,
      name: 'Alex Johnson',
      lastMessage: 'Thanks for helping me with the project!',
      timestamp: '3h ago',
      avatar: 'AJ',
      unreadCount: 0,
      isOnline: false,
      isTyping: false
    },
    {
      id: 5,
      name: 'Book Club',
      lastMessage: 'Emma: What did everyone think of chapter 3?',
      timestamp: '1d ago',
      avatar: 'BC',
      unreadCount: 12,
      isOnline: false,
      isTyping: false
    },
    {
      id: 6,
      name: 'Mike Chen',
      lastMessage: 'See you at the gym tonight! 💪',
      timestamp: '2d ago',
      avatar: 'MC',
      unreadCount: 0,
      isOnline: true,
      isTyping: false
    },
    {
      id: 7,
      name: 'Work Updates',
      lastMessage: 'Lisa: Meeting moved to 3 PM',
      timestamp: '3d ago',
      avatar: 'WU',
      unreadCount: 0,
      isOnline: false,
      isTyping: false
    }
  ]

  const filteredChats = mockChats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500'
    ]
    return colors[name.length % colors.length]
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Chats</h1>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
            <p>No conversations found</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className="flex items-center p-4 hover:bg-accent cursor-pointer transition-colors border-b border-border/50 last:border-b-0"
              >
                {/* Avatar with online status */}
                <div className="relative">
                  <Avatar className={`w-12 h-12 ${getAvatarColor(chat.name)}`}>
                    <AvatarFallback className="text-white font-semibold">
                      {chat.avatar}
                    </AvatarFallback>
                  </Avatar>
                  {chat.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                  )}
                </div>

                {/* Chat Info */}
                <div className="flex-1 ml-3 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground truncate">
                      {chat.name}
                    </h3>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {chat.timestamp}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.isTyping ? (
                        <span className="text-blue-600 italic">typing...</span>
                      ) : (
                        chat.lastMessage
                      )}
                    </p>
                    {chat.unreadCount > 0 && (
                      <Badge variant="default" className="ml-2 flex-shrink-0 bg-blue-600 hover:bg-blue-700">
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-6 right-6">
        <Button size="icon" className="rounded-full h-14 w-14 shadow-lg">
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>
    </div>
  )
}