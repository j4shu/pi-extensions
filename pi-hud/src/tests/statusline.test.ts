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

test("composeStatus keeps content unchanged when it fits", () => {
	assert.equal(composeStatus("12.3k ~/git/pi-extensions (main) codex:high", 100), "12.3k ~/git/pi-extensions (main) codex:high");
	assert.equal(composeStatus("exact-fit", 9), "exact-fit");
});

test("composeStatus truncates at the tail with an ellipsis when too wide", () => {
	assert.equal(composeStatus("12.3k ~/git/pi-extensions (main) codex:high", 20), "12.3k ~/git/pi-exte…");
	assert.equal(composeStatus("ab", 1), "…");
});

test("composeStatus degrades gracefully on degenerate widths", () => {
	assert.equal(composeStatus("anything", 0), "");
});
