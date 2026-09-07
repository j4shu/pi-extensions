import assert from "node:assert/strict";
import { test } from "node:test";

import { appendToList, escapeForLabel, MAX_PROMPTS, parseListFile, removeAt, replaceAt, serializeList } from "../list.ts";

function entries(n: number): string[] {
	return Array.from({ length: n }, (_, i) => `entry-${i}`);
}

test("appendToList prepends so the list stays newest-first", () => {
	const { list, evicted } = appendToList(["older", "oldest"], "newest");
	assert.deepEqual(list, ["newest", "older", "oldest"]);
	assert.equal(evicted, false);
});

test("appendToList drops the oldest entry past the cap and reports it", () => {
	const { list, evicted } = appendToList(entries(MAX_PROMPTS), "newest");
	assert.equal(evicted, true);
	assert.equal(list.length, MAX_PROMPTS);
	assert.equal(list[0], "newest");
	assert.equal(list.includes("entry-99"), false);
	assert.equal(list.at(-1), "entry-98");
});

test("appendToList keeps everything below the cap", () => {
	const { list, evicted } = appendToList(entries(MAX_PROMPTS - 1), "newest");
	assert.equal(evicted, false);
	assert.equal(list.length, MAX_PROMPTS);
	assert.equal(list.at(-1), "entry-98");
});

test("duplicate texts are distinct entries", () => {
	const first = appendToList([], "same").list;
	const second = appendToList(first, "same").list;
	assert.equal(second.length, 2);
	assert.deepEqual(second, ["same", "same"]);
});

test("removeAt deletes the entry at index and shifts successors", () => {
	assert.deepEqual(removeAt(["a", "b", "c"], 0), ["b", "c"]);
	assert.deepEqual(removeAt(["a", "b", "c"], 1), ["a", "c"]);
	assert.deepEqual(removeAt(["a", "b", "c"], 2), ["a", "b"]);
});

test("removeAt is a no-op for out-of-range indexes", () => {
	assert.deepEqual(removeAt(["a", "b"], -1), ["a", "b"]);
	assert.deepEqual(removeAt(["a", "b"], 2), ["a", "b"]);
	assert.deepEqual(removeAt([], 0), []);
});

test("replaceAt swaps the entry at index", () => {
	assert.deepEqual(replaceAt(["a", "b", "c"], 1, "B"), ["a", "B", "c"]);
	assert.deepEqual(replaceAt(["a", "b"], 0, "A"), ["A", "b"]);
});

test("replaceAt is a no-op for out-of-range indexes", () => {
	assert.deepEqual(replaceAt(["a", "b"], 5, "x"), ["a", "b"]);
});

test("parseListFile tolerates missing, invalid, and wrong-shaped content", () => {
	assert.deepEqual(parseListFile(undefined), []);
	assert.deepEqual(parseListFile("not json"), []);
	assert.deepEqual(parseListFile("{}"), []);
	assert.deepEqual(parseListFile("null"), []);
	assert.deepEqual(parseListFile('{"a":1}'), []);
});

test("parseListFile keeps only string elements", () => {
	assert.deepEqual(parseListFile('[1, "a", null, "b"]'), ["a", "b"]);
	assert.deepEqual(parseListFile('["a", "b"]'), ["a", "b"]);
	assert.deepEqual(parseListFile("[]"), []);
});

test("escapeForLabel turns real line breaks into the two characters backslash-n", () => {
	assert.equal(escapeForLabel("line1\nline2\n\nline3"), "line1\\nline2\\n\\nline3");
});

test("escapeForLabel doubles literal backslashes so a literal \\n stays readable", () => {
	// A real newline and a literal backslash-n must not look the same.
	assert.equal(escapeForLabel("a\nb"), "a\\nb");
	assert.equal(escapeForLabel("a\\nb"), "a\\\\nb");
});

test("escapeForLabel normalizes CR and CRLF line endings like LF", () => {
	assert.equal(escapeForLabel("a\r\nb"), "a\\nb");
	assert.equal(escapeForLabel("a\rb"), "a\\nb");
});

test("escapeForLabel leaves text without line breaks or backslashes alone", () => {
	assert.equal(escapeForLabel("plain prompt"), "plain prompt");
});

test("escapeForLabel keeps an original backslash-then-newline distinct", () => {
	assert.equal(escapeForLabel("a\\\nb"), "a\\\\\\nb");
});

test("serializeList round-trips through parseListFile", () => {
	const list = ["first prompt\nwith two lines", "", "exact  text  with spacing "];
	assert.deepEqual(parseListFile(serializeList(list)), list);
});
