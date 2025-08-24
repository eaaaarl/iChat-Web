'use client'

import React, { useState, useEffect } from 'react'
import { MessageCircle, Search, Phone, Video, LogOut } from 'lucide-react'
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
  }, [])

  // Fetch profiles only when user is available
  useEffect(() => {
    if (user?.id) {
      fetchProfiles()
    }
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
      console.log('user id ', user?.id)

      // Only add neq filter if user.id exists
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

      setProfiles(data || []);
      console.log('Profiles fetched:', data)
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

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header with User Info */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Chats</h1>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Phone className="w-5 h-5" />
          </Button>

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={user?.user_metadata?.avatar_url}
                    alt={user?.user_metadata?.full_name || user?.email || 'User'}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getUserInitials(user?.user_metadata?.full_name, user?.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">
                  {user?.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
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
        {profilesLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p>Loading conversations...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
            <p>No conversations found</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredChats.map((chat) => (
              <Link
                key={chat.id}
                href={`/conversation/${chat.id}`}
                className="flex items-center p-4 hover:bg-accent cursor-pointer transition-colors border-b border-border/50 last:border-b-0"
              >
                {/* Avatar with online status */}
                <div className="relative">
                  <Image
                    alt={chat.display_name}
                    src={chat.avatar_url}
                    width={48}
                    height={48}
                    className='rounded-full'
                  />
                  {chat.status === 'online' && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                  )}
                </div>

                {/* Chat Info */}
                <div className="flex-1 ml-3 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground truncate">
                      {chat.display_name || chat.name}
                    </h3>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {new Date(chat.last_seen).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.status === 'online' ? 'Online' : `Last seen: ${new Date(chat.last_seen).toLocaleTimeString()}`}
                    </p>
                  </div>
                </div>
              </Link>
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