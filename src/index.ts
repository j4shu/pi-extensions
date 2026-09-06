import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";

import { appendToList } from "./list.ts";
import { openPromptPicker } from "./picker.ts";
import { loadPromptList, savePromptList } from "./store.ts";

export default function quicksaveExtension(pi: ExtensionAPI): void {
	pi.registerShortcut(Key.ctrl("s"), {
		description:
			"Quick-save the current prompt, or open the prompt picker when the prompt is empty",
		handler: (ctx) => handleCtrlS(ctx),
	});
}

async function handleCtrlS(ctx: ExtensionContext): Promise<void> {
	if (ctx.mode !== "tui") {
		return;
	}
	const text = ctx.ui.getEditorText();
	if (text.trim().length > 0) {
		await quickSave(ctx, text);
		return;
	}
	// Empty composer: open the picker; fill the composer if an entry was chosen.
	const filled = await openPromptPicker(ctx, await loadPromptList(), savePromptList);
	if (filled !== undefined) {
		setComposerText(ctx, filled);
	}
}

/**
 * Set the composer text and make it visible immediately.
 *
 * pi's setEditorText updates editor state but never schedules a repaint (its
 * own code always pairs the call with something render-triggering, e.g. a
 * notify). Without a nudge the cleared or filled text only shows on the next
 * keypress. setStatus is the one UI call that always ends in requestRender, so
 * a cleared status key doubles as a paint tick with no visible effect.
 */
function setComposerText(ctx: ExtensionContext, text: string): void {
	ctx.ui.setEditorText(text);
	ctx.ui.setStatus("quicksave.paint", undefined);
}

async function quickSave(ctx: ExtensionContext, text: string): Promise<void> {
	const { list } = appendToList(await loadPromptList(), text);
	await savePromptList(list);
	setComposerText(ctx, "");
	ctx.ui.notify("prompt quicksaved", "info");
}
