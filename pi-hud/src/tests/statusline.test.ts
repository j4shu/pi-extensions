import assert from "node:assert/strict";
import { test } from "node:test";

import { composeStatus, formatCount, shortenPath } from "../statusline.ts";

test("formatCount switches to k notation at 1000 and trims trailing .0", () => {
	assert.equal(formatCount(0), "0");
	assert.equal(formatCount(999), "999");
	assert.equal(formatCount(1000), "1k");
	assert.equal(formatCount(1234), "1.2k");
	assert.equal(formatCount(12000), "12k");
	assert.equal(formatCount(123456), "123.5k");
});

test("shortenPath maps home and children to ~, leaves other paths alone", () => {
	const home = "/Users/jshu";
	assert.equal(shortenPath("/Users/jshu", home), "~");
	assert.equal(shortenPath("/Users/jshu/git/pi-extensions", home), "~/git/pi-extensions");
	assert.equal(shortenPath("/Users/jshuard", home), "/Users/jshuard");
	assert.equal(shortenPath("/opt/other", home), "/opt/other");
	assert.equal(shortenPath("/opt/other", undefined), "/opt/other");
});

test("composeStatus joins both clusters on one row when they fit", () => {
	const left = "~/git/pi-extensions · main";
	const right = "codex:high · ↑1.2k ↓850";
	const rows = composeStatus(left, right, 50);
	assert.equal(rows.length, 1);
	assert.equal(rows[0]!.length, 50);
	assert.equal(rows[0]!, left + " ".repeat(50 - left.length - right.length) + right);
});

test("composeStatus wraps to two rows when they do not fit, right cluster right-aligned", () => {
	const rows = composeStatus("~/git/pi-extensions · main", "codex:high · ↑1.2k ↓850", 30);
	assert.equal(rows.length, 2);
	assert.equal(rows[0], "~/git/pi-extensions · main");
	assert.equal(rows[1]!.length, 30);
	assert.equal(rows[1]!.startsWith(" "), true);
	assert.equal(rows[1]!.endsWith("codex:high · ↑1.2k ↓850"), true);
});

test("composeStatus truncates a cluster wider than the terminal instead of overflowing", () => {
	const two = composeStatus("a-very-long-left-cluster", "right", 10);
	assert.equal(two.length, 2);
	assert.equal(two[0]!.length, 10);
	assert.equal(two[0]!.endsWith("…"), true);
	assert.equal(two[1]!.length, 10);
	assert.equal(two[1]!.endsWith("right"), true);

	const rightOnly = composeStatus("", "right-cluster-that-is-long", 10);
	assert.equal(rightOnly.length, 1);
	assert.equal(rightOnly[0]!.length, 10);
	assert.equal(rightOnly[0]!.startsWith("…"), true);
});

test("composeStatus degrades gracefully on degenerate widths", () => {
	assert.deepEqual(composeStatus("a", "b", 0), []);
	assert.deepEqual(composeStatus("a", "b", 1), ["a", "b"]);
});
