import { test } from "node:test";
import assert from "node:assert/strict";
import {
	buildTitlePrompt,
	extractFirstExchange,
	normalizeTitle,
	redactSecrets,
	type HistoryEntry,
} from "../naming.ts";

function message(role: string, content: unknown): HistoryEntry {
	return { type: "message", message: { role, content: content as never } };
}

function text(user: string, assistant = ""): HistoryEntry[] {
	const entries = [message("user", user)];
	if (assistant) entries.push(message("assistant", assistant));
	return entries;
}

test("extractFirstExchange: plain string content", () => {
	const branch = text("Fix the auth bug please", "Done, patched the token check.");
	assert.deepEqual(extractFirstExchange(branch), {
		user: "Fix the auth bug please",
		assistant: "Done, patched the token check.",
	});
});

test("extractFirstExchange: concatenates assistant text across the turn, strips tools", () => {
	const branch: HistoryEntry[] = [
		message("user", "Why is the build red?"),
		message("assistant", [
			{ type: "tool_call", id: "c1", name: "grep", input: {} },
		]),
		message("assistant", [
			{ type: "text", text: "Found it: a missing import in auth." },
			{ type: "text", text: "Fix is one line." },
		]),
		message("toolResult", { type: "tool_result", toolCallId: "c1", isError: false, content: [] }),
	];
	const exchange = extractFirstExchange(branch);
	assert.ok(exchange);
	assert.equal(exchange.user, "Why is the build red?");
	assert.equal(exchange.assistant, "Found it: a missing import in auth.\nFix is one line.");
});

test("extractFirstExchange: string content with later exchanges ignored", () => {
	const branch = [...text("first question", "first answer"), ...text("second question", "second answer")];
	const exchange = extractFirstExchange(branch);
	assert.ok(exchange);
	assert.deepEqual(exchange, { user: "first question", assistant: "first answer" });
});

test("extractFirstExchange: skips non-message entries and empty parts", () => {
	const branch: HistoryEntry[] = [
		{ type: "custom", data: { x: 1 } },
		message("user", [{ type: "text", text: "  hello there  " }]),
		{ type: "custom", data: { y: 2 } },
		message("assistant", [{ type: "thinking", text: "hidden reasoning" }]),
	];
	const exchange = extractFirstExchange(branch);
	assert.ok(exchange);
	assert.equal(exchange.user, "hello there");
	assert.equal(exchange.assistant, "");
});

test("extractFirstExchange: returns undefined on empty branch", () => {
	assert.equal(extractFirstExchange([]), undefined);
});

test("extractFirstExchange: returns undefined when no text anywhere", () => {
	const branch = [message("assistant", "orphan answer")];
	assert.equal(extractFirstExchange(branch), undefined);
});

test("redactSecrets: sk- keys, bearer tokens, github tokens, aws keys", () => {
	const input = "key sk-abcdef1234567890abc and Bearer abcdefghijklmnop12345678 and ghp_ABCDEFGHIJKLMNOPQRSTUVWX1234 and AKIAIOSFODNN7EXAMPLE";
	const out = redactSecrets(input);
	assert.ok(!out.includes("sk-abcdef1234567890abc"));
	assert.ok(!out.includes("abcdefghijklmnop12345678"));
	assert.ok(!out.includes("ghp_ABCDEFGHIJKLMNOPQRSTUVWX1234"));
	assert.ok(!out.includes("AKIAIOSFODNN7EXAMPLE"));
	assert.equal(out.match(/\[REDACTED\]/g)?.length, 4);
});

test("redactSecrets: env-style secret assignment", () => {
	const out = redactSecrets("export MY_API_TOKEN=super-secret-value and OPENAI_API_KEY = 'sess-key-here'");
	assert.ok(!out.includes("super-secret-value"));
	assert.ok(!out.includes("sess-key-here"));
	assert.ok(out.includes("MY_API_TOKEN=[REDACTED]"));
});

test("redactSecrets: private key block", () => {
	const key = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFA\n-----END PRIVATE KEY-----";
	const out = redactSecrets(`here ${key} end`);
	assert.ok(!out.includes("MIIEvQIBADANBgkqhkiG9w0BAQEFA"));
	assert.ok(out.includes("[REDACTED]"));
});

test("redactSecrets: leaves ordinary prose alone", () => {
	const input = "The API key rotation plan is documented; we use tokens for auth, see spec v1.";
	assert.equal(redactSecrets(input), input);
});

test("normalizeTitle: strips quotes, brackets, trailing punctuation", () => {
	assert.equal(normalizeTitle('"Fix the flaky test runner."', 48), "Fix the flaky test runner");
	assert.equal(normalizeTitle("[Refactor: drop lodash]", 48), "Refactor: drop lodash");
	assert.equal(normalizeTitle("`Debug CI cache issue`!", 48), "Debug CI cache issue");
});

test("normalizeTitle: collapses whitespace and control chars", () => {
	assert.equal(normalizeTitle("Multi\u0000line\twith\u0000controls  spaced  out", 48), "Multi line with controls spaced out");
});

test("normalizeTitle: takes first line only", () => {
	assert.equal(normalizeTitle("First line only\nSecond line should vanish", 48), "First line only");
});

test("normalizeTitle: handles markdown heading and bullets", () => {
	assert.equal(normalizeTitle("# Migrate to ESM", 48), "Migrate to ESM");
	assert.equal(normalizeTitle("- Refactor auth middleware", 48), "Refactor auth middleware");
});

test("normalizeTitle: caps at maxLength on a word boundary", () => {
	const out = normalizeTitle("this is an extremely long session title that keeps going forever and ever", 20);
	assert.ok(out && out.length <= 20);
	assert.equal(out, "this is an extremely");
});

test("normalizeTitle: empty or junk input is undefined", () => {
	assert.equal(normalizeTitle(undefined, 48), undefined);
	assert.equal(normalizeTitle("   ", 48), undefined);
	assert.equal(normalizeTitle("!!!", 48), undefined);
	assert.equal(normalizeTitle("...", 48), undefined);
});

test("buildTitlePrompt: embeds truncated redacted exchange", () => {
	const { system, body } = buildTitlePrompt({
		user: "deploy with token Bearer abcdefghijklmnop12345678",
		assistant: "",
	});
	assert.ok(system.includes("one concise sentence"));
	assert.ok(!body.includes("abcdefghijklmnop12345678"));
	assert.ok(body.includes("User: deploy with token"));
	assert.ok(body.includes("Reply with only the title."));
});

test("buildTitlePrompt: truncates very long exchange", () => {
	const long = "word ".repeat(5000);
	const { body } = buildTitlePrompt({ user: long, assistant: long });
	assert.ok(body.length < 1000 + 800 + 300);
});
