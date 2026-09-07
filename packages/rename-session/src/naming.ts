/**
 * Pure naming logic: exchange extraction, secret redaction, title normalization.
 * No imports from the pi host so it runs under plain `node --test`.
 */

// Structural subset of the pi session-entry / message shapes, so this module
// stays import-free. Assigned values come from ctx.sessionManager.getBranch().
export interface ContentPart {
	type: string;
	text?: string;
	[key: string]: unknown;
}

export interface HistoryMessage {
	role: string;
	content: string | ContentPart[];
}

export interface HistoryEntry {
	type: string;
	message?: HistoryMessage;
	// Custom / non-message entries in the branch are structurally tolerated.
	data?: unknown;
	[key: string]: unknown;
}

export interface Exchange {
	user: string;
	assistant: string;
}

/** Longest user prompt (in chars) sent to the naming model. */
export const MAX_USER_CHARS = 1000;
/** Longest assistant reply prefix (in chars) sent to the naming model. */
export const MAX_ASSISTANT_CHARS = 800;
function messageText(message: HistoryMessage): string {
	if (typeof message.content === "string") {
		return message.content.trim();
	}
	return message.content
		.filter((part): part is ContentPart & { text: string } => part.type === "text" && typeof part.text === "string")
		.map((part) => part.text)
		.join("\n")
		.trim();
}

/**
 * First user message of the branch plus the text of every assistant message
 * that follows it (until the next user message). Tool parts and non-message
 * entries are ignored by construction. Returns undefined when the first
 * exchange carries no extractable text.
 */
export function extractFirstExchange(branch: HistoryEntry[]): Exchange | undefined {
	let user = "";
	let assistant = "";
	let seenUser = false;

	for (const entry of branch) {
		if (entry.type !== "message" || !entry.message) continue;
		const { role } = entry.message;
		if (role === "user") {
			if (seenUser) break;
			seenUser = true;
			user = messageText(entry.message);
		} else if (role === "assistant" && seenUser) {
			assistant += (assistant ? "\n" : "") + messageText(entry.message);
		}
	}

	if (!seenUser || (!user && !assistant)) return undefined;
	return { user, assistant: assistant.trim() };
}

const SECRET_PATTERNS: RegExp[] = [
	// Private key blocks.
	/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
	// Bearer / basic credentials.
	/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
	/\bBasic\s+[A-Za-z0-9+/=]{16,}/gi,
	// OpenAI / Anthropic / generic sk- style keys.
	/\bsk-[A-Za-z0-9_-]{12,}/g,
	// GitHub fine-grained / classic tokens.
	/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/g,
	// AWS access key id (AKIA...) and secret access key material.
	/\bAKIA[0-9A-Z]{16}\b/g,
	// Google API key shape.
	/\bAIza[0-9A-Za-z_-]{20,}\b/g,
	// env-style assignments of secret-ish names.
	/\b([A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY|ACCESS_KEY))\b\s*[:=]\s*["']?[^\s"']+/g,
];

/**
 * Best-effort secret redaction. Never rely on this as the only protection for
 * anything sensitive; it exists to keep obvious credentials out of the prompt
 * sent to the naming model.
 */
export function redactSecrets(text: string): string {
	let out = text;
	for (const pattern of SECRET_PATTERNS) {
		pattern.lastIndex = 0;
		out = out.replace(pattern, (match, envName?: string) => {
			if (typeof envName === "string" && envName.length > 0) {
				return `${envName}=[REDACTED]`;
			}
			return "[REDACTED]";
		});
	}
	return out;
}

function stripWrapping(s: string): string {
	let out = s.trim();
	const pairs: Record<string, string> = { '"': '"', "'": "'", "`": "`", "(": ")", "[": "]", "{": "}", "「": "」", "【": "】" };
	for (let i = 0; i < 3; i++) {
		const first = out[0];
		const closer = first ? pairs[first] : undefined;
		if (closer && out.length > 1 && out.endsWith(closer)) {
			out = out.slice(1, -1).trim();
		} else {
			break;
		}
	}
	return out;
}

/**
 * Clean model output into a session title. Returns undefined when nothing
 * usable remains, in which case the session is left unchanged.
 */
export function normalizeTitle(raw: string | undefined, maxLength: number): string | undefined {
	if (!raw) return undefined;
	let s = raw.split(/\r?\n/, 1)[0].trim();
	// Leading markdown structure (heading, blockquote, list item, fence).
	s = s.replace(/^(?:#{1,6}\s+|>\s?|[-*+]\s+|```[^\n]*)/, "");
	const trimTrailing = (t: string) => t.replace(/[.!?…]+$/, "").replace(/[\s:;-]+$/, "").trim();
	// Trailing punctuation may sit inside an outer quote pair: strip both ways.
	s = trimTrailing(s);
	s = stripWrapping(s);
	s = trimTrailing(s);
	// Collapse control characters and whitespace runs.
	s = s.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
	if (s.length > maxLength) {
		const cut = s.slice(0, maxLength);
		const lastSpace = cut.lastIndexOf(" ");
		s = (lastSpace > maxLength * 0.5 ? cut.slice(0, lastSpace) : cut).trim();
	}
	if (!s || /^[\W_]+$/.test(s)) return undefined;
	return s;
}

/** Truncate to the character budget on a word boundary when possible. */
export function truncateForPrompt(text: string, maxChars: number): string {
	if (text.length <= maxChars) return text;
	const cut = text.slice(0, maxChars);
	const lastSpace = cut.lastIndexOf(" ");
	return (lastSpace > maxChars * 0.5 ? cut.slice(0, lastSpace) : cut).trim();
}

/** Prompt for the naming model. Redaction and truncation happen here. */
export function buildTitlePrompt(exchange: Exchange): { system: string; body: string } {
	const system = `You generate concise session titles for a coding agent. Reply with only a short title that is one concise sentence, at most a few words long. No quotes, no trailing punctuation, no explanation.`;
	const body = [
		"Name this new coding session from its first exchange.",
		"",
		`User: ${truncateForPrompt(redactSecrets(exchange.user), MAX_USER_CHARS)}`,
		exchange.assistant
			? `Assistant: ${truncateForPrompt(redactSecrets(exchange.assistant), MAX_ASSISTANT_CHARS)}`
			: "",
		"",
		"Reply with only the title.",
	]
		.filter((line) => line !== "")
		.join("\n");
	return { system, body };
}
