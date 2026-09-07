import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	CONFIG_FILE_NAME,
	DEFAULT_CONFIG,
	REQUEST_TIMEOUT_MS,
	TITLE_MAX_LENGTH,
	loadConfig,
	saveConfig,
} from "../config.ts";

function tempDir(): string {
	return mkdtempSync(join(tmpdir(), "pi-rename-session-"));
}

test("defaults are fixed: enabled on", () => {
	assert.deepEqual(DEFAULT_CONFIG, { enabled: true });
	assert.equal(TITLE_MAX_LENGTH, 48);
	assert.equal(REQUEST_TIMEOUT_MS, 10_000);
});

test("loadConfig: missing file -> defaults", () => {
	assert.deepEqual(loadConfig(tempDir()), DEFAULT_CONFIG);
});

test("loadConfig: invalid json -> defaults", () => {
	const dir = tempDir();
	writeFileSync(join(dir, CONFIG_FILE_NAME), "{not json");
	assert.deepEqual(loadConfig(dir), DEFAULT_CONFIG);
	rmSync(dir, { recursive: true });
});

test("loadConfig: reads enabled", () => {
	const dir = tempDir();
	writeFileSync(join(dir, CONFIG_FILE_NAME), JSON.stringify({ enabled: false }));
	assert.deepEqual(loadConfig(dir), { enabled: false });
	rmSync(dir, { recursive: true });
});

test("loadConfig: reads model override", () => {
	const dir = tempDir();
	writeFileSync(join(dir, CONFIG_FILE_NAME), JSON.stringify({ enabled: false, model: "anthropic/claude-x" }));
	assert.deepEqual(loadConfig(dir), { enabled: false, model: "anthropic/claude-x" });
	rmSync(dir, { recursive: true });
});

test("loadConfig: blank or non-string model is ignored", () => {
	const dir = tempDir();
	writeFileSync(join(dir, CONFIG_FILE_NAME), JSON.stringify({ enabled: true, model: "   " }));
	assert.deepEqual(loadConfig(dir), DEFAULT_CONFIG);
	const dir2 = tempDir();
	writeFileSync(join(dir2, CONFIG_FILE_NAME), JSON.stringify({ enabled: true, model: 42 }));
	assert.deepEqual(loadConfig(dir2), DEFAULT_CONFIG);
	rmSync(dir, { recursive: true });
	rmSync(dir2, { recursive: true });
});

test("saveConfig + loadConfig round-trip keeps model, omits key when absent", () => {
	const dir = tempDir();
	saveConfig(dir, { enabled: false, model: "openai/gpt-x" });
	assert.deepEqual(loadConfig(dir), { enabled: false, model: "openai/gpt-x" });
	saveConfig(dir, { enabled: true });
	assert.deepEqual(loadConfig(dir), DEFAULT_CONFIG);
	rmSync(dir, { recursive: true });
});

test("loadConfig: legacy debug/maxLength/timeoutMs keys are ignored", () => {
	const dir = tempDir();
	writeFileSync(
		join(dir, CONFIG_FILE_NAME),
		JSON.stringify({ enabled: false, debug: true, maxLength: 999, timeoutMs: 1 }),
	);
	assert.deepEqual(loadConfig(dir), { enabled: false });
	rmSync(dir, { recursive: true });
});

test("loadConfig: wrong-typed enabled falls back to default", () => {
	const dir = tempDir();
	writeFileSync(join(dir, CONFIG_FILE_NAME), JSON.stringify({ enabled: "yes" }));
	assert.deepEqual(loadConfig(dir), DEFAULT_CONFIG);
	rmSync(dir, { recursive: true });
});

test("saveConfig + loadConfig round-trip", () => {
	const dir = tempDir();
	saveConfig(dir, { enabled: false });
	assert.deepEqual(loadConfig(dir), { enabled: false });
	saveConfig(dir, { enabled: true });
	assert.deepEqual(loadConfig(dir), DEFAULT_CONFIG);
	rmSync(dir, { recursive: true });
});
