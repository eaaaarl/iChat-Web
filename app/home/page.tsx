'use client'
import React, { useState, useEffect } from 'react'
import { MessageCircle, Search, LogOut, MoreVertical } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profiles, setProfiles] = useState<any[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/')
        return
      }
      setUser(session.user)
      setUserLoading(false)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.replace('/')
        } else if (session) {
          setUser(session.user)
          setUserLoading(false)
        }
      }
    )

    getUser()
    return () => subscription.unsubscribe()
    // eslint-disable-next-line
  }, [])

  // Fetch profiles only when user is available
  useEffect(() => {
    if (user?.id) {
      fetchProfiles()
    }
    // eslint-disable-next-line
  }, [user])

  const handleSignOut = async () => {
    if (user?.id) {
      const { data, error } = await supabase.from('profiles').update({
        status: 'offline',
        last_seen: new Date().toISOString(),
      }).eq('id', user?.id)
      if (error) {
        console.error('Error updating profile:', error)
      }
      console.log('Profile updated:', data)
    }
    await supabase.auth.signOut()
    router.replace('/')
  }

  const fetchProfiles = async () => {
    try {
      setProfilesLoading(true)
      let query = supabase
        .from('profiles')
        .select('*')
        .order('status', { ascending: false })
        .order('last_seen', { ascending: false })

      if (user?.id) {
        query = query.neq('id', user.id)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }

      const profileWithLastMessage = await Promise.all(
        data.map(async (profile) => {
          const { data: lastMessage, error: messageError } = await supabase
            .from('conversation')
            .select("*")
            .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${user?.id})`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (messageError && messageError.code !== 'PGRST116') {
            console.error('Error fetching last message:', messageError)
          }

          // Check if there are unread messages from this profile
          const { data: unreadCount, error: unreadError } = await supabase
            .from('conversation')
            .select('id')
            .eq('receiver_id', user?.id)
            .eq('sender_id', profile.id)
            .eq('read', false)

          if (unreadError) {
            console.error('Error fetching unread count:', unreadError)
          }

          console.log('unreadcount', unreadCount)

          return {
            ...profile,
            lastMessage: lastMessage || null,
            unreadCount: unreadCount?.length || 0,
          }
        })
      )


      setProfiles(profileWithLastMessage);
      console.log('Profiles fetched:', profileWithLastMessage.map(p => p.lastMessage))
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setProfilesLoading(false)
    }
  }

  const filteredChats = profiles.filter(chat =>
    chat.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getUserInitials = (name: string | undefined, email: string | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return 'U'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = diff / (1000 * 60 * 60)

    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    } else if (hours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto">
      {/* Mobile Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border/50 sticky top-0 z-10">
        <h1 className="text-xl font-semibold text-foreground">Chats</h1>
        <div className="flex items-center space-x-1">
          {/* Menu Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48" align="end">
              <div className="flex items-center space-x-3 p-3 border-b">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={user?.user_metadata?.avatar_url}
                    alt={user?.user_metadata?.full_name || user?.email || 'User'}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getUserInitials(user?.user_metadata?.full_name, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user?.user_metadata?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="px-4 py-3 bg-background">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 bg-muted/50 border-muted"
          />
        </div>
      </div>

      {/* Chat List - Mobile Optimized */}
      <div className="flex-1 overflow-y-auto overscroll-bounce">
        {profilesLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-center">Loading conversations...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-4">
            <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-center text-lg mb-2">No conversations found</p>
            <p className="text-center text-sm">Start a new chat to get connected</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredChats.map((chat) => (
              <Link
                key={chat.id}
                href={`/conversation/${chat.id}`}
                className={`flex items-center px-4 py-4 active:bg-accent/70 transition-colors touch-manipulation ${chat.unreadCount > 0 ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
              >
                {/* Avatar with online status */}
                <div className="relative flex-shrink-0">
                  <Image
                    alt={chat.display_name}
                    src={chat.avatar_url}
                    width={52}
                    height={52}
                    className="rounded-full"
                  />
                  {chat.status === 'online' && (
                    <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full"></div>
                  )}
                </div>

                {/* Chat Info */}
                <div className="flex-1 ml-3 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-semibold truncate text-base ${chat.unreadCount > 0 ? 'text-foreground font-bold' : 'text-foreground'
                      }`}>
                      {chat.display_name || chat.name}
                    </h3>
                    {chat.unreadCount > 0 && (
                      <div className="bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate flex-1 ${chat.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}>
                      {chat.lastMessage ? (
                        <>
                          {chat.lastMessage.sender_id === user?.id ? 'You: ' : ''}
                          {chat.lastMessage.content}
                        </>
                      ) : (
                        'No messages yet'
                      )}
                    </p>
                    <span className={`text-xs ml-2 flex-shrink-0 ${chat.unreadCount > 0 ? 'text-blue-500 font-semibold' : 'text-muted-foreground'
                      }`}>
                      {chat.lastMessage ?
                        formatTime(chat.lastMessage.created_at) :
                        formatTime(chat.last_seen)
                      }
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Floating Action Button */}
      <div className="fixed bottom-6 right-4 z-20">
        <Button
          size="icon"
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-shadow active:scale-95"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>
    </div>
  )
}