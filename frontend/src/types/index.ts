export type UUID = string;

export interface User {
  id: UUID;
  username: string;
  email: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  statusMessage?: string;
  isOnline: boolean;
  lastSeenAt?: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
}

export type ConversationType = 'DIRECT' | 'GROUP';
export type ConversationRole = 'ADMIN' | 'MEMBER';

export interface ConversationMember {
  id: UUID;
  user: User;
  role: ConversationRole;
  joinedAt: string;
}

export interface Conversation {
  id: UUID;
  type: ConversationType;
  title?: string;
  avatarUrl?: string;
  createdBy?: User;
  members: ConversationMember[];
  lastMessage?: Message;
  createdAt: string;
  updatedAt: string;
}

export type MessageType = 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'VIDEO';
export type MessageStatusType = 'SENT' | 'DELIVERED' | 'READ';

export interface Message {
  id: UUID;
  conversationId: UUID;
  sender: User;
  replyToMessageId?: UUID;
  content: string;
  type: MessageType;
  isEdited: boolean;
  isDeleted: boolean;
  status?: MessageStatusType;
  createdAt: string;
  updatedAt: string;
}

export interface StompSendMessagePayload {
  conversationId: UUID;
  content: string;
  type?: MessageType;
  replyToMessageId?: UUID;
  tempId: string;
}

export interface StompAckPayload {
  tempId?: string;
  messageId: UUID;
  conversationId: UUID;
  status: MessageStatusType;
  timestamp: string;
}

export interface StompTypingEvent {
  userId: UUID;
  username: string;
  isTyping: boolean;
}

export interface PresenceEvent {
  userId: UUID;
  username: string;
  isOnline: boolean;
  lastSeenAt?: string;
}

export type CallType = 'AUDIO' | 'VIDEO';
export type CallStatus = 'INITIATING' | 'RINGING' | 'ACCEPTED' | 'CONNECTING' | 'CONNECTED' | 'REJECTED' | 'ENDED' | 'MISSED' | 'FAILED';

export interface Call {
  id: UUID;
  caller: User;
  receiver: User;
  conversationId?: UUID;
  type: CallType;
  status: CallStatus;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
}

export interface SignalingMessage {
  callId: UUID;
  targetUserId: UUID;
  type: 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE' | 'RINGING' | 'ACCEPT' | 'REJECT' | 'END';
  data: any;
}
