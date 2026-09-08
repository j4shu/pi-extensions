import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { getAgentDir } from "@earendil-works/pi-coding-agent";

import { parseListFile, serializeList } from "./list.ts";

/**
 * Quicksaved Prompts live in one global JSON file in the pi agent dir, shared
 * across sessions and projects.
 */
const FILE_NAME = "pi-quicksave.json";

function promptListPath(): string {
	return join(getAgentDir(), "extensions", FILE_NAME);
}

/** Load Quicksaved Prompts. A missing or unreadable file starts empty. */
export async function loadPromptList(): Promise<string[]> {
	try {
		const content = await readFile(promptListPath(), "utf-8");
		return parseListFile(content);
	} catch {
		return [];
	}
}

/** Persist Quicksaved Prompts via an atomic tmp-file rename. */
export async function savePromptList(list: readonly string[]): Promise<void> {
	const file = promptListPath();
	const tmp = `${file}.tmp`;
	await mkdir(dirname(file), { recursive: true });
	await writeFile(tmp, serializeList(list), "utf-8");
	await rename(tmp, file);
}
