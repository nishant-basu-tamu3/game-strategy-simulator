// frontend/src/services/api.ts
import axios from "axios";
import type {
  Game,
  GameEntity,
  Strategy,
  ChatMessage,
  Conversation,
} from "@/types";

const API_URL = process.env.VUE_APP_API_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const gameService = {
  async getAll(): Promise<Game[]> {
    const response = await apiClient.get("/games");
    return response.data;
  },

  async getById(id: string): Promise<Game> {
    const response = await apiClient.get(`/games/${id}`);
    return response.data;
  },
};

export const gameEntityService = {
  async getAllByGame(gameId: string): Promise<GameEntity[]> {
    const response = await apiClient.get(`/games/${gameId}/entities`);
    return response.data;
  },

  async getByType(gameId: string, type: string): Promise<GameEntity[]> {
    const response = await apiClient.get(
      `/games/${gameId}/entities?type=${type}`
    );
    return response.data;
  },

  async search(gameId: string, query: string): Promise<GameEntity[]> {
    const response = await apiClient.get(
      `/games/${gameId}/entities/search?q=${query}`
    );
    return response.data;
  },
};

export const strategyService = {
  async getAllByGame(gameId: string): Promise<Strategy[]> {
    const response = await apiClient.get(`/games/${gameId}/strategies`);
    return response.data;
  },

  async getById(id: string): Promise<Strategy> {
    const response = await apiClient.get(`/strategies/${id}`);
    return response.data;
  },

  async search(gameId: string, query: string): Promise<Strategy[]> {
    const response = await apiClient.get(
      `/games/${gameId}/strategies/search?q=${query}`
    );
    return response.data;
  },
};

export const chatService = {
  async getConversations(gameId: string): Promise<Conversation[]> {
    const response = await apiClient.get(`/conversations/game/${gameId}`);
    return response.data;
  },

  async getConversation(id: string): Promise<Conversation> {
    const response = await apiClient.get(`/conversations/${id}`);
    return response.data;
  },

  async createConversation(gameId: string): Promise<Conversation> {
    const response = await apiClient.post("/conversations", { gameId });
    return response.data;
  },

  async sendMessage(
    conversationId: string,
    message: string
  ): Promise<{ userMessage: ChatMessage; responseMessage: ChatMessage }> {
    const response = await apiClient.post(
      `/conversations/${conversationId}/messages`,
      { message }
    );
    return response.data;
  },
};
