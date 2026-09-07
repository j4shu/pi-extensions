/**
 * Optional per-user config: <agent-dir>/pi-rename-session.json.
 * Only `enabled` is configurable; everything else is fixed.
 * Missing/invalid file -> defaults. No project-level override.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Config {
	/** Auto-naming on/off. Manual /rename-session always works. */
	enabled: boolean;
	/** Optional "provider/id" override for the naming model. Absent -> session model. */
	model?: string;
}

export const DEFAULT_CONFIG: Config = {
	enabled: true,
};

export const CONFIG_FILE_NAME = "pi-rename-session.json";

/** Fixed title length cap, not configurable. */
export const TITLE_MAX_LENGTH = 48;
/** Fixed model-call timeout, not configurable. */
export const REQUEST_TIMEOUT_MS = 10_000;

function readRaw(agentDir: string): Record<string, unknown> | undefined {
	try {
		const raw: unknown = JSON.parse(readFileSync(join(agentDir, CONFIG_FILE_NAME), "utf8"));
		return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : undefined;
	} catch {
		return undefined;
	}
}

export function loadConfig(agentDir: string): Config {
	const raw = readRaw(agentDir);
	if (!raw) return { ...DEFAULT_CONFIG };
	const model = typeof raw.model === "string" && raw.model.trim() !== "" ? raw.model.trim() : undefined;
	return {
		enabled: typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_CONFIG.enabled,
		...(model !== undefined ? { model } : {}),
	};
}

/** Persist the togglable field plus any model override. Throws when the agent dir is not writable. */
export function saveConfig(agentDir: string, config: Config): void {
	const body = JSON.stringify(
		{
			enabled: config.enabled,
			...(config.model !== undefined ? { model: config.model } : {}),
		},
		null,
		2,
	);
	writeFileSync(join(agentDir, CONFIG_FILE_NAME), `${body}\n`);
}
