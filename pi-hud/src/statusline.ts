// Display helpers for the HUD statusline. Width math and truncation are
// ANSI-aware: clusters may carry theme colors, so visible width (not string
// length) drives layout.

import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

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

const HAS_ANSI = /\x1b\[/;

/** Left cluster keeps its head, ellipsis on the right. */
const ellipsisLeft = (s: string, cols: number) =>
	HAS_ANSI.test(s)
		? truncateToWidth(s, cols, "…", false)
		: s.slice(0, Math.max(0, cols - 1)) + "…";

/** Right cluster keeps its tail, ellipsis on the left. */
const ellipsisRight = (s: string, cols: number): string => {
	if (visibleWidth(s) <= cols) return s;
	// Styled text has no safe suffix slice, so it falls back to keeping its
	// head (never hit in practice: the right cluster is the plain model
	// label); truncateToWidth appends resets, harmless on the row tail.
	if (HAS_ANSI.test(s)) return truncateToWidth(s, cols - 1, "…", false);
	return "…" + s.slice(Math.max(0, s.length - cols + 1));
};

/**
 * Layout the statusline in `cols` columns. The left cluster sits on the left,
 * the right cluster on the right; if both fit on one row, join them.
 * Otherwise wrap: row 1 carries the left cluster, row 2 the right cluster
 * (right-aligned). A cluster wider than the terminal is truncated with an
 * ellipsis rather than allowed to overflow.
 */
export function composeStatus(left: string, right: string, cols: number): string[] {
	if (cols <= 0) return [];
	if (visibleWidth(left) + 1 + visibleWidth(right) <= cols) {
		return [
			left +
				" ".repeat(Math.max(0, cols - visibleWidth(left) - visibleWidth(right))) +
				right,
		];
	}
	const l = visibleWidth(left) <= cols ? left : ellipsisLeft(left, cols);
	const r = visibleWidth(right) <= cols ? right : ellipsisRight(right, cols);
	const rows: string[] = [];
	if (visibleWidth(l) > 0) rows.push(l);
	if (visibleWidth(r) > 0) rows.push(" ".repeat(Math.max(0, cols - visibleWidth(r))) + r);
	return rows;
}
