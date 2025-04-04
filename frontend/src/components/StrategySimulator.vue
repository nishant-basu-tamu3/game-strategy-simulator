<template>
  <div class="simulator-container">
    <h3>Strategy Simulator</h3>

    <div class="simulator-setup">
      <div class="simulator-section">
        <h4>Army Composition</h4>
        <div class="entity-selection">
          <div
            v-for="category in ['Troop', 'Spell', 'Hero']"
            :key="category"
            class="category-section"
          >
            <h5>{{ category }}s</h5>
            <div class="entity-chips">
              <div
                v-for="entity in availableEntities.filter(
                  (e) => e.type === category
                )"
                :key="entity._id"
                class="entity-chip"
                :class="{ selected: isEntitySelected(entity) }"
                @click="toggleEntity(entity)"
              >
                {{ cleanEntityName(entity.name) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="simulator-section">
        <h4>Target Base</h4>
        <select v-model="targetBaseLevel" class="base-select">
          <option v-for="level in 15" :key="level" :value="level">
            Town Hall {{ level }}
          </option>
        </select>

        <div class="base-defense-options">
          <h5>Key Defenses</h5>
          <div class="defense-chips">
            <div
              v-for="defense in availableDefenses"
              :key="defense._id"
              class="defense-chip"
              :class="{ selected: isDefenseSelected(defense) }"
              @click="toggleDefense(defense)"
            >
              {{ cleanEntityName(defense.name) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <button
      class="simulate-button"
      :disabled="isSimulating"
      @click="runSimulation"
    >
      {{ isSimulating ? "Simulating..." : "Run Simulation" }}
    </button>

    <div v-if="simulationResult" class="simulation-result">
      <h4>Simulation Results</h4>
      <div
        class="result-summary"
        :class="{ success: simulationResult.success }"
      >
        <span class="result-icon">{{
          simulationResult.success ? "✓" : "✗"
        }}</span>
        <span class="result-text">{{
          simulationResult.success ? "Success" : "Defeat"
        }}</span>
        <span class="result-percentage"
          >{{ simulationResult.successRate }}% Success Rate</span
        >
      </div>

      <div class="result-details">
        <h5>Battle Details</h5>
        <p>{{ simulationResult.description }}</p>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">Destruction</div>
            <div class="stat-value">{{ simulationResult.destruction }}%</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Stars</div>
            <div class="stat-value">{{ simulationResult.stars }}/3</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Time</div>
            <div class="stat-value">{{ simulationResult.time }}s</div>
          </div>
        </div>

        <h5>Recommendations</h5>
        <ul class="recommendations">
          <li
            v-for="(rec, index) in simulationResult.recommendations"
            :key="index"
          >
            {{ rec }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { gameEntityService } from "@/services/api";
import type { GameEntity } from "@/types";
import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.VUE_APP_GROQ_API_KEY || "",
  dangerouslyAllowBrowser: true, // Set to true for browser usage
});

interface SimulationData {
  troops: string[];
  spells: string[];
  heroes: string[];
  defenses: string[];
  townHallLevel: number;
  success: boolean;
  successRate: number;
  destruction: number;
  stars: number;
  time: number;
}

interface SimulationResult {
  success: boolean;
  successRate: number;
  destruction: number;
  stars: number;
  time: number;
  description: string;
  recommendations: string[];
}

interface AiAnalysisResult {
  description: string;
  recommendations: string[];
}

export default defineComponent({
  name: "StrategySimulator",
  props: {
    gameId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      availableEntities: [] as GameEntity[],
      availableDefenses: [] as GameEntity[],
      selectedEntities: [] as GameEntity[],
      selectedDefenses: [] as GameEntity[],
      targetBaseLevel: 10,
      simulationResult: null as SimulationResult | null,
      isSimulating: false,
    };
  },
  async created() {
    try {
      // Load troops and spells
      const troops = await gameEntityService.getByType(this.gameId, "Troop");

      // Add spells and heroes
      const spells = await gameEntityService.getByType(this.gameId, "Spell");
      const heroes = await gameEntityService.getByType(this.gameId, "Hero");

      this.availableEntities = [...troops, ...spells, ...heroes];

      // Load defenses (buildings)
      this.availableDefenses = await gameEntityService.getByType(
        this.gameId,
        "Building"
      );

      // Filter to keep only defensive buildings
      this.availableDefenses = this.availableDefenses.filter(
        (b) =>
          b.name.includes("Tower") ||
          b.name.includes("Cannon") ||
          b.name.includes("Defense") ||
          b.name.includes("Tesla") ||
          b.name.includes("Inferno") ||
          b.name.includes("Xbow")
      );
    } catch (error) {
      console.error("Error loading entities:", error);
    }
  },
  methods: {
    cleanEntityName(name: string): string {
      // Remove "/Builder Base", "/Home Village", etc. suffixes
      return name.split("/")[0].trim();
    },

    isEntitySelected(entity: GameEntity): boolean {
      return this.selectedEntities.some((e) => e._id === entity._id);
    },

    isDefenseSelected(defense: GameEntity): boolean {
      return this.selectedDefenses.some((d) => d._id === defense._id);
    },

    toggleEntity(entity: GameEntity): void {
      if (this.isEntitySelected(entity)) {
        this.selectedEntities = this.selectedEntities.filter(
          (e) => e._id !== entity._id
        );
      } else {
        this.selectedEntities.push(entity);
      }
    },

    toggleDefense(defense: GameEntity): void {
      if (this.isDefenseSelected(defense)) {
        this.selectedDefenses = this.selectedDefenses.filter(
          (d) => d._id !== defense._id
        );
      } else {
        this.selectedDefenses.push(defense);
      }
    },

    async runSimulation(): Promise<void> {
      if (this.isSimulating) return;
      this.isSimulating = true;

      try {
        // Basic simulation logic - would be replaced with real simulation rules
        const troopStrength = this.selectedEntities.length * 15;
        const defenseStrength =
          this.selectedDefenses.length * 10 + this.targetBaseLevel * 5;

        const successRate = Math.min(
          85,
          Math.max(
            5,
            Math.round((troopStrength / (defenseStrength + 10)) * 100)
          )
        );

        const success = Math.random() * 100 < successRate;

        const destruction = Math.min(
          100,
          Math.max(
            5,
            Math.round((troopStrength / defenseStrength) * 100) +
              Math.floor(Math.random() * 20) -
              10
          )
        );

        let stars = 0;
        if (destruction > 50) stars++;
        if (destruction > 80) stars++;
        if (destruction === 100) stars++;

        const time = Math.min(
          180,
          Math.max(
            30,
            Math.round(
              180 - (destruction / 100) * 120 + Math.floor(Math.random() * 30)
            )
          )
        );

        // Generate AI analysis using LLM
        const simulationData: SimulationData = {
          troops: this.selectedEntities
            .filter((e) => e.type === "Troop")
            .map((e) => this.cleanEntityName(e.name)),
          spells: this.selectedEntities
            .filter((e) => e.type === "Spell")
            .map((e) => this.cleanEntityName(e.name)),
          heroes: this.selectedEntities
            .filter((e) => e.type === "Hero")
            .map((e) => this.cleanEntityName(e.name)),
          defenses: this.selectedDefenses.map((d) =>
            this.cleanEntityName(d.name)
          ),
          townHallLevel: this.targetBaseLevel,
          success,
          successRate,
          destruction,
          stars,
          time,
        };

        const aiAnalysis = await this.generateAIAnalysis(simulationData);

        // Set simulation result
        this.simulationResult = {
          success,
          successRate,
          destruction,
          stars,
          time,
          description: aiAnalysis.description,
          recommendations: aiAnalysis.recommendations,
        };
      } catch (error) {
        console.error("Simulation error:", error);
      } finally {
        this.isSimulating = false;
      }
    },

    async generateAIAnalysis(
      simulationData: SimulationData
    ): Promise<AiAnalysisResult> {
      try {
        // Format data for LLM
        const prompt = `
As a Clash of Clans strategy expert, analyze this attack simulation and provide strategic insights:

Army Composition:
- Troops: ${simulationData.troops.join(", ") || "None"}
- Spells: ${simulationData.spells.join(", ") || "None"}
- Heroes: ${simulationData.heroes.join(", ") || "None"}

Target Base:
- Town Hall Level: ${simulationData.townHallLevel}
- Key Defenses: ${simulationData.defenses.join(", ") || "Standard defenses"}

Simulation Results:
- Success: ${simulationData.success ? "Yes" : "No"}
- Destruction: ${simulationData.destruction}%
- Stars: ${simulationData.stars}/3
- Attack Time: ${simulationData.time} seconds

Please provide:
1. A brief battle description (2-3 sentences)
2. 3-4 strategic recommendations to improve results
`;

        // Call Groq API
        const response = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "You are a Clash of Clans strategy expert providing battle analysis and recommendations.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
          max_tokens: 500,
        });

        // Add null check with default empty string
        const analysisText = response.choices[0]?.message.content || "";

        // Parse LLM response
        const sections = analysisText.split("\n\n");
        let description = "";
        let recommendations: string[] = [];

        // Extract description and recommendations
        for (const section of sections) {
          if (
            section.toLowerCase().includes("description") ||
            section.indexOf("\n") === -1
          ) {
            description = section.replace(/^.*?description:?\s*/i, "");
          } else if (
            section.toLowerCase().includes("recommendation") ||
            section.toLowerCase().includes("improve")
          ) {
            const lines = section.split("\n").filter((line) => line.trim());
            // eslint-disable-next-line no-useless-escape
            recommendations = lines.map((line) =>
              line.replace(/^[\d.\-*]+\s*/, "").trim()
            );
          }
        }

        return {
          description:
            description || this.generateBattleDescription(simulationData),
          recommendations:
            recommendations.length > 0
              ? recommendations
              : this.generateFallbackRecommendations(simulationData),
        };
      } catch (error) {
        console.error("Error generating AI analysis:", error);

        // Fallback to basic description if API call fails
        return {
          description: this.generateBattleDescription(simulationData),
          recommendations: this.generateFallbackRecommendations(simulationData),
        };
      }
    },

    generateBattleDescription(simData: SimulationData): string {
      const entityNames = this.selectedEntities
        .map((e) => this.cleanEntityName(e.name))
        .slice(0, 3)
        .join(", ");
      const defenseNames = this.selectedDefenses
        .map((d) => this.cleanEntityName(d.name))
        .slice(0, 3)
        .join(", ");

      if (simData.success) {
        return `Your army of ${entityNames} performed well against the Town Hall ${simData.townHallLevel} base with ${defenseNames}. The attack achieved ${simData.destruction}% destruction and earned ${simData.stars} stars, indicating a successful raid.`;
      } else {
        return `Your army of ${entityNames} struggled against the Town Hall ${simData.townHallLevel} base with ${defenseNames}. The attack only achieved ${simData.destruction}% destruction and earned ${simData.stars} stars, indicating that adjustments are needed.`;
      }
    },

    generateFallbackRecommendations(simData: SimulationData): string[] {
      const recommendations: string[] = [];

      if (simData.successRate < 50) {
        recommendations.push(
          "Consider adding more troops for a stronger attack force"
        );
        recommendations.push(
          "This base layout is challenging for your current army composition"
        );
      }

      if (
        this.selectedEntities.filter((e) => e.type === "Spell").length === 0
      ) {
        recommendations.push(
          "Adding spells would significantly improve your chances"
        );
      }

      if (simData.stars < 2) {
        recommendations.push(
          "Focus on taking out key defenses early for better results"
        );
      }

      if (simData.time > 150) {
        recommendations.push(
          "Your attack is slow - consider adding more damage-focused troops"
        );
      }

      return recommendations;
    },
  },
});
</script>

<style scoped>
.simulator-container {
  padding: 20px;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.simulator-setup {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.simulator-section {
  flex: 1;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.entity-selection,
.base-defense-options {
  margin-top: 15px;
}

.category-section {
  margin-bottom: 15px;
}

.entity-chips,
.defense-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.entity-chip,
.defense-chip {
  padding: 6px 12px;
  border-radius: 16px;
  background-color: #f0f0f0;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.entity-chip.selected,
.defense-chip.selected {
  background-color: #007bff;
  color: white;
}

.base-select {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
  margin-bottom: 15px;
}

.simulate-button {
  padding: 10px 20px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin-bottom: 20px;
  width: 100%;
}

.simulate-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.simulation-result {
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.result-summary {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 4px;
  background-color: #dc3545;
  color: white;
  margin-bottom: 15px;
}

.result-summary.success {
  background-color: #28a745;
}

.result-icon {
  font-size: 20px;
  margin-right: 10px;
}

.result-text {
  font-weight: bold;
  margin-right: auto;
}

.result-percentage {
  font-size: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin: 15px 0;
}

.stat-item {
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
  text-align: center;
}

.stat-label {
  font-size: 14px;
  color: #6c757d;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  margin-top: 5px;
}

.recommendations {
  padding-left: 20px;
}

.recommendations li {
  margin-bottom: 8px;
}
</style>
