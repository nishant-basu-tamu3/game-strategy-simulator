<template>
  <div class="home">
    <h1 class="title">Game Strategy Simulator</h1>

    <div class="games-container">
      <div v-if="loading" class="loading">Loading games...</div>
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      <div v-else class="games-grid">
        <div
          v-for="game in games"
          :key="game._id"
          class="game-card"
          @click="selectGame(game)"
        >
          <img :src="game.iconUrl" :alt="game.name" class="game-icon" />
          <h2 class="game-title">{{ game.name }}</h2>
          <p class="game-description">{{ game.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { gameService } from "@/services/api";
import type { Game } from "@/types";

export default defineComponent({
  name: "HomeView",
  data() {
    return {
      games: [] as Game[],
      loading: true,
      error: null as string | null,
    };
  },
  async created() {
    try {
      this.games = await gameService.getAll();
      this.loading = false;
    } catch (err: any) {
      this.error = "Failed to load games: " + (err.message || "Unknown error");
      this.loading = false;
    }
  },
  methods: {
    selectGame(game: Game) {
      this.$router.push({ name: "game", params: { id: game._id } });
    },
  },
});
</script>

<style scoped>
.home {
  padding: 20px;
}

.title {
  text-align: center;
  margin-bottom: 30px;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.game-card {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;
}

.game-card:hover {
  transform: translateY(-5px);
}

.game-icon {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 15px;
}

.game-title {
  margin-bottom: 10px;
}

.game-description {
  color: #6c757d;
}

.loading,
.error {
  text-align: center;
  padding: 20px;
}

.error {
  color: #dc3545;
}
</style>
