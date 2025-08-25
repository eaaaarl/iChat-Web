'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Search, MoreHorizontal, Phone, Video, Settings, Sun, Moon, MessageCircle, Send, Smile, Paperclip, Camera } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/features/chatList/types/profiles';



const MessengerApp = () => {
  const [selectedChat, setSelectedChat] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [messages, setMessages] = useState<Record<string, Array<{ id: string; content: string; sender_id: string; created_at: string; read: boolean }>>>({});
  const messagesEndRef = useRef(null);
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<{ id: string, avatar_url: string } | null>(null)

  // Helper function to format message time
  const formatMessageTime = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      if (diffInHours < 1) {
        return 'Just now';
      }
      return messageDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else if (diffInHours < 168) { // 7 days
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setCurrentUser(session?.user || null)
    }
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (!currentUser) return

    const fetchCurrentUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single()

        if (error) {
          console.error('Error fetching current user profile:', error)
          return
        }

        setCurrentUserProfile(data)
      } catch (error) {
        console.error('Error fetching current user profile:', error)
      }
    }

    fetchCurrentUserProfile()
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return

    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', currentUser.id) // Exclude current user

        if (error) {
          console.error('Error fetching profiles', error)
          return
        }

        // Fetch last message for each profile
        const profilesWithLastMessage = await Promise.all(
          data?.map(async (profile) => {
            try {
              const { data: lastMessage, error: messageError } = await supabase
                .from('conversation')
                .select('*')
                .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${currentUser.id})`)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

              if (messageError && messageError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                console.error('Error fetching last message for profile', profile.id, messageError)
              }

              return {
                ...profile,
                lastMessage: lastMessage?.content || null,
                lastMessageTime: lastMessage?.created_at || null,
                unreadCount: 0 // You can implement unread count logic here
              }
            } catch (error) {
              console.error('Error processing profile', profile.id, error)
              return {
                ...profile,
                lastMessage: null,
                lastMessageTime: null,
                unreadCount: 0
              }
            }
          }) || []
        )

        setProfiles(profilesWithLastMessage)
        console.log('Profiles with last messages:', profilesWithLastMessage)
      } catch (error) {
        console.log('Something went wrong fetching profiles', error)
      }
    }

    fetchProfiles()
  }, [currentUser])



  const filteredContacts = profiles.filter(contact =>
    contact.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scrollToBottom = (): void => {
    (messagesEndRef.current as HTMLDivElement | null)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch messages when a chat is selected
  useEffect(() => {
    if (!selectedChat || !currentUser) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('conversation')
          .select('*')
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedChat.id}),and(sender_id.eq.${selectedChat.id},receiver_id.eq.${currentUser.id})`)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
          return;
        }

        setMessages(prev => ({
          ...prev,
          [selectedChat.id]: data || []
        }));

        // Mark messages as read
        if (data && data.length > 0) {
          const unreadMessages = data.filter(
            msg => msg.sender_id === selectedChat.id &&
              msg.receiver_id === currentUser.id &&
              !msg.read
          );

          if (unreadMessages.length > 0) {
            const messageIds = unreadMessages.map(msg => msg.id);
            await supabase
              .from('conversation')
              .update({ read: true })
              .in('id', messageIds);
          }
        }

        // Update the profile's last message
        if (data && data.length > 0) {
          const lastMessage = data[data.length - 1];
          setProfiles(prev => prev.map(profile =>
            profile.id === selectedChat.id
              ? { ...profile, lastMessage: lastMessage.content, lastMessageTime: lastMessage.created_at }
              : profile
          ));
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [selectedChat, currentUser]);

  // Real-time message updates
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel('conversation-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation',
          filter: `sender_id=eq.${currentUser.id} OR receiver_id=eq.${currentUser.id}`
        },
        (payload) => {
          const newMessage = payload.new as { id: string; content: string; sender_id: string; receiver_id: string; created_at: string; read: boolean };

          // Determine which conversation this message belongs to
          const conversationId = newMessage.sender_id === currentUser.id ? newMessage.receiver_id : newMessage.sender_id;

          setMessages(prev => ({
            ...prev,
            [conversationId]: [...(prev[conversationId] || []), newMessage]
          }));

        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat, messages]);

  const sendMessage = async () => {
    if (message.trim() && selectedChat && currentUser) {
      try {
        const newMessage = {
          content: message.trim(),
          sender_id: currentUser.id,
          receiver_id: selectedChat.id,
          read: false,
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('conversation')
          .insert([newMessage])
          .select()
          .single();

        if (error) {
          console.error('Error sending message:', error);
          return;
        }

        // Add the new message to the local state
        setMessages(prev => ({
          ...prev,
          [selectedChat.id]: [...(prev[selectedChat.id] || []), data]
        }));

        setMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className={`h-screen flex bg-gray-50`}>
      <div className={`w-20 flex flex-col items-center py-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Message icon at the top */}
        <div className={`p-3 rounded-full mb-6 ${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'} hover:opacity-80 transition-opacity cursor-pointer`}>
          <MessageCircle size={24} />
        </div>

        {/* Current user avatar at the bottom */}
        <div className="mt-auto">
          <div className="relative">
            <Image
              src={currentUserProfile?.avatar_url || '/default-avatar.svg'}
              alt="Current User"
              className="rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              width={48}
              height={48}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/default-avatar.svg';
              }}
            />
            {/* Online status indicator */}
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
        </div>
      </div>
      {/* Sidebar */}
      <div className={`w-80 flex flex-col mx-2 my-4 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Chats</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-full hover:bg-opacity-10 ${darkMode ? 'hover:bg-white text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button className={`p-2 rounded-full hover:bg-opacity-10 ${darkMode ? 'hover:bg-white text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}>
                <Settings size={20} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-3 top-3 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-full border focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setSelectedChat(contact)}
              className={`flex items-center p-4 cursor-pointer transition-colors ${selectedChat?.id === contact.id
                ? darkMode ? 'bg-gray-700' : 'bg-blue-50'
                : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}
            >
              <div className="relative">
                <Image
                  src={contact.avatar_url || '/default-avatar.svg'}
                  alt={contact.display_name}
                  className="rounded-full object-cover"
                  width={48}
                  height={48}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/default-avatar.svg';
                  }}
                />
                {contact.status === 'online' && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>

              <div className="flex-1 ml-3 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {contact.display_name}
                  </h3>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {contact.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                </div>
                {contact.lastMessage ? (
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {contact.lastMessage}
                    </p>
                    {contact.lastMessageTime && (
                      <span className={`text-xs ml-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {formatMessageTime(contact.lastMessageTime)}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    No messages yet
                  </p>
                )}
                {(contact.unreadCount || 0) > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {contact.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1  rounded-b-2xl flex flex-col mx-2 shadow-lg my-4`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className={`p-4 border-b rounded-t-2xl flex items-center justify-between bg-white border-gray-200`}>
              <div className="flex items-center">
                <Image
                  src={selectedChat.avatar_url || '/default-avatar.svg'}
                  alt={selectedChat.display_name}
                  className="rounded-full object-cover"
                  width={40}
                  height={40}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/default-avatar.svg';
                  }}
                />
                <div className="ml-3">
                  <h2 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedChat.display_name}
                  </h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {selectedChat.status === 'online' ? 'Active now' : 'Last seen recently'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className={`p-2 rounded-full hover:bg-opacity-10 ${darkMode ? 'hover:bg-white text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}>
                  <Phone size={20} />
                </button>
                <button className={`p-2 rounded-full hover:bg-opacity-10 ${darkMode ? 'hover:bg-white text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}>
                  <Video size={20} />
                </button>
                <button className={`p-2 rounded-full hover:bg-opacity-10 ${darkMode ? 'hover:bg-white text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}>
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(messages[selectedChat.id] || []).map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${msg.sender_id === currentUser?.id
                      ? 'bg-blue-500 text-white'
                      : darkMode
                        ? 'bg-gray-700 text-white'
                        : 'bg-white text-gray-900 shadow-sm'
                      }`}
                  >
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.sender_id === currentUser?.id
                      ? 'text-blue-100'
                      : darkMode
                        ? 'text-gray-400'
                        : 'text-gray-500'
                      }`}>
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className={`p-4 rounded-b-2xl border-t bg-white `}>
              <div className="flex items-center gap-2">
                <button className={`p-2 rounded-full hover:bg-opacity-10 ${darkMode ? 'hover:bg-white text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}>
                  <Paperclip size={20} />
                </button>
                <button className={`p-2 rounded-full hover:bg-opacity-10 ${darkMode ? 'hover:bg-white text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}>
                  <Camera size={20} />
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className={`w-full px-4 py-2 rounded-full border focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                  />
                </div>

                <button className={`p-2 rounded-full hover:bg-opacity-10 ${darkMode ? 'hover:bg-white text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`}>
                  <Smile size={20} />
                </button>

                <button
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  className={`p-2 rounded-full ${message.trim()
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : darkMode
                      ? 'text-gray-500'
                      : 'text-gray-400'
                    }`}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={`flex-1 flex items-center justify-center text-gray-500 bg-white`}>
            <div className="text-center">
              <MessageCircle size={64} className="mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-medium mb-2">Welcome to Messenger</h2>
              <p>Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>

      <div className={`w-80 flex mx-2 my-4 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className='mt-4 text-center flex flex-col mx-auto items-center gap-2'>
          {selectedChat ? (
            <>
              <Image
                alt={selectedChat.display_name}
                src={selectedChat.avatar_url || '/default-avatar.svg'}
                height={80}
                width={80}
                className='rounded-full object-cover'
                onError={(e) => {
                  // Fallback to default avatar if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = '/default-avatar.svg';
                }}
              />
              <div className='space-y-1'>
                <h3 className='text-blue-600'>{selectedChat.display_name}</h3>
                <p className='text-sm text-muted-foreground'>@{selectedChat.username || 'user'}</p>
                <p className='text-sm'>
                  {selectedChat.status === 'online' ? 'Active now' : 'Last seen recently'}
                </p>
                {selectedChat.lastMessage && (
                  <div className='mt-2 p-2 bg-gray-50 rounded-lg'>
                    <p className='text-xs text-gray-600 font-medium'>Last message:</p>
                    <p className='text-sm text-gray-800 truncate'>{selectedChat.lastMessage}</p>
                    {selectedChat.lastMessageTime && (
                      <p className='text-xs text-gray-500 mt-1'>
                        {formatMessageTime(selectedChat.lastMessageTime)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className='w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center'>
                <MessageCircle size={32} className='text-gray-400' />
              </div>
              <div className='space-y-1'>
                <h3 className='text-gray-600'>No chat selected</h3>
                <p className='text-sm text-muted-foreground'>Select a conversation to view details</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessengerApp;