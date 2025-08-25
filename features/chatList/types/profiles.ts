export interface Profile {
  id: string;
  username?: string;
  display_name: string;
  avatar_url: string;
  status: string;
  last_seen: Date;
  created_at: Date;
  updated_at: Date;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  unreadCount?: number;
}
