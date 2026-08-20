import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
	ServiceUnavailableException,
	UnauthorizedException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { DawnBridgeAuth } from "../src/dawn-bridge/dawn-bridge.auth";

const TOKEN = "dawn-test-token-that-is-at-least-32-characters";

function authWith(token: string | undefined): DawnBridgeAuth {
	const config = {
		get: (key: string) => (key === "DAWN_SERVICE_TOKEN" ? token : undefined),
	} as ConfigService;
	return new DawnBridgeAuth(config);
}

describe("DAWN read-only bridge", () => {
	it("fails closed when the service token is not configured", () => {
		expect(() => authWith(undefined).assertAuthorized(undefined)).toThrow(
			ServiceUnavailableException,
		);
	});

	it("rejects missing, malformed and incorrect bearer tokens", () => {
		const auth = authWith(TOKEN);
		for (const value of [
			undefined,
			"",
			TOKEN,
			`Basic ${TOKEN}`,
			"Bearer wrong-token",
		]) {
			expect(() => auth.assertAuthorized(value)).toThrow(
				UnauthorizedException,
			);
		}
	});

	it("accepts only the configured bearer token", () => {
		expect(() => authWith(TOKEN).assertAuthorized(`Bearer ${TOKEN}`)).not.toThrow();
	});

	it("exposes no mutation HTTP decorators on the DAWN controller", () => {
		const path = fileURLToPath(
			new URL("../src/dawn-bridge/dawn-bridge.controller.ts", import.meta.url),
		);
		const source = readFileSync(path, "utf8");
		expect(source).toContain('@Controller("internal/dawn")');
		expect(source).toContain('@Get("health")');
		expect(source).not.toMatch(/@(Post|Put|Patch|Delete)\s*\(/);
	});
});
