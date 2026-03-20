import { APIError } from "../errors.js";
import type {
  SocialCampaign,
  SocialQuest,
  SocialCompetition,
  LeaderboardEntry,
  ShareCard,
  CampaignCreateParams,
  QuestCreateParams,
  CompetitionCreateParams,
} from "./types.js";

export interface SocialClientConfig {
  venueId: string;
  venueApiKey: string;
  environment: "production" | "staging";
}

/**
 * Wraps the Orderly Social API (api.orderly.social).
 * In production, auth is handled by @orderly-social/sdk-core JWT flow.
 * This client provides typed methods for the agent to use.
 */
export class SocialClient {
  private config: SocialClientConfig;
  private sdk: unknown = null;

  constructor(config: SocialClientConfig) {
    this.config = config;
  }

  /**
   * Initialize the social client — must be called before any other method.
   * Performs JWT authentication via the Social SDK.
   */
  async initialize(): Promise<void> {
    try {
      // Dynamic import to avoid hard dependency if not installed
      const sdkModule = "@orderly-social/sdk-core";
      const mod = await import(/* webpackIgnore: true */ sdkModule) as {
        OrderlySocialClient: new (opts: unknown) => {
          initializeVenue(): Promise<void>;
          quest: SocialQuests;
          campaign: SocialCampaigns;
          competition: SocialCompetitions;
          leaderboard: SocialLeaderboard;
          share: SocialShare;
        };
      };
      const { OrderlySocialClient } = mod;

      this.sdk = new OrderlySocialClient({
        venueId: this.config.venueId,
        venueApiKey: this.config.venueApiKey,
        environment: this.config.environment,
        features: {
          leaderboards: true,
          quests: true,
          campaigns: true,
          teams: true,
          competitions: true,
          sharing: true,
        },
      });

      await (this.sdk as { initializeVenue(): Promise<void> }).initializeVenue();
    } catch (err) {
      throw new APIError(
        `Social SDK init failed: ${err instanceof Error ? err.message : String(err)}`,
        0,
        "collect"
      );
    }
  }

  private getSdk(): {
    quest: SocialQuests;
    campaign: SocialCampaigns;
    competition: SocialCompetitions;
    leaderboard: SocialLeaderboard;
    share: SocialShare;
  } {
    if (!this.sdk) {
      throw new APIError("Social client not initialized — call initialize() first", 0, "collect");
    }
    return this.sdk as {
      quest: SocialQuests;
      campaign: SocialCampaigns;
      competition: SocialCompetitions;
      leaderboard: SocialLeaderboard;
      share: SocialShare;
    };
  }

  // ── Quests ──

  async listQuests(activeOnly = true): Promise<SocialQuest[]> {
    return this.getSdk().quest.list({ activeOnly });
  }

  async createQuest(params: QuestCreateParams): Promise<SocialQuest> {
    return this.getSdk().quest.create(params);
  }

  // ── Campaigns ──

  async listCampaigns(): Promise<SocialCampaign[]> {
    return this.getSdk().campaign.list();
  }

  async getCampaign(id: string): Promise<SocialCampaign> {
    return this.getSdk().campaign.get(id);
  }

  async createCampaign(params: CampaignCreateParams): Promise<SocialCampaign> {
    return this.getSdk().campaign.create(params);
  }

  // ── Competitions ──

  async listCompetitions(): Promise<SocialCompetition[]> {
    return this.getSdk().competition.list();
  }

  async createCompetition(params: CompetitionCreateParams): Promise<SocialCompetition> {
    return this.getSdk().competition.create(params);
  }

}

// ── Internal SDK type interfaces (matches @orderly-social/sdk-core) ──

interface SocialQuests {
  list(opts: { activeOnly: boolean }): Promise<SocialQuest[]>;
  create(params: QuestCreateParams): Promise<SocialQuest>;
}

interface SocialCampaigns {
  list(): Promise<SocialCampaign[]>;
  get(id: string): Promise<SocialCampaign>;
  create(params: CampaignCreateParams): Promise<SocialCampaign>;
  progress(id: string): Promise<unknown>;
}

interface SocialCompetitions {
  list(): Promise<SocialCompetition[]>;
  getLeaderboard(id: string): Promise<LeaderboardEntry[]>;
  create(params: CompetitionCreateParams): Promise<SocialCompetition>;
}

interface SocialLeaderboard {
  get(opts: Record<string, unknown>): Promise<LeaderboardEntry[]>;
}

interface SocialShare {
  createCard(opts: { type: string; data: Record<string, unknown> }): Promise<ShareCard>;
}
