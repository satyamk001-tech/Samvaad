export type UUID = string;

export interface User {
  id: UUID;
  username: string;
  email: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  statusMessage?: string;
  languagePreference?: string;
  emailVerified?: boolean;
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
  isPinned?: boolean;
  pinOrder?: number;
  disappearingSeconds?: number | null;
  folderTag?: 'ALL' | 'PERSONAL' | 'WORK' | 'GROUPS' | 'UNREAD';
  createdAt: string;
  updatedAt: string;
}

export type MessageType = 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'VIDEO' | 'VOICE_NOTE';
export type MessageStatusType = 'SENT' | 'DELIVERED' | 'READ';

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // usernames or userIds
}

export interface Message {
  id: UUID;
  conversationId: UUID;
  sender: User;
  replyToMessageId?: UUID;
  replyToSnippet?: string;
  content: string;
  type: MessageType;
  isEdited: boolean;
  isDeleted: boolean;
  status?: MessageStatusType;
  reactions?: MessageReaction[];
  isViewOnce?: boolean;
  viewedAt?: string | null;
  isForwarded?: boolean;
  forwardedFrom?: string | null;
  isStarred?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StompSendMessagePayload {
  conversationId: UUID;
  content: string;
  type?: MessageType;
  replyToMessageId?: UUID;
  isViewOnce?: boolean;
  isForwarded?: boolean;
  forwardedFromId?: UUID;
  tempId: string;
}

export interface VaultDocument {
  id: string;
  docType: 'AADHAAR' | 'PAN' | 'DRIVING_LICENSE' | 'DEGREE' | 'OTHER';
  docNumberMasked: string;
  docTitle: string;
  issuer: string;
  isVerified: boolean;
  verifiedAt: string;
  secureHash: string;
}

export interface CallRoom {
  id: string;
  roomCode: string;
  hostUserId: string;
  status: string;
  expiresAt: string;
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
