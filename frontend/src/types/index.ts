// frontend/src/types/index.ts
export interface Game {
  _id: string;
  name: string;
  description: string;
  wikiBaseUrl: string;
  categoryPaths: string[];
  iconUrl?: string;
}

export interface GameEntity {
  _id: string;
  gameId: string;
  name: string;
  type: string;
  description: string;
  wikiUrl: string;
  properties: Record<string, string>;
  content?: string;
  scrapedAt: string;
}

export interface Strategy {
  _id: string;
  gameId: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  requirements?: Record<string, any>;
  source: string;
  scrapedAt: string;
}

export interface ChatMessage {
  _id?: string;
  conversationId: string;
  message: string;
  isFromUser: boolean;
  timestamp: string;
}

export interface Conversation {
  _id: string;
  userId: string;
  gameId: string;
  startedAt: string;
  lastActivity: string;
  messages: ChatMessage[];
}
