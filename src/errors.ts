export class GrowthAgentError extends Error {
  readonly phase: string;
  readonly code: string;
  readonly suggestion?: string;

  constructor(message: string, phase: string, code: string, suggestion?: string) {
    super(message);
    this.name = "GrowthAgentError";
    this.phase = phase;
    this.code = code;
    this.suggestion = suggestion;
  }
}

export class APIError extends GrowthAgentError {
  readonly statusCode: number;

  constructor(message: string, statusCode: number, phase: string = "api") {
    super(message, phase, "API_ERROR", `HTTP ${statusCode} — check credentials and network`);
    this.name = "APIError";
    this.statusCode = statusCode;
  }
}

export class ConfigError extends GrowthAgentError {
  constructor(message: string) {
    super(message, "config", "CONFIG_ERROR", "Check ~/.orderly/growth-agent/config.json");
    this.name = "ConfigError";
  }
}

export class StateCorruptionError extends GrowthAgentError {
  constructor(message: string) {
    super(message, "state", "STATE_CORRUPTION", "Delete ~/.orderly/growth-agent/state.json to reset");
    this.name = "StateCorruptionError";
  }
}
