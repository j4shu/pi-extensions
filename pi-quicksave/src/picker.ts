import { copyToClipboard, DynamicBorder } from "@earendil-works/pi-coding-agent";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Container, Key, matchesKey, SelectList, Text, truncateToWidth } from "@earendil-works/pi-tui";
import type { SelectItem } from "@earendil-works/pi-tui";

import { removeAt } from "./list.ts";

const FOOTER_BROWSE =
	"up/down or ctrl+n/p move · enter fill · ctrl+x delete · ctrl+y copy · esc exit";
const FOOTER_EMPTY = "esc exit";
const FOOTER_CONFIRM = "delete this prompt? enter confirms · any other key cancels";
const MAX_VISIBLE_ROWS = 10;

/**
 * Open the prompt picker over the composer.
 *
 * Mutations (delete) are applied and persisted while the picker stays open.
 * Returns the entry text to fill the composer with, or undefined when the
 * picker was dismissed with Esc.
 */
export async function openPromptPicker(
	ctx: ExtensionContext,
	initial: readonly string[],
	persist: (list: readonly string[]) => Promise<void>,
): Promise<string | undefined> {
	const ui = ctx.ui;
	return ui.custom<string | undefined>(
		(tui, theme, _keybindings, done) => {
			let entries: string[] = [...initial];
			let mode: "browse" | "confirm" = "browse";
			let selectedIndex = 0;
			let busy = false;
			let list: SelectList | null = null;
			let root = new Container();

			function buildItems(): SelectItem[] {
				return entries.map((text, index) => ({
					value: String(index),
					label: previewLabel(text),
				}));
			}

			function footerHint(): string {
				if (mode === "confirm") return FOOTER_CONFIRM;
				if (entries.length === 0) return FOOTER_EMPTY;
				return FOOTER_BROWSE;
			}

			/** Rebuild the view. Call after any change to entries or mode. */
			function rebuild(): void {
				// Accent rule, header, content, accent rule: the same frame pi's
				// own bottom pickers (resume session, model select) use.
				const next = new Container();
				next.addChild(new DynamicBorder((str) => theme.fg("accent", str)));
				next.addChild(new Text(theme.fg("accent", theme.bold(`Quicksaved Prompts (${entries.length})`))));
				if (entries.length > 0) {
					const danger = mode === "confirm";
					const accent = (text: string) => (danger ? theme.fg("error", text) : theme.fg("accent", text));
					const selectList = new SelectList(buildItems(), Math.min(entries.length, MAX_VISIBLE_ROWS), {
						selectedPrefix: accent,
						selectedText: accent,
						description: (text) => theme.fg("muted", text),
						scrollInfo: (text) => theme.fg("dim", text),
						noMatch: (text) => theme.fg("warning", text),
					});
					selectList.onSelect = (item) => done(entries[Number(item.value)]);
					selectList.onCancel = () => done(undefined);
					selectList.onSelectionChange = (item) => {
						selectedIndex = Number(item.value);
					};
					if (selectedIndex > 0 && selectedIndex < entries.length) {
						selectList.setSelectedIndex(selectedIndex);
					}
					list = selectList;
					next.addChild(selectList);
				} else {
					list = null;
					next.addChild(
						new Text(theme.fg("muted", "No saved prompts yet. Type a prompt and press ctrl+s to save it.")),
					);
				}
				next.addChild(new Text(theme.fg("dim", footerHint())));
				next.addChild(new DynamicBorder((str) => theme.fg("accent", str)));
				root = next;
			}

			/** Move selection by `step`, wrapping around the ends. */
			function move(step: number): void {
				if (entries.length === 0) return;
				const nextIndex = (selectedIndex + step + entries.length) % entries.length;
				selectedIndex = nextIndex;
				list?.setSelectedIndex(nextIndex);
				tui.requestRender();
			}

			async function deleteSelected(): Promise<void> {
				if (busy) return;
				busy = true;
				try {
					const index = selectedIndex;
					entries = removeAt(entries, index);
					if (entries.length === 0) {
						selectedIndex = 0;
					} else {
						// The successor slides into the deleted slot.
						selectedIndex = Math.min(index, entries.length - 1);
					}
					mode = "browse";
					rebuild();
					await persist(entries);
					tui.requestRender();
				} catch (error) {
					ui.notify(`Failed to delete prompt: ${String(error)}`, "error");
				} finally {
					busy = false;
				}
			}

			async function copySelected(): Promise<void> {
				const text = entries[selectedIndex];
				if (text === undefined) return;
				try {
					await copyToClipboard(text);
					ui.notify("prompt copied", "info");
				} catch (error) {
					ui.notify(`Copy failed: ${String(error)}`, "error");
				}
			}

			function isDismiss(data: string): boolean {
				return matchesKey(data, Key.escape);
			}

			function isConfirm(data: string): boolean {
				return matchesKey(data, Key.enter) || matchesKey(data, Key.return);
			}

			rebuild();

			return {
				render: (width: number) => root.render(width),
				invalidate: () => root.invalidate(),
				handleInput: (data: string) => {
					if (busy) return;
					if (mode === "confirm") {
						if (isConfirm(data)) {
							void deleteSelected();
						} else {
							mode = "browse";
							rebuild();
							tui.requestRender();
						}
						return;
					}
					if (entries.length === 0) {
						if (isDismiss(data)) done(undefined);
						return;
					}
					if (matchesKey(data, Key.ctrl("x"))) {
						mode = "confirm";
						rebuild();
						tui.requestRender();
						return;
					}
					if (matchesKey(data, Key.ctrl("y"))) {
						void copySelected();
						return;
					}
					if (matchesKey(data, Key.ctrl("n"))) {
						move(1);
						return;
					}
					if (matchesKey(data, Key.ctrl("p"))) {
						move(-1);
						return;
					}
					// Swallow ctrl+c: the SelectList treats it as cancel and would close
					// the picker; Esc is the only dismiss key.
					if (matchesKey(data, Key.ctrl("c"))) {
						return;
					}
					// Everything else (up/down, enter, escape) goes to the list.
					list?.handleInput(data);
					tui.requestRender();
				},
			};
		},
		// No overlay: like pi's own pickers (resume session, model select), the
		// component replaces the composer area and fills the terminal width at the
		// bottom instead of floating as a popup window.
	);
}

/** One-line preview of an entry: first line plus a line count suffix. */
function previewLabel(text: string): string {
	const firstLine = text.split("\n")[0] ?? "";
	const extraLines = text.split("\n").length - 1;
	const label = extraLines > 0 ? `${firstLine} (+${extraLines} more)` : firstLine;
	return truncateToWidth(label, 240);
}
