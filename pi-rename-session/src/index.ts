/**
 * Auto-name a new pi session once, after its first completed exchange, from
 * the current session model. Manual `/rename-session` regenerates the same way.
 */
import type {
	ExtensionAPI,
	ExtensionContext,
	SessionShutdownEvent,
	SessionStartEvent,
} from "@earendil-works/pi-coding-agent";
import {
	buildTitlePrompt,
	extractFirstExchange,
	normalizeTitle,
	type Exchange,
	type HistoryEntry,
} from "./naming.ts";

/** Fixed title length cap. */
const TITLE_MAX_LENGTH = 48;
/** Fixed model-call timeout. */
const REQUEST_TIMEOUT_MS = 10_000;
const TITLE_MAX_TOKENS = 64;

interface NamingState {
	/** This session may be auto-named (fresh conversation, unnamed). */
	armed: boolean;
	/** Auto-naming attempted at least once for this session. */
	attempted: boolean;
	/** Auto-naming landed a name for this session. */
	succeeded: boolean;
	/** Bumped on every session start / shutdown so stale async work backs off. */
	generation: number;
	/** generation captured when the current request started. */
	requestGen: number;
	/** In-flight naming request, if any. */
	controller: AbortController | null;
	/** Timer handle for the request timeout. */
	timer: ReturnType<typeof setTimeout> | null;
}

function freshState(): NamingState {
	return {
		armed: false,
		attempted: false,
		succeeded: false,
		generation: 0,
		requestGen: -1,
		controller: null,
		timer: null,
	};
}

function userMessageCount(branch: HistoryEntry[]): number {
	let count = 0;
	for (const entry of branch) {
		if (entry.type === "message" && entry.message?.role === "user") count++;
	}
	return count;
}

function report(state: NamingState, ctx: ExtensionContext, level: "info" | "warning" | "error", text: string) {
	if (ctx.hasUI) {
		ctx.ui.notify(text, level);
	} else if (level !== "info") {
		console.error(`[pi-rename-session] ${text}`);
	}
}

export default function (pi: ExtensionAPI) {
	let state = freshState();

	pi.on("session_start", (event: SessionStartEvent, ctx: ExtensionContext) => {
		abortRequest(state);
		const branch = ctx.sessionManager.getBranch() as unknown as HistoryEntry[];
		// Arm only for a genuinely fresh conversation: no prior user turns and
		// still unnamed. Resume/fork/reload with history never auto-name, and a
		// name set via /name, --name, or another extension always wins.
		state.armed = userMessageCount(branch) === 0 && !pi.getSessionName();
		state.attempted = false;
		state.succeeded = false;
		state.generation += 1;
	});

	pi.on("session_shutdown", (_event: SessionShutdownEvent, _ctx: ExtensionContext) => {
		abortRequest(state);
		state.generation += 1;
		state.armed = false;
		// Re-append name at EOF so tail-only session pickers find it.
		const name = pi.getSessionName();
		if (name) pi.setSessionName(name);
	});

	pi.on("agent_settled", async (_event, ctx: ExtensionContext) => {
		if (!state.armed || state.attempted || state.succeeded) return;
		state.attempted = true;
		state.armed = false;
		const branch = ctx.sessionManager.getBranch() as unknown as HistoryEntry[];
		const exchange = extractFirstExchange(branch);
		if (!exchange) return;
		const title = await runTitleRequest(state, ctx, exchange, { allowReplace: false });
		if (!title) return;
		// Re-check before writing: another extension may have named the session
		// while we were waiting.
		if (pi.getSessionName()) return;
		pi.setSessionName(title);
		state.succeeded = true;
	});

	pi.registerCommand("rename-session", {
		description:
			"Rename session: /rename-session (regenerate from first exchange), /rename-session status",
		handler: async (args: string, ctx: ExtensionContext) => {
			const arg = args.trim().toLowerCase();
			if (arg === "status") {
				const name = pi.getSessionName();
				report(
					state,
					ctx,
					"info",
					[
						`current name: ${name ?? "(none)"}`,
						`armed: ${state.armed}, attempted: ${state.attempted}`,
					].join("\n"),
				);
				return;
			}
			const branch = ctx.sessionManager.getBranch() as unknown as HistoryEntry[];
			const exchange = extractFirstExchange(branch);
			if (!exchange) {
				report(state, ctx, "error", "No first exchange available to name this session from");
				return;
			}
			const title = await runTitleRequest(state, ctx, exchange, { allowReplace: true });
			if (!title) return; // runTitleRequest already reported the failure
			pi.setSessionName(title);
			report(state, ctx, "info", `Session renamed: ${title}`);
		},
	});

	/** Run one naming request. Reports failures; returns the title or undefined. */
	function runTitleRequest(
		current: NamingState,
		ctx: ExtensionContext,
		exchange: Exchange,
		opts: { allowReplace: boolean },
	): Promise<string | undefined> {
		return (async () => {
			// Name with the session's current model; no override.
			const model = ctx.model;
			if (!model) {
				if (opts.allowReplace) {
					report(current, ctx, "error", "No active session model to name with");
				} else {
					report(current, ctx, "warning", "Auto-naming skipped: no active session model");
				}
				return undefined;
			}

			// Cancel any earlier in-flight request so one naming run owns the wire.
			abortRequest(current);
			const controller = new AbortController();
			current.controller = controller;
			current.requestGen = current.generation;
			const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
			current.timer = timer;

			const { system, body } = buildTitlePrompt(exchange);
			let title: string | undefined;
			let failure: string | undefined;
			try {
				const response = await ctx.modelRegistry.complete(
					model,
					{
						messages: [
							{
								role: "user",
								content: [{ type: "text", text: `${system}\n\n${body}` }],
								timestamp: Date.now(),
							},
						],
					},
					{
						maxTokens: TITLE_MAX_TOKENS,
						signal: controller.signal,
						cacheRetention: "none",
					},
				);
				type TextPart = Extract<(typeof response.content)[number], { type: "text" }>;
				const text = response.content
					.filter((part): part is TextPart => part.type === "text")
					.map((part) => part.text)
					.join(" ");
				if (response.stopReason === "error" || response.stopReason === "aborted") {
					failure = response.errorMessage || `naming request ${response.stopReason}`;
				} else {
					title = normalizeTitle(text, TITLE_MAX_LENGTH);
					if (!title) failure = "model returned no usable title";
				}
			} catch (err) {
				if (current.controller !== controller) return undefined; // superseded
				failure = err instanceof Error ? err.message : String(err);
			} finally {
				if (current.timer === timer) {
					clearTimeout(timer);
					current.timer = null;
				}
				if (current.controller === controller) current.controller = null;
			}

			if (current.requestGen !== current.generation) return undefined; // session moved on

			if (controller.signal.aborted && !failure) {
				failure = `timed out after ${REQUEST_TIMEOUT_MS}ms`;
			}
			if (failure) {
				if (opts.allowReplace) {
					report(current, ctx, "error", `Session naming failed: ${failure}`);
				} else {
					report(current, ctx, "warning", `Auto-naming failed: ${failure}`);
				}
				return undefined;
			}
			return title;
		})();
	}
}

function abortRequest(state: NamingState) {
	if (state.controller) {
		state.controller.abort();
		state.controller = null;
	}
	if (state.timer) {
		clearTimeout(state.timer);
		state.timer = null;
	}
}
