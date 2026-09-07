// Display helpers for the HUD statusline. Layout is plain-text math: the row
// is dimmed only after truncation, so visible width == string length here.

/** 850 -> "850", 1234 -> "1.2k", 12000 -> "12k". */
export function formatCount(n: number): string {
	if (n < 1000) return String(n);
	const k = (n / 1000).toFixed(1);
	return (k.endsWith(".0") ? k.slice(0, -2) : k) + "k";
}

/** "/Users/jshu/git/pi-extensions" -> "~/git/pi-extensions" given that home. */
export function shortenPath(cwd: string, home: string | undefined): string {
	if (!home) return cwd;
	if (cwd === home) return "~";
	if (cwd.startsWith(home + "/")) return "~" + cwd.slice(home.length);
	return cwd;
}

/**
 * Layout the statusline in `cols` columns: the content is one left-anchored
 * row, truncated at the tail with an ellipsis when wider than the terminal
 * rather than allowed to overflow. No wrap: the tail (the model segment) is
 * the first to go on narrow widths.
 */
export function composeStatus(content: string, cols: number): string {
	if (cols <= 0) return "";
	if (content.length <= cols) return content;
	return content.slice(0, Math.max(0, cols - 1)) + "…";
}
