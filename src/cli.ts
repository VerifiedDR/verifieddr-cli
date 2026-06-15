#!/usr/bin/env node

/**
 * VerifiedDR CLI — a thin, dependency-free HTTP client for the public
 * VerifiedDR API (https://verifieddr.com/api/v1). It never touches a database
 * or any admin credential; every call is authenticated with your own
 * `vdr_…` API key and metered against your plan's monthly quota.
 *
 * Auth:  VERIFIEDDR_API_KEY=vdr_…   (or pass --key vdr_…)
 * Base:  VERIFIEDDR_API_BASE=https://verifieddr.com   (override for testing)
 */

const DEFAULT_BASE = "https://verifieddr.com";

type Json = Record<string, unknown>;

function out(value: unknown): void {
	process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function fail(message: string, code = 1): never {
	out({ ok: false, error: message });
	process.exit(code);
}

function flag(args: string[], name: string): boolean {
	return args.includes(name);
}

function option(args: string[], name: string): string | undefined {
	const i = args.indexOf(name);
	return i === -1 ? undefined : args[i + 1];
}

function baseUrl(args: string[]): string {
	return (
		option(args, "--base") ||
		process.env.VERIFIEDDR_API_BASE ||
		DEFAULT_BASE
	).replace(/\/$/, "");
}

function apiKey(args: string[]): string | undefined {
	return option(args, "--key") || process.env.VERIFIEDDR_API_KEY;
}

function domainArg(args: string[]): string {
	const positional = args.find((a) => !a.startsWith("--"));
	if (!positional) fail("A domain is required (e.g. example.com).", 2);
	return positional;
}

async function request(
	args: string[],
	method: "GET" | "POST",
	path: string,
	body?: Json,
	requireKey = true,
): Promise<void> {
	const key = apiKey(args);
	if (requireKey && !key) {
		fail(
			"Missing API key. Set VERIFIEDDR_API_KEY=vdr_… or pass --key vdr_…. Create one free in your VerifiedDR dashboard — the free tier includes 100 calls/month; Pro and Agency raise the limit.",
			3,
		);
	}
	const headers: Record<string, string> = { Accept: "application/json" };
	if (key) headers.Authorization = `Bearer ${key}`;
	if (body) headers["Content-Type"] = "application/json";

	let response: Response;
	try {
		response = await fetch(`${baseUrl(args)}${path}`, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
			signal: AbortSignal.timeout(20000),
		});
	} catch (error) {
		fail(
			`Request failed: ${error instanceof Error ? error.message : String(error)}`,
			4,
		);
	}

	const remaining = response.headers.get("X-API-Quota-Remaining");
	const limit = response.headers.get("X-API-Quota-Limit");
	if (remaining && limit) {
		process.stderr.write(`quota: ${remaining}/${limit} remaining\n`);
	}

	const text = await response.text();
	let data: unknown;
	try {
		data = text ? JSON.parse(text) : {};
	} catch {
		data = { raw: text };
	}

	if (!response.ok) {
		const message =
			(data as Json)?.error != null
				? String((data as Json).error)
				: `HTTP ${response.status}`;
		fail(message, response.status === 402 ? 5 : 6);
	}
	out({ ok: true, ...(data as Json) });
}

function encode(value: string): string {
	return encodeURIComponent(value.trim().toLowerCase());
}

const USAGE = `VerifiedDR CLI — public authority & trust data over the VerifiedDR API.

Auth: set VERIFIEDDR_API_KEY=vdr_… (Pro/Agency dashboard) or pass --key.

Public discovery (any approved site):
  vdr lookup <domain>                    Authority: DR, TrueDR, trust, evidence
  vdr find [filters]                     Discover trusted sites, ranked by TrueDR
  vdr snippets <domain>                  Badge / embed snippets
  vdr categories                         Valid category values (no key needed)

Your own sites (owner-scoped):
  vdr sites                              List your sites + metrics
  vdr site <domain>                      One of your sites with DR/traffic trends
  vdr truedr <domain> [--detailed]       Your site's TrueDR (+ signal breakdown)
  vdr export <domain>                    Machine-readable export of your site
  vdr monitor [<domain>] [--daily]       Watch changes + trust alerts
  vdr submit <url> [--title --description --category --xhandle]
  vdr verify <domain>                    Re-check the badge embed

find filters:
  --category <slug>  --min-truedr <n>  --min-dr <n>
  --traffic-validated  --include-unverified  --limit <n> (max 50)

Global flags: --key vdr_…   --base <url>`;

async function main(): Promise<void> {
	const [command, ...args] = process.argv.slice(2);

	switch (command) {
		case "lookup":
			return request(args, "GET", `/api/v1/lookup/${encode(domainArg(args))}`);
		case "snippets":
			return request(
				args,
				"GET",
				`/api/v1/snippets/${encode(domainArg(args))}`,
			);
		case "export":
			return request(args, "GET", `/api/v1/export/${encode(domainArg(args))}`);
		case "site":
			return request(args, "GET", `/api/v1/sites/${encode(domainArg(args))}`);
		case "sites":
			return request(args, "GET", "/api/v1/sites");
		case "categories":
			return request(args, "GET", "/api/v1/categories", undefined, false);
		case "truedr": {
			const detailed = flag(args, "--detailed") ? "?detailed=true" : "";
			return request(
				args,
				"GET",
				`/api/v1/sites/${encode(domainArg(args))}/truedr${detailed}`,
			);
		}
		case "find": {
			const q = new URLSearchParams();
			const category = option(args, "--category");
			if (category) q.set("category", category);
			const minTrueDr = option(args, "--min-truedr");
			if (minTrueDr) q.set("minTrueDr", minTrueDr);
			const minDr = option(args, "--min-dr");
			if (minDr) q.set("minDr", minDr);
			if (flag(args, "--traffic-validated")) q.set("trafficValidated", "true");
			if (flag(args, "--include-unverified")) q.set("includeUnverified", "true");
			const limit = option(args, "--limit");
			if (limit) q.set("limit", limit);
			const qs = q.toString();
			return request(args, "GET", `/api/v1/find${qs ? `?${qs}` : ""}`);
		}
		case "monitor": {
			const q = new URLSearchParams();
			if (flag(args, "--daily")) q.set("daily", "true");
			const domain = args.find((a) => !a.startsWith("--"));
			if (domain) q.set("domain", domain.toLowerCase());
			const qs = q.toString();
			return request(args, "GET", `/api/v1/monitor${qs ? `?${qs}` : ""}`);
		}
		case "verify":
			return request(args, "POST", "/api/v1/verify", {
				url: domainArg(args),
			});
		case "submit": {
			const url = domainArg(args);
			const body: Json = { url };
			const title = option(args, "--title");
			if (title) body.title = title;
			const description = option(args, "--description");
			if (description) body.description = description;
			const category = option(args, "--category");
			if (category) body.categories = [category];
			const xHandle = option(args, "--xhandle");
			if (xHandle) body.xHandle = xHandle;
			return request(args, "POST", "/api/v1/sites", body);
		}
		case undefined:
		case "help":
		case "--help":
		case "-h":
			process.stdout.write(`${USAGE}\n`);
			return;
		default:
			process.stderr.write(`${USAGE}\n`);
			fail(`Unknown command: ${command}`, 2);
	}
}

main().catch((error) => {
	fail(error instanceof Error ? error.message : String(error));
});
