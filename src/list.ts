/**
 * Pure logic for Quicksaved Prompts. No I/O here so the rules are unit-testable.
 *
 * Quicksaved Prompts are newest-first: index 0 is the most recent quick-save.
 * Entries are plain strings; duplicate texts are distinct entries, so an
 * entry's identity is its position in the list (see the Language section of AGENTS.md).
 */

/** Maximum number of entries Quicksaved Prompts keeps. */
export const MAX_PROMPTS = 100;

/** Prepend `text` as the newest entry, dropping the oldest one past the cap. */
export function appendToList(
	list: readonly string[],
	text: string,
): { list: string[]; evicted: boolean } {
	const next = [text, ...list];
	const evicted = next.length > MAX_PROMPTS;
	return { list: next.slice(0, MAX_PROMPTS), evicted };
}

/** Copy of `list` without the entry at `index`. Out-of-range is a no-op. */
export function removeAt(list: readonly string[], index: number): string[] {
	if (index < 0 || index >= list.length) {
		return [...list];
	}
	return [...list.slice(0, index), ...list.slice(index + 1)];
}

/** Copy of `list` with the entry at `index` replaced by `text`. Out-of-range is a no-op. */
export function replaceAt(list: readonly string[], index: number, text: string): string[] {
	if (index < 0 || index >= list.length) {
		return [...list];
	}
	return [...list.slice(0, index), text, ...list.slice(index + 1)];
}

/**
 * Tolerant parse of the stored file. `undefined` (missing file), invalid JSON,
 * and non-array shapes all yield an empty list. Only string elements survive;
 * anything else in the array is dropped.
 */
export function parseListFile(content: string | undefined): string[] {
	if (content === undefined) {
		return [];
	}
	try {
		const value: unknown = JSON.parse(content);
		if (!Array.isArray(value)) {
			return [];
		}
		return value.filter((item): item is string => typeof item === "string");
	} catch {
		return [];
	}
}

/** Serialize the list for storage. */
export function serializeList(list: readonly string[]): string {
	return JSON.stringify(list, null, 2);
}
