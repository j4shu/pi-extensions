// pi-hud: a minimal heads-up band for pi.
//
// Visual (bottom of the screen, full width):
//
//	┌──────────────────────────────── my session ┐
//	│ type here                                  │
//	└────────────────────────────────────────────┘
//	13.5k ~/git/pi-extensions (main)   model:high
//
// The prompt editor is the built-in editor (all keybindings and input
// handling inherited) wrapped in a square box: stock horizontal borders
// become ┌─┐/└─┘ corners and every content row gets │ rails, with a
// one-column gutter between rail and text. The session name hangs off the
// top border's right side.
//
// The statusline row sits in the footer slot: session-cumulative token total
// and the model + thinking level together, then a ·-separated cwd with its
// git branch in parentheses. The whole row is dim, like pi's own footer
// text. It truncates at the tail when the terminal is too narrow, so the
// path (never the model segment) is the first to go.

import {
	CustomEditor,
	type ExtensionAPI,
	type ExtensionContext,
	type KeybindingsManager,
} from "@earendil-works/pi-coding-agent";
import { type EditorTheme, type TUI, visibleWidth } from "@earendil-works/pi-tui";

import { composeStatus, formatCount, shortenPath } from "./statusline.ts";

const HOME = process.env.HOME;

// Editor and footer factories are installed per session; the current session
// name is shared module state so the editor can draw it on its top border.
let hudSessionName = "";

/** Scroll/autocomplete rows aside, a stock border row is ─'s with an optional
 *  `↑/↓ N more` indicator embedded; content and suggestion rows never are. */
const isBorderRow = (line: string) =>
	line.includes("─") &&
	/^[─ ↑↓0-9more]+$/.test(line.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, ""));

/** Built-in editor wrapped in a square box: rails on every content row. */
class HudEditor extends CustomEditor {
	constructor(tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager) {
		// One-column gutter inside the rails, so text and cursor start one cell
		// in from the left rail (same geometry as pi-session-hud).
		super(tui, theme, keybindings, { paddingX: 1 });
	}

	override render(width: number): string[] {
		if (width < 4) return super.render(width);

		// Render the stock editor two columns narrower, then add the rails.
		// The inner editor's cursor/click geometry is in its own coordinate
		// space, so the wrap only shifts it right by the one rail column.
		const inner = width - 2;
		const lines = super.render(inner);
		let bottom = -1;
		for (let i = lines.length - 1; i > 0; i--) {
			if (isBorderRow(lines[i] ?? "")) {
				bottom = i;
				break;
			}
		}
		if (bottom < 0) return super.render(width);

		const rule = (left: string, right: string) =>
			this.borderColor(left + "─".repeat(Math.max(0, width - 2)) + right);

		// Top border: session name hung off the right side when it fits.
		const topRule = () => {
			if (!hudSessionName) return rule("┌", "┐");
			const gap = width - 2 - visibleWidth(hudSessionName) - 2;
			if (gap < 1) return rule("┌", "┐");
			return this.borderColor("┌" + "─".repeat(gap) + " " + hudSessionName + " " + "┐");
		};

		const out: string[] = [topRule()];
		// Stock content rows are already exactly `inner` columns wide (text +
		// its own padding), so rails close the box without width math.
		for (let i = 1; i < bottom; i++) {
			const row = lines[i] ?? "";
			out.push(this.borderColor("│") + row + this.borderColor("│"));
		}
		out.push(rule("└", "┘"));
		// Autocomplete etc. draws below the box, rail-free, padded to width.
		for (let i = bottom + 1; i < lines.length; i++) {
			const line = lines[i] ?? "";
			out.push(line + " ".repeat(Math.max(0, width - visibleWidth(line))));
		}
		return out;
	}
}

type Usage = { input?: number; output?: number };

interface SessionState {
	requestRender(): void;
	recountTokens(): void;
	agentSettled(): void;
	dispose(): void;
}

export default function (pi: ExtensionAPI) {
	let state: SessionState | undefined;

	pi.on("session_start", (_event, ctx) => {
		hudSessionName = (pi.getSessionName() ?? "").replace(/\s+/g, " ").trim();
		state = makeState(pi, ctx);
		state.recountTokens();
		void state.agentSettled();
	});

	pi.on("session_shutdown", () => {
		state?.dispose();
		state = undefined;
		hudSessionName = "";
	});

	// /name, RPC rename, session restore with a label.
	pi.on("session_info_changed", (event) => {
		hudSessionName = ((event as { name?: string | null }).name ?? "")
			.replace(/\s+/g, " ")
			.trim();
		state?.requestRender();
	});

	pi.on("model_select", () => state?.requestRender());
	pi.on("thinking_level_select", () => state?.requestRender());
	pi.on("message_end", () => state?.recountTokens());
	pi.on("agent_settled", () => state?.agentSettled());
}

function makeState(pi: ExtensionAPI, ctx: ExtensionContext): SessionState {
	let requestRender = () => {};
	let branch: string | null = null;
	let tokenTotal = 0;

	const recountTokens = () => {
		let total = 0;
		for (const entry of ctx.sessionManager.getBranch()) {
			if (entry.type !== "message") continue;
			const usage = (entry.message as unknown as { usage?: Usage }).usage;
			total += (usage?.input ?? 0) + (usage?.output ?? 0);
		}
		if (total !== tokenTotal) {
			tokenTotal = total;
			requestRender();
		}
	};

	ctx.ui.setEditorComponent(
		(tui, theme, keybindings) => new HudEditor(tui, theme, keybindings),
	);

	ctx.ui.setFooter((tui, theme, footerData) => {
		requestRender = () => tui.requestRender();
		branch = footerData.getGitBranch();
		const unsubBranch = footerData.onBranchChange(() => {
			branch = footerData.getGitBranch();
			tui.requestRender();
		});

		return {
			invalidate() {},
			dispose() {
				unsubBranch();
				requestRender = () => {};
			},
			render(width: number): string[] {
				// Compose plain text first, dim after truncation
				let cwdAndGit = shortenPath(ctx.cwd, HOME);
				if (branch) cwdAndGit += ` (${branch})`;

				const model = ctx.model ? ctx.model.id : "no model";
				const thinking = pi.getThinkingLevel();
				const modelSegment = `${model}${thinking !== "off" ? `:${thinking}` : ""}`;
				const content = `${formatCount(tokenTotal)} ${modelSegment} · ${cwdAndGit}`;
				const row = composeStatus(content, width);
				return row === "" ? [] : [theme.fg("dim", row)];
			},
		};
	});

	return {
		requestRender: () => requestRender(),
		recountTokens,
		agentSettled: () => {
			recountTokens();
			requestRender();
		},
		dispose: () => {},
	};
}
