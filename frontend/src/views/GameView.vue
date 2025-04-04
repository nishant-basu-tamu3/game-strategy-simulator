<template>
  <div class="game-view" v-if="game">
    <div class="game-header">
      <img :src="game.iconUrl" :alt="game.name" class="game-icon" />
      <h1>{{ game.name }}</h1>
    </div>

    <div class="tabs">
      <button
        class="tab"
        :class="{ active: activeTab === 'chat' }"
        @click="activeTab = 'chat'"
      >
        Strategy Chat
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'simulator' }"
        @click="activeTab = 'simulator'"
      >
        Strategy Simulator
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'entities' }"
        @click="activeTab = 'entities'"
      >
        Game Entities
      </button>
    </div>

    <div class="tab-content">
      <!-- Chat Tab -->
      <div v-if="activeTab === 'chat'" class="chat-container">
        <div class="chat-messages" ref="chatMessages">
          <div
            v-for="(message, index) in conversation.messages"
            :key="index"
            class="message"
            :class="{
              'user-message': message.isFromUser,
              'bot-message': !message.isFromUser,
            }"
          >
            {{ message.message }}
          </div>
        </div>
        <div class="chat-input">
          <input
            type="text"
            v-model="userMessage"
            @keyup.enter="sendMessage"
            placeholder="Ask about strategies..."
          />
          <button @click="sendMessage">Send</button>
        </div>
      </div>

      <!-- Simulator Tab -->
      <div v-if="activeTab === 'simulator'" class="simulator-container">
        <StrategySimulator :gameId="game._id" />
      </div>

      <!-- Entities Tab -->
      <div v-if="activeTab === 'entities'" class="entities-container">
        <div class="entity-categories">
          <button
            v-for="category in entityCategories"
            :key="category"
            class="category-button"
            :class="{ active: activeCategory === category }"
            @click="loadEntitiesByType(category)"
          >
            {{ category }}
          </button>
        </div>

        <div class="entity-list">
          <div v-if="loadingEntities" class="loading">Loading entities...</div>
          <div v-else-if="entities.length === 0" class="no-entities">
            No entities found
          </div>
          <div v-else class="entities-grid">
            <div
              v-for="entity in entities"
              :key="entity._id"
              class="entity-card"
              @click="selectEntity(entity)"
            >
              <h3>{{ cleanEntityName(entity.name) }}</h3>
              <p class="entity-type">{{ entity.type }}</p>
              <p class="entity-description">
                {{ formatDescription(entity.description) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Entity Details Modal -->
    <div
      v-if="selectedEntity"
      class="modal-overlay"
      @click="closeEntityDetails"
    >
      <div class="modal-content" @click.stop>
        <button class="close-button" @click="closeEntityDetails">
          &times;
        </button>
        <h2>{{ selectedEntity.name }}</h2>
        <div
          v-if="Object.keys(selectedEntity.properties || {}).length > 0"
          class="entity-properties"
        >
          <h3>Properties</h3>
          <table>
            <tr v-for="(value, key) in selectedEntity.properties" :key="key">
              <td class="property-name">{{ key }}</td>
              <td>{{ value }}</td>
            </tr>
          </table>
        </div>
        <div class="entity-content">
          <h3>Description</h3>
          <p>
            {{
              formatFullContent(
                selectedEntity.content || selectedEntity.description
              )
            }}
          </p>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="loading-container">
    <div v-if="loading">Loading game data...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { gameService, gameEntityService, chatService } from "@/services/api";
import type { Game, GameEntity, Conversation, ChatMessage } from "@/types";
import StrategySimulator from "@/components/StrategySimulator.vue";

export default defineComponent({
  name: "GameView",
  components: {
    StrategySimulator,
  },
  data() {
    return {
      game: null as Game | null,
      loading: true,
      error: null as string | null,
      activeTab: "chat",
      conversation: {
        _id: "",
        userId: "user123",
        gameId: "",
        startedAt: "",
        lastActivity: "",
        messages: [] as ChatMessage[],
      } as Conversation,
      userMessage: "",
      entityCategories: ["Troop", "Building", "Spell", "Hero"],
      activeCategory: "Troop",
      entities: [] as GameEntity[],
      loadingEntities: false,
      selectedEntity: null as GameEntity | null,
      conversationCreated: false,
    };
  },
  async created() {
    const gameId = this.$route.params.id as string;

    try {
      // Load game data
      this.game = await gameService.getById(gameId);
      this.loading = false;

      // Create a new conversation
      await this.createConversation();

      // Load initial entities
      this.loadEntitiesByType("Troop");
    } catch (err: any) {
      this.error = "Failed to load game: " + (err.message || "Unknown error");
      this.loading = false;
    }
  },
  methods: {
    async createConversation() {
      if (!this.game) return;

      try {
        console.log("Creating conversation for game:", this.game._id);
        this.conversation = await chatService.createConversation(this.game._id);
        console.log("Created conversation with ID:", this.conversation._id);
        this.conversationCreated = true;
      } catch (err: any) {
        console.error("Failed to create conversation:", err);
        this.conversationCreated = false;
      }
    },

    async sendMessage() {
      if (!this.userMessage.trim()) return;

      console.log("Current conversation state:", this.conversation);

      // Check if we have a valid conversation ID
      if (!this.conversation._id) {
        console.error(
          "No conversation ID available, trying to create a new conversation"
        );
        await this.createConversation();
        if (!this.conversation._id) {
          console.error("Still no conversation ID after creation attempt");
          return;
        }
      }

      try {
        console.log(
          "Sending message to conversation ID:",
          this.conversation._id
        );
        const messageToSend = this.userMessage;
        this.userMessage = "";

        // Add user message to UI immediately for better UX
        this.conversation.messages.push({
          _id: Date.now().toString(),
          conversationId: this.conversation._id,
          message: messageToSend,
          isFromUser: true,
          timestamp: new Date().toISOString(),
        });

        const response = await chatService.sendMessage(
          this.conversation._id,
          messageToSend
        );
        console.log("Message sent successfully, response:", response);

        // Update conversation with server response
        if (response && response.responseMessage) {
          this.conversation.messages.push(response.responseMessage);
        }

        // Scroll to bottom after messages update
        this.$nextTick(() => {
          if (this.$refs.chatMessages) {
            const element = this.$refs.chatMessages as HTMLElement;
            element.scrollTop = element.scrollHeight;
          }
        });
      } catch (err: any) {
        console.error("Failed to send message:", err);
        // Add error message in chat
        this.conversation.messages.push({
          _id: Date.now().toString(),
          conversationId: this.conversation._id,
          message:
            "Sorry, there was an error sending your message. Please try again.",
          isFromUser: false,
          timestamp: new Date().toISOString(),
        });
      }
    },

    async loadEntitiesByType(type: string) {
      if (!this.game) return;

      this.activeCategory = type;
      this.loadingEntities = true;
      this.entities = [];

      try {
        console.log(`Loading ${type} entities for game:`, this.game._id);
        this.entities = await gameEntityService.getByType(this.game._id, type);
        console.log(`Loaded ${this.entities.length} ${type} entities`);
        this.loadingEntities = false;
      } catch (err: any) {
        console.error(`Failed to load ${type} entities:`, err);
        this.loadingEntities = false;
      }
    },

    selectEntity(entity: GameEntity) {
      console.log("Selected entity:", entity);
      this.selectedEntity = entity;
    },

    closeEntityDetails() {
      this.selectedEntity = null;
    },

    cleanEntityName(name: string) {
      // Remove "/Builder Base", "/Home Village", etc. suffixes
      return name.split("/")[0].trim();
    },

    formatDescription(description: string) {
      // Remove wiki formatting and truncate
      let cleanDesc = description.replace(/\[\[.*?\]\]/g, ""); // Remove [[brackets]]
      cleanDesc = cleanDesc.replace(/File:.*?\|.*?\|link=\]\]/g, ""); // Remove file links
      cleanDesc = cleanDesc.replace(/\{\{.*?\}\}/g, ""); // Remove {{brackets}}

      // Limit to first 120 characters
      if (cleanDesc.length > 120) {
        cleanDesc = cleanDesc.substring(0, 120) + "...";
      }

      return cleanDesc;
    },

    formatFullContent(content: string) {
      // Clean up wiki formatting
      if (!content) return "";

      let cleanContent = content.replace(/\[\[.*?\]\]/g, ""); // Remove [[brackets]]
      cleanContent = cleanContent.replace(/File:.*?\|.*?\|link=\]\]/g, ""); // Remove file links
      cleanContent = cleanContent.replace(/\{\{.*?\}\}/g, ""); // Remove {{brackets}}

      // Split into paragraphs for better readability
      return cleanContent
        .split("\n")
        .filter((p) => p.trim().length > 0)
        .join("\n\n");
    },
  },
});
</script>

<style scoped>
.game-view {
  padding: 20px;
}

.game-header {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
}

.game-icon {
  width: 60px;
  height: 60px;
  margin-right: 15px;
  border-radius: 8px;
}

.tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #dee2e6;
}

.tab {
  padding: 10px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
}

.tab.active {
  border-bottom: 3px solid #007bff;
  font-weight: bold;
}

/* Chat styles */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 500px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
}

.chat-messages {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
}

.message {
  margin-bottom: 15px;
  padding: 10px 15px;
  border-radius: 10px;
  max-width: 70%;
  word-break: break-word;
}

.user-message {
  background-color: #007bff;
  color: white;
  margin-left: auto;
}

.bot-message {
  background-color: #f1f1f1;
  margin-right: auto;
}

.chat-input {
  display: flex;
  padding: 10px;
  border-top: 1px solid #dee2e6;
}

.chat-input input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  margin-right: 10px;
}

.chat-input button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* Entity styles */
.entity-categories {
  display: flex;
  overflow-x: auto;
  margin-bottom: 20px;
  padding-bottom: 10px;
}

.category-button {
  padding: 8px 16px;
  margin-right: 10px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.category-button.active {
  background-color: #007bff;
  color: white;
}

.entities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
}

.entity-card {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;
}

.entity-card:hover {
  transform: translateY(-3px);
}

.entity-card h3 {
  margin-top: 0;
  margin-bottom: 8px;
}

.entity-card p {
  margin: 0;
  color: #6c757d;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.entity-type {
  font-size: 12px;
  background-color: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 8px;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  width: 80%;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 24px;
  border: none;
  background: none;
  cursor: pointer;
}

.entity-properties {
  margin-top: 20px;
}

.entity-properties table {
  width: 100%;
  border-collapse: collapse;
}

.entity-properties td {
  padding: 8px;
  border-bottom: 1px solid #dee2e6;
}

.property-name {
  font-weight: bold;
  width: 30%;
}

.entity-content {
  margin-top: 20px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.loading,
.no-entities {
  text-align: center;
  padding: 20px;
}

.error {
  color: #dc3545;
  text-align: center;
}

.simulator-container {
  height: 500px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  overflow-y: auto;
}
</style>
