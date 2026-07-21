#!/usr/bin/env node

/**
 * VerifiedDR CLI: a thin, dependency-free HTTP client for the public
 * VerifiedDR API (https://verifieddr.com/api/v1). It never touches a database
 * or any admin credential; every call is authenticated with your own
 * `vdr_...` API key and metered against your plan's quota.
 *
 * Auth:  VERIFIEDDR_API_KEY=vdr_...   (or pass --key vdr_...)
 * Base:  VERIFIEDDR_API_BASE=https://verifieddr.com   (override for testing)
 */

import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const DEFAULT_BASE = "https://verifieddr.com";
const DEFAULT_UPGRADE_URL =
	"https://verifieddr.com/pricing?source=cli&feature=api";
const BING_WEBMASTER_TOOLS_URL = "https://www.bing.com/webmasters/";
const execFileAsync = promisify(execFile);

type Json = Record<string, unknown>;
type ApiTier = "free" | "pro" | "agency" | string;
type ApiResult = {
	data: Json;
	tier: ApiTier | null;
};

function out(value: unknown): void {
	process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function fail(message: string, code = 1): never {
	out({ ok: false, error: message });
	process.exit(code);
}

async function openBingWebmasterTools(): Promise<void> {
	let command: string;
	let args: string[];

	switch (process.platform) {
		case "darwin":
			command = "open";
			args = [BING_WEBMASTER_TOOLS_URL];
			break;
		case "win32":
			command = "cmd";
			args = ["/c", "start", "", BING_WEBMASTER_TOOLS_URL];
			break;
		default:
			command = "xdg-open";
			args = [BING_WEBMASTER_TOOLS_URL];
	}

	try {
		await execFileAsync(command, args);
		out({
			ok: true,
			opened: true,
			url: BING_WEBMASTER_TOOLS_URL,
			message: "Opened Bing Webmaster Tools in your browser.",
		});
	} catch {
		out({
			ok: true,
			opened: false,
			url: BING_WEBMASTER_TOOLS_URL,
			message: "Could not open a browser. Open the URL above manually.",
		});
	}
}

function failApiError(
	message: string,
	code: number,
	data: Json,
	status: number,
): never {
	const upgradeUrl =
		typeof data.upgradeUrl === "string"
			? data.upgradeUrl
			: status === 402
				? DEFAULT_UPGRADE_URL
				: undefined;
	out({
		ok: false,
		error: message,
		...(upgradeUrl ? { upgradeUrl } : {}),
		...(typeof data.requiredPlan === "string"
			? { requiredPlan: data.requiredPlan }
			: {}),
		...(typeof data.blockedFeature === "string"
			? { blockedFeature: data.blockedFeature }
			: {}),
	});
	if (upgradeUrl) {
		process.stderr.write(`Upgrade: ${upgradeUrl}\n`);
	}
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

const VALUE_FLAGS = new Set([
	"--add",
	"--add-prompt",
	"--base",
	"--category",
	"--contact",
	"--description",
	"--domain",
	"--goal",
	"--indexnow-key",
	"--key",
	"--key-location",
	"--limit",
	"--message",
	"--min-spam",
	"--min-dr",
	"--min-truedr",
	"--opportunities-for",
	"--range",
	"--refresh",
	"--remove",
	"--remove-prompt",
	"--subject",
	"--title",
	"--type",
	"--xhandle",
]);

function positionalArgs(args: string[]): string[] {
	const positional: string[] = [];
	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i];
		if (VALUE_FLAGS.has(arg)) {
			i += 1;
			continue;
		}
		if (!arg.startsWith("--")) positional.push(arg);
	}
	return positional;
}

function domainArg(args: string[]): string {
	const positional = positionalArgs(args)[0];
	if (!positional) fail("A domain is required (e.g. example.com).", 2);
	return positional;
}

function commandDomainArg(args: string[]): string {
	const positional = positionalArgs(args).filter((value) => value !== "backlinks");
	const domain =
		positional.find((value) => value.includes(".")) ??
		positional[positional.length - 1];
	if (!domain) fail("A domain is required (e.g. example.com).", 2);
	return domain;
}

const DEFAULT_TIMEOUT_MS = 20000;
// A fresh index audit inspects up to 40 URLs against Google's URL Inspection
// API server-side, which routinely takes longer than the default timeout.
const GSC_AUDIT_RUN_TIMEOUT_MS = 180000;

async function request(
	args: string[],
	method: "GET" | "POST" | "DELETE",
	path: string,
	body?: Json,
	requireKey = true,
	timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<void> {
	out(await requestData(args, method, path, body, requireKey, timeoutMs));
}

async function requestData(
	args: string[],
	method: "GET" | "POST" | "DELETE",
	path: string,
	body?: Json,
	requireKey = true,
	timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Json> {
	return (
		await requestResult(
			args,
			method,
			path,
			body,
			requireKey,
			true,
			false,
			timeoutMs,
		)
	).data;
}

async function requestResult(
	args: string[],
	method: "GET" | "POST" | "DELETE",
	path: string,
	body?: Json,
	requireKey = true,
	failOnError = true,
	quietQuota = false,
	timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ApiResult> {
	const key = apiKey(args);
	if (requireKey && !key) {
		fail(
			"Missing API key. Set VERIFIEDDR_API_KEY=vdr_... or pass --key vdr_.... Create one free in your VerifiedDR dashboard. Free includes 10 calls/day; Pro includes 1,000 calls/month; Agency includes 10,000 calls/month.",
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
			signal: AbortSignal.timeout(timeoutMs),
		});
	} catch (error) {
		const message = `Request failed: ${error instanceof Error ? error.message : String(error)}`;
		if (!failOnError) throw new Error(message);
		fail(message, 4);
	}

	const remaining = response.headers.get("X-API-Quota-Remaining");
	const limit = response.headers.get("X-API-Quota-Limit");
	if (remaining && limit && !quietQuota) {
		process.stderr.write(`quota: ${remaining}/${limit} remaining\n`);
	}
	const tier = response.headers.get("X-API-Tier")?.toLowerCase() ?? null;

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
		if (!failOnError) throw new Error(message);
		failApiError(
			message,
			response.status === 402 ? 5 : 6,
			data as Json,
			response.status,
		);
	}
	return { data: { ok: true, ...(data as Json) }, tier };
}

function encode(value: string): string {
	return encodeURIComponent(value.trim().toLowerCase());
}

const USAGE = `VerifiedDR CLI: authority and trust data over the VerifiedDR API.

Quickstart:
  npx skills add VerifiedDR/verifieddr-cli   # install the agent skills
  npm install -g verifieddr                    # install the CLI
  export VERIFIEDDR_API_KEY=vdr_your_key       # free key in your dashboard
  vdr analyze verifieddr.com                   # score + next actions
  vdr next verifieddr.com                      # best next partner/action

Coach commands:
  vdr analyze <domain>                   Score, main issue, top actions
  vdr diagnose <domain>                  Why TrueDR is lower than DR
  vdr actions <domain>                   Ranked actions by impact/effort/confidence
  vdr opportunities <domain>             Verified partners, directories, backlink ideas
  vdr opportunities <domain> --contact <slug> --dry-run   Preview drafted mail to a partner
  vdr opportunities <domain> --contact <slug> --approve   Send the previewed draft
  vdr audit backlinks <domain>           Backlink risk review
  vdr content-plan <domain>              Authority-supporting page plan
  vdr fix <domain> [--goal +10]          30/60/90-day TrueDR growth plan
  vdr track <domain>                     TrueDR trend signals
  vdr explain <domain>                   Client/founder-ready explanation
  vdr boost <domain>                     Recommended campaign
  vdr next <domain>                      Best next partner/action

API commands (any approved site):
  vdr authority:lookup <domain>          DR, TrueDR, trust score, evidence
  vdr map <domain>                       Render the backlink map in your terminal
  vdr discover:find [filters]            Discover trusted sites, ranked by TrueDR
  vdr badge:snippets <domain>            Badge / embed snippets
  vdr categories:list                    Valid category values

Keyword research (Advanced/Ultra plans):
  vdr keywords:research "<keyword>" [--domain <yours>]
                                         DR the Google top 10 demands; with
                                         --domain also your gap and verdict
  vdr keywords:suggest <domain>          Winnable keywords the domain already
                                         ranks 4-30 for (any domain)
  vdr keywords:tracked <domain>          Your saved keyword targets with stored
                                         difficulty snapshots (own sites; free,
                                         reads stored data only)
  vdr keywords:tracked <domain> --add "<keyword>"
                                         Track a new keyword (snapshots its SERP)
  vdr keywords:tracked <domain> --refresh <id>
                                         Re-snapshot one saved keyword
  vdr keywords:tracked <domain> --remove <id>
                                         Stop tracking a keyword

Your own sites (owner-scoped):
  vdr sites:list                         List your sites + metrics
  vdr sites:get <domain>                 One of your sites with DR/traffic trends
  vdr sites:truedr <domain> [--detailed] Your site's TrueDR (+ signal breakdown)
  vdr sites:visibility <domain>          AI Visibility: how often ChatGPT,
                                         Perplexity, and Google AI Mode mention
                                         your site (stored snapshot + history)
  vdr sites:visibility <domain> --add-prompt "<question>"
                                         Track a new AI question (next refresh
                                         picks it up; Pro/Ultra)
  vdr sites:visibility <domain> --remove-prompt <id>
                                         Stop tracking a question
  vdr sites:visibility <domain> --reset-prompts
                                         Reseed questions from your keywords
  vdr sites:export <domain>              Machine-readable export of your site
  vdr sites:monitor [<domain>] [--daily] Watch changes + trust alerts
  vdr sites:submit <url> [--title --description --category --xhandle]
  vdr sites:verify <domain>              Re-check the badge embed
  vdr sites:gsc-performance <domain> [--range 28d]
                                         Clicks, impressions, CTR, position,
                                         and top queries/pages/countries/devices
  vdr sites:gsc-audit <domain> [--run]   Google index audit via your connected
                                         Search Console property (--run starts
                                         a fresh one; 12h cooldown)
  vdr sites:bing-setup                   Open Bing Webmaster Tools in your browser
                                         (no API key, sync, or quota usage)
  vdr sites:submit-urls <url> [url...]   Push new/updated URLs to search engines
                                         via IndexNow (Bing, Yandex, Seznam,
                                         Naver; Google has no such API). Needs
                                         an IndexNow key file hosted on the
                                         domain: --indexnow-key or INDEXNOW_KEY
                                         env; --generate-key to create one

discover:find filters:
  --category <slug>  --min-truedr <n>  --min-dr <n>
  --traffic-validated  --include-unverified  --limit <n> (max 50)
  --opportunities-for <domain>           Site-specific partner matches

opportunities filters:
  --type <all|partners|directories|backlinks>  --category <slug>  --min-truedr <n>
  --limit <n> (max 25)  --json
  --contact <slug|domain>  --dry-run (preview + store draft)
  --approve (send stored draft)  --subject <text>  --message <text>

Global flags: --key vdr_...   --base <url>   --version`;

/**
 * Pre-colon verbs from v0.1.x, kept as hidden aliases so older scripts and
 * agents keep working after the move to resource:action commands.
 */
const ALIASES: Record<string, string> = {
	analyze: "coach:analyze",
	diagnose: "coach:diagnose",
	actions: "coach:actions",
	opportunities: "coach:opportunities",
	audit: "coach:audit",
	"content-plan": "coach:content-plan",
	fix: "coach:fix",
	track: "coach:track",
	explain: "coach:explain",
	boost: "coach:boost",
	next: "coach:next",
	lookup: "authority:lookup",
	map: "authority:map",
	find: "discover:find",
	sites: "sites:list",
	site: "sites:get",
	truedr: "sites:truedr",
	visibility: "sites:visibility",
	"ai-visibility": "sites:visibility",
	export: "sites:export",
	monitor: "sites:monitor",
	submit: "sites:submit",
	verify: "sites:verify",
	"gsc-audit": "sites:gsc-audit",
	"submit-urls": "sites:submit-urls",
	snippets: "badge:snippets",
	categories: "categories:list",
	keywords: "keywords:research",
	keyword: "keywords:research",
};

type Lookup = {
	domain?: string | null;
	slug?: string | null;
	title?: string | null;
	authority?: {
		dr?: number | null;
		trueDr?: number | null;
		trustScore?: number | null;
		confidence?: string | null;
		trafficValidated?: boolean | null;
	};
	changes?: {
		drWeeklyChange?: number | null;
		drMonthlyChange?: number | null;
		trueDrWeeklyChange?: number | null;
		trueDrMonthlyChange?: number | null;
		trafficChange?: number | null;
	};
	evidence?: {
		traffic?: number | null;
		globalRank?: number | null;
		referringDomains?: number | null;
		backlinks?: number | null;
		gainedDomains?: number | null;
		lostDomains?: number | null;
		topBacklinks?: Array<{
			sourceDomain?: string;
			dr?: number;
			url?: string;
			anchor?: string | null;
			follow?: boolean;
		}>;
		bottomBacklinks?: Array<{
			sourceDomain?: string;
			dr?: number;
			url?: string;
			anchor?: string | null;
			follow?: boolean;
		}>;
		reportCreatedAt?: string | null;
	};
	links?: {
		page?: string;
		badge?: string;
	} | null;
};

type OpportunityCandidate = Lookup & {
	opportunity?: {
		type?: string;
		reason?: string;
		fitReasons?: string[];
	};
};

/**
 * Local, best-effort CLI state: outreach drafts awaiting approval and a log of
 * sent partnership contacts. Lives in ~/.verifieddr/state.json. Every reader
 * and writer swallows errors so state can never break a command; losing it
 * only means a draft has to be previewed again.
 */
const STATE_DIR =
	process.env.VERIFIEDDR_STATE_DIR || join(homedir(), ".verifieddr");
const STATE_FILE = join(STATE_DIR, "state.json");

type SavedDraft = { subject: string; message: string; savedAt: string };
type SentContact = {
	domain: string;
	target: string;
	to?: string;
	subject?: string;
	sentAt: string;
};
type CliState = {
	drafts?: Record<string, SavedDraft>;
	contacted?: SentContact[];
};

function readState(): CliState {
	try {
		const state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
		return state && typeof state === "object" ? (state as CliState) : {};
	} catch {
		return {};
	}
}

function writeState(state: CliState): void {
	try {
		mkdirSync(STATE_DIR, { recursive: true });
		writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
	} catch {
		// Best-effort only.
	}
}

function draftKey(domain: string, target: string): string {
	return `${domain.trim().toLowerCase()}|${target.trim().toLowerCase()}`;
}

function contactedEntry(
	state: CliState,
	domain: string,
	candidate: OpportunityCandidate | string,
): SentContact | undefined {
	const refs =
		typeof candidate === "string"
			? [candidate]
			: [candidate.slug, candidate.domain];
	const wanted = new Set(
		refs
			.filter((ref): ref is string => Boolean(ref))
			.map((ref) => ref.trim().toLowerCase()),
	);
	const own = domain.trim().toLowerCase();
	return state.contacted?.find(
		(entry) =>
			entry.domain === own &&
			(wanted.has(entry.target) || (entry.to != null && wanted.has(entry.to))),
	);
}

type ReferringDomain = {
	id?: string;
	domain?: string;
	dr?: number;
	backlinks?: number;
	linkType?: "dofollow" | "nofollow" | string;
	status?: "live" | "lost" | string;
	importance?: number;
	spamScore?: number;
};

type DrMap = {
	site?: {
		domain?: string;
		dr?: number;
		title?: string;
		verified?: boolean;
	};
	domains?: ReferringDomain[];
	totalDomains?: number;
};

type LookupContext = {
	lookup: Lookup;
	tier: ApiTier | null;
};

type CoachAction = {
	title: string;
	detail: string;
	impact: string;
	impactScore: number;
	effort: "low" | "medium" | "high";
	confidence: "medium" | "high";
	run: string;
};

async function lookupContext(args: string[]): Promise<LookupContext> {
	const result = await requestResult(
		args,
		"GET",
		`/api/v1/lookup/${encode(commandDomainArg(args))}`,
	);
	const lookup = result.data.lookup;
	if (!lookup || typeof lookup !== "object") {
		fail("Lookup response did not include authority data.", 6);
	}
	return { lookup: lookup as Lookup, tier: result.tier };
}

function num(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function signed(value: number): string {
	return `${value > 0 ? "+" : ""}${value}`;
}

function score(value: number | null): string {
	return value == null ? "unknown" : String(Math.round(value));
}

function gapOf(lookup: Lookup): number | null {
	const dr = num(lookup.authority?.dr);
	const trueDr = num(lookup.authority?.trueDr);
	return dr == null || trueDr == null ? null : Math.round(trueDr - dr);
}

function trafficWeak(lookup: Lookup): boolean {
	const traffic = num(lookup.evidence?.traffic);
	return lookup.authority?.trafficValidated !== true || traffic == null || traffic < 1000;
}

function trustWeak(lookup: Lookup): boolean {
	const trust = num(lookup.authority?.trustScore);
	return trust != null && trust < 60;
}

function mainIssue(lookup: Lookup): string {
	const gap = gapOf(lookup);
	const trust = num(lookup.authority?.trustScore);
	if (gap != null && gap <= -10 && trafficWeak(lookup) && trustWeak(lookup)) {
		return "DR is inflated relative to the site's traffic and link quality.";
	}
	if (gap != null && gap <= -10 && trafficWeak(lookup)) {
		return "DR is not backed by enough validated traffic.";
	}
	if (trust != null && trust < 50) {
		return "The backlink trust score is holding TrueDR below the headline DR.";
	}
	if (gap != null && gap < 0) {
		return "TrueDR trails DR because the supporting evidence is weaker than the headline score.";
	}
	return "TrueDR is broadly aligned with the available authority evidence.";
}

function actionPriority(action: CoachAction): number {
	const effortBonus = { low: 3, medium: 1, high: 0 }[action.effort];
	const confidenceBonus = action.confidence === "high" ? 2 : 0;
	return action.impactScore + effortBonus + confidenceBonus;
}

function coachActions(lookup: Lookup): CoachAction[] {
	const domain = lookup.domain || "domain.com";
	const actions: CoachAction[] = [];
	const referringDomains = num(lookup.evidence?.referringDomains);
	const trust = num(lookup.authority?.trustScore);
	const confidence = lookup.authority?.confidence;

	actions.push({
		title: "Contact one verified partner",
		detail:
			"Use VerifiedDR's partner matching to find a reachable site with category, TrueDR, DR, and traffic fit, then approve one focused outreach email.",
		impact: "High, roughly +3 to +8 TrueDR when the partnership earns a relevant mention or collaboration",
		impactScore: 9,
		effort: "low",
		confidence: "high",
		run: `vdr opportunities ${domain}`,
	});

	if (referringDomains == null || referringDomains < 50) {
		actions.push({
			title: "Add 5 relevant directory links",
			detail:
				"Start with category-specific directories and startup/SaaS directories where the site genuinely belongs.",
			impact: "Medium, roughly +3 to +6 TrueDR when the links are relevant",
			impactScore: 6,
			effort: "low",
			confidence: "high",
			run: `vdr opportunities ${domain} --type directories`,
		});
	}

	if (trustWeak(lookup)) {
		actions.push({
			title: "Reduce risky backlink signals",
			detail:
				"Prioritize irrelevant, weak, or spam-like referring domains before chasing more raw DR.",
			impact: "Medium, roughly +2 to +5 TrueDR if weak patterns are cleaned up or outweighed",
			impactScore: 5,
			effort: "medium",
			confidence: "high",
			run: `vdr audit backlinks ${domain}`,
		});
	}

	if (trafficWeak(lookup)) {
		actions.push({
			title: "Improve traffic validation",
			detail: "The authority score is not backed by enough visible organic traffic.",
			impact: "High, roughly +3 to +8 TrueDR when organic traffic evidence improves",
			impactScore: 8,
			effort: "high",
			confidence: "medium",
			run: `vdr content-plan ${domain}`,
		});
	}

	if (confidence !== "high") {
		actions.push({
			title: "Increase measurement confidence",
			detail:
				"More validated traffic and a larger clean backlink sample will make TrueDR less conservative.",
			impact: "Low to medium, roughly +1 to +4 TrueDR as confidence improves",
			impactScore: 4,
			effort: "medium",
			confidence: "medium",
			run: `vdr track ${domain}`,
		});
	}

	if (actions.length === 0) {
		actions.push({
			title: "Protect the current authority base",
			detail:
				"Monitor weekly changes and add only relevant links that reinforce the site's category.",
			impact: "Low, roughly +1 to +3 TrueDR from steady relevant authority gains",
			impactScore: 3,
			effort: "low",
			confidence: "medium",
			run: `vdr track ${domain}`,
		});
	}

	return actions.sort((a, b) => actionPriority(b) - actionPriority(a));
}

function printLines(lines: Array<string | null | undefined>): void {
	process.stdout.write(`${lines.filter((line) => line != null).join("\n")}\n`);
}

function mapLimit(args: string[]): number {
	const raw = Number(option(args, "--limit") || "24");
	if (!Number.isFinite(raw)) return 24;
	return Math.max(1, Math.min(60, Math.round(raw)));
}

function truncate(value: string, max: number): string {
	if (max <= 0) return "";
	if (max <= 3) return value.slice(0, max);
	if (value.length <= max) return value;
	return `${value.slice(0, max - 3)}...`;
}

function pad(value: string, width: number): string {
	return value.length >= width
		? value
		: `${value}${" ".repeat(width - value.length)}`;
}

function backlinkLabel(domain: ReferringDomain, maxWidth: number): string {
	const name = domain.domain || "unknown";
	const dr = typeof domain.dr === "number" ? Math.round(domain.dr) : "?";
	const backlinks =
		typeof domain.backlinks === "number" ? Math.max(0, domain.backlinks) : 0;
	const status =
		domain.status === "lost"
			? "lost"
			: typeof domain.spamScore === "number" && domain.spamScore >= 50
				? `spam ${domain.spamScore}`
				: domain.linkType === "nofollow"
					? "nofollow"
					: "follow";
	const suffix = `(DR ${dr}, ${status}, ${backlinks} link${backlinks === 1 ? "" : "s"})`;
	return `${truncate(name, maxWidth - suffix.length - 1)} ${suffix}`;
}

function renderBacklinkMap(map: DrMap, args: string[]): string {
	const allDomains = Array.isArray(map.domains) ? map.domains : [];
	const limit = Math.min(mapLimit(args), allDomains.length);
	const domains = allDomains.slice(0, limit);
	const width = Math.max(72, Math.min(140, process.stdout.columns || 100));
	const columnWidth = Math.floor((width - 15) / 2);
	const siteDomain = map.site?.domain || "site";
	const siteDr = typeof map.site?.dr === "number" ? Math.round(map.site.dr) : "?";
	const site = `${siteDomain} DR ${siteDr}`;
	const left: ReferringDomain[] = [];
	const right: ReferringDomain[] = [];
	domains.forEach((domain, index) => {
		if (index % 2 === 0) left.push(domain);
		else right.push(domain);
	});
	const rows = Math.max(left.length, right.length);
	const total = map.totalDomains ?? allDomains.length;
	const lines = [
		`Backlink Map - ${site}`,
		[
			`${total} referring domain${total === 1 ? "" : "s"}`,
			`showing ${domains.length}`,
			`${domains.filter((d) => d.linkType !== "nofollow" && d.status !== "lost").length} live follow`,
			`${domains.filter((d) => d.status === "lost").length} lost`,
			`${domains.filter((d) => typeof d.spamScore === "number" && d.spamScore >= 50).length} spam-flagged`,
		].join(" | "),
		"",
	];

	if (domains.length === 0) {
		lines.push("No referring domains found in the cached backlink map.");
		return lines.join("\n");
	}

	for (let index = 0; index < rows; index += 1) {
		const leftLabel = left[index] ? backlinkLabel(left[index], columnWidth) : "";
		const rightLabel = right[index]
			? backlinkLabel(right[index], columnWidth)
			: "";
		const connector =
			index === 0
				? `--- [ ${site} ] ---`
				: index % 2 === 0
					? "  \\       /  "
					: "  /       \\  ";
		lines.push(`${pad(leftLabel, columnWidth)} ${connector} ${rightLabel}`);
	}

	if (total > domains.length) {
		lines.push(
			"",
			`Showing top ${domains.length} by importance; ${total - domains.length} more cached referring domains hidden. Use --limit ${Math.min(total, 60)} to show more.`,
		);
	}

	return lines.join("\n");
}

async function authorityMap(args: string[]): Promise<void> {
	const result = await requestData(
		args,
		"GET",
		`/api/v1/map/${encode(domainArg(args))}`,
	);
	if (flag(args, "--json")) {
		out(result);
		return;
	}
	const map = result.map as DrMap | undefined;
	if (!map || typeof map !== "object") {
		fail("Map response did not include backlink map data.", 6);
	}
	process.stdout.write(`${renderBacklinkMap(map, args)}\n`);
}

function printScoreBlock(lookup: Lookup): void {
	const trueDr = num(lookup.authority?.trueDr);
	const dr = num(lookup.authority?.dr);
	const gap = gapOf(lookup);
	printLines([
		`TrueDR: ${score(trueDr)} / 100`,
		`DR: ${score(dr)}`,
		`Gap: ${gap == null ? "unknown" : signed(gap)}`,
	]);
}

function coachAnalyze(lookup: Lookup): void {
	const actions = coachActions(lookup).slice(0, 3);
	printScoreBlock(lookup);
	printLines(["", "Main issue:", mainIssue(lookup), "", "Top actions:"]);
	actions.forEach((action, index) => {
		printLines([
			`${index + 1}. ${action.title}`,
			`   ${action.detail}`,
			`   Heuristic impact: ${action.impact}`,
			`   Run: ${action.run}`,
			index === actions.length - 1 ? null : "",
		]);
	});
}

function coachDiagnose(lookup: Lookup): void {
	const trust = num(lookup.authority?.trustScore);
	const traffic = num(lookup.evidence?.traffic);
	const referringDomains = num(lookup.evidence?.referringDomains);
	printScoreBlock(lookup);
	printLines(["", "Diagnosis:", mainIssue(lookup)]);
	printLines([
		"",
		"Public evidence:",
		`- Trust score: ${score(trust)} / 100`,
		`- Traffic validated: ${lookup.authority?.trafficValidated === true ? "yes" : "no"}`,
		`- Traffic: ${traffic == null ? "unknown" : traffic}`,
		`- Referring domains: ${referringDomains == null ? "unknown" : referringDomains}`,
	]);
	printLines(["", `Next: ${coachActions(lookup)[0]?.run}`]);
}

function coachActionList(lookup: Lookup): void {
	printLines(["Ranked actions:"]);
	coachActions(lookup).forEach((action, index) => {
		printLines([
			`${index + 1}. ${action.title}`,
			`   Heuristic impact: ${action.impact}`,
			`   Effort: ${action.effort}`,
			`   Confidence: ${action.confidence}`,
			`   Why: ${action.detail}`,
			`   Run: ${action.run}`,
			"",
		]);
	});
}

function candidateLabel(
	site: Lookup,
	index: number,
): string {
	const trueDr = score(num(site.authority?.trueDr));
	const dr = score(num(site.authority?.dr));
	const traffic = num(site.evidence?.traffic);
	const metric = `TrueDR ${trueDr}, DR ${dr}${
		traffic == null ? "" : `, traffic ${traffic}`
	}`;
	const name = site.title || site.domain || `Potential partner ${index + 1}`;
	const domain = site.domain && site.domain !== name ? ` (${site.domain})` : "";
	return `${name}${domain}: ${metric}`;
}

async function fetchOpportunityCandidates(
	args: string[],
	domain: string,
	params: Record<string, string>,
): Promise<OpportunityCandidate[]> {
	const q = new URLSearchParams({ opportunitiesFor: domain, ...params });
	const result = await requestResult(
		args,
		"GET",
		`/api/v1/find?${q.toString()}`,
		undefined,
		true,
		false,
		true,
	);
	const sites =
		(result.data.opportunities as { candidates?: unknown[] } | undefined)
			?.candidates ?? [];
	return sites.filter((site): site is OpportunityCandidate =>
		Boolean(site && typeof site === "object"),
	);
}

function candidateLimit(args: string[]): number {
	const raw = Number(option(args, "--limit") || "5");
	if (!Number.isFinite(raw)) return 5;
	return Math.max(1, Math.min(25, Math.round(raw)));
}

/** Null means the fetch failed; an empty array means no matches. */
async function partnershipCandidates(
	lookup: Lookup,
	args: string[],
): Promise<OpportunityCandidate[] | null> {
	const limit = candidateLimit(args);
	const params: Record<string, string> = {
		trafficValidated: "true",
		limit: String(limit),
		minTrueDr: option(args, "--min-truedr") || "20",
	};
	const category = option(args, "--category");
	if (category) params.category = category;
	try {
		const sites = await fetchOpportunityCandidates(
			args,
			lookup.domain || commandDomainArg(args),
			params,
		);
		return sites.slice(0, limit);
	} catch {
		process.stderr.write(
			"partnership candidates unavailable; showing base opportunities\n",
		);
		return null;
	}
}

/**
 * Best-effort candidate lookup for a contact target, so drafted outreach can
 * cite the actual matched angle. Deliberately unfiltered: contact accepts any
 * discoverable candidate, so the draft lookup must too.
 */
async function findContactCandidate(
	args: string[],
	domain: string,
	target: string,
): Promise<OpportunityCandidate | null> {
	try {
		const sites = await fetchOpportunityCandidates(args, domain, {
			limit: "25",
			minTrueDr: "0",
		});
		const want = target.trim().toLowerCase();
		return (
			sites.find(
				(site) =>
					site.slug?.trim().toLowerCase() === want ||
					site.domain?.trim().toLowerCase() === want,
			) ?? null
		);
	} catch {
		return null;
	}
}

function draftOutreach(
	domain: string,
	target: string,
	candidate?: OpportunityCandidate | null,
): { subject: string; message: string } {
	const fallbackName = target
		.replace(/[-_]+/g, " ")
		.replace(/\s+(com|io|dev|me|best|net|org|co|app|ai)$/i, "")
		.trim();
	const targetName = candidate?.title || candidate?.domain || fallbackName;
	const reasons = [
		candidate?.opportunity?.reason,
		...(candidate?.opportunity?.fitReasons ?? []),
	]
		.filter((reason): reason is string => Boolean(reason?.trim()))
		.slice(0, 2);
	const fit =
		reasons.length > 0
			? `I found ${targetName} through VerifiedDR's partner matching: ${reasons.join("; ").replace(/[.\s]+$/, "")}.`
			: "VerifiedDR matched our sites as a partnership fit based on category and authority overlap.";
	const angle = candidate?.opportunity?.type?.trim().toLowerCase();
	const proposal =
		angle && angle !== "partnership"
			? `I'd like to explore ${/^[aeiou]/.test(angle) ? "an" : "a"} ${angle} between ${targetName} and ${domain} — or a mutual mention or content collaboration, whatever fits best on your side.`
			: "I'd like to explore a co-marketing swap: a mutual mention, a content collaboration, or an integration, whatever fits best on your side.";
	return {
		subject: `Partnership idea: ${domain} x ${targetName}`,
		message: `Hi, I run ${domain}. ${fit} ${proposal} Open to ideas.`,
	};
}

function shellQuote(value: string): string {
	return `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

async function contactPartnershipOpportunity(args: string[]): Promise<void> {
	const target = option(args, "--contact");
	if (!target) fail("--contact requires a listed opportunity slug or domain.", 2);
	const domain = commandDomainArg(args);
	const dryRun = flag(args, "--dry-run");
	const approve = flag(args, "--approve") && !dryRun;
	const json = flag(args, "--json");
	let subject = option(args, "--subject");
	let message = option(args, "--message");
	// A dry run previews drafted copy and stores it locally; the actual send
	// requires either --approve (send the stored draft unchanged) or the
	// approved subject and message passed back explicitly.
	let drafted = false;
	if (approve && (!subject || !message)) {
		const saved = readState().drafts?.[draftKey(domain, target)];
		if (!saved) {
			fail(
				`No stored draft for ${target}. Preview one first with:\n  vdr opportunities ${domain} --contact ${target} --dry-run`,
				2,
			);
		}
		subject = subject || saved.subject;
		message = message || saved.message;
	}
	if (dryRun && (!subject || !message)) {
		const candidate = await findContactCandidate(args, domain, target);
		const draft = draftOutreach(domain, target, candidate);
		subject = subject || draft.subject;
		message = message || draft.message;
		drafted = true;
	}
	if (!subject || !message) {
		fail(
			`Outreach copy is required to send. Preview a draft first with:\n  vdr opportunities ${domain} --contact ${target} --dry-run\nthen send it unchanged with --approve, or pass edited --subject and --message on the send.`,
			2,
		);
	}
	// No trafficValidated/minTrueDr defaults here: those are display-ranking
	// filters for the candidate list. Contact must accept any discoverable
	// candidate, or slugs surfaced by discover:find 404 on contact.
	const body: Json = {
		opportunitiesFor: domain,
		target,
		limit: 25,
		minTrueDr: Number(option(args, "--min-truedr") || "0"),
		subject,
		message,
	};
	const category = option(args, "--category");
	if (category) body.category = category;
	if (dryRun) {
		body.dryRun = true;
	}

	const result = await requestData(args, "POST", "/api/v1/find", body);
	const contact = result.contact as
		| {
				dryRun?: boolean;
				sent?: boolean;
				to?: Lookup;
				subject?: string;
				message?: string;
				quota?: { used?: number; limit?: number | null; plan?: string };
		  }
		| undefined;
	const to = contact?.to;
	const label = to?.title || to?.domain || target;
	const quota = contact?.quota;
	if (contact?.dryRun) {
		const previewSubject = contact.subject ?? subject;
		const previewMessage = contact.message ?? message;
		const state = readState();
		state.drafts = {
			...state.drafts,
			[draftKey(domain, target)]: {
				subject: previewSubject ?? "",
				message: previewMessage ?? "",
				savedAt: new Date().toISOString(),
			},
		};
		writeState(state);
		const approveCommand = `vdr opportunities ${domain} --contact ${target} --approve`;
		if (json) {
			out({
				ok: true,
				dryRun: true,
				to: label,
				subject: previewSubject ?? null,
				message: previewMessage ?? null,
				quota: quota ?? null,
				send: approveCommand,
			});
			return;
		}
		printLines([
			`Dry run: partnership email to ${label}.`,
			drafted
				? "Drafted copy (edit anything below before sending):"
				: null,
			previewSubject ? `Subject: ${previewSubject}` : null,
			previewMessage ? `Message: ${previewMessage}` : null,
			quota
				? `Partnership contacts: ${quota.used ?? "?"}/${quota.limit ?? "unlimited"} used (${quota.plan ?? "plan"})`
				: null,
			"Nothing was sent. Send this exact draft with:",
			`  ${approveCommand}`,
			"Or edit it on the send:",
			`  vdr opportunities ${domain} --contact ${target} --subject ${shellQuote(previewSubject ?? "")} --message ${shellQuote(previewMessage ?? "")}`,
		]);
		return;
	}
	const state = readState();
	state.contacted = [
		...(state.contacted ?? []),
		{
			domain: domain.trim().toLowerCase(),
			target: target.trim().toLowerCase(),
			...(to?.domain ? { to: to.domain.trim().toLowerCase() } : {}),
			subject: contact?.subject ?? subject,
			sentAt: new Date().toISOString(),
		},
	];
	if (state.drafts) delete state.drafts[draftKey(domain, target)];
	writeState(state);
	if (json) {
		out({
			ok: true,
			sent: true,
			to: label,
			subject: contact?.subject ?? subject ?? null,
			quota: quota ?? null,
		});
		return;
	}
	printLines([
		`Sent partnership email to ${label}.`,
		contact?.subject ? `Subject: ${contact.subject}` : null,
		quota
			? `Partnership contacts: ${quota.used ?? "?"}/${quota.limit ?? "unlimited"} used (${quota.plan ?? "plan"})`
			: null,
	]);
}

async function coachOpportunities(
	lookup: Lookup,
	args: string[],
): Promise<void> {
	if (option(args, "--contact")) {
		return contactPartnershipOpportunity(args);
	}
	const type = option(args, "--type") || "all";
	const domain = lookup.domain || domainArg(args);
	const trust = num(lookup.authority?.trustScore);
	const referringDomains = num(lookup.evidence?.referringDomains);
	const topBacklinks = lookup.evidence?.topBacklinks ?? [];
	const wantPartners = type === "all" || type === "partners";
	// Null means the candidate fetch failed; [] means no matches at the
	// current filters, which gets its own retry guidance below.
	const candidates = wantPartners
		? await partnershipCandidates(lookup, args)
		: null;
	const state = readState();
	const contactedOn = (site: OpportunityCandidate): string | null =>
		contactedEntry(state, domain, site)?.sentAt?.slice(0, 10) ?? null;
	const opportunities = [
		type === "all" || type === "directories"
			? `Relevant directories: ${
					referringDomains == null || referringDomains < 50
						? "start here because the referring-domain base is still thin."
						: "use selective category, startup, SaaS, founder, and local directories with real editorial standards."
				}`
			: null,
		type === "all" || type === "partners"
			? `Partner links: ask customers, integrations, communities, and portfolio pages for contextual mentions${
					topBacklinks.length > 0
						? ` similar to ${topBacklinks[0]?.sourceDomain || "the strongest current referring domains"}.`
						: "."
				}`
			: null,
		type === "all" || type === "backlinks"
			? `Backlink risk review: ${
					trust != null && trust < 60
						? "aggregate trust is weak, so review irrelevant or low-authority patterns before scaling outreach."
						: "keep new links relevant so the trust score does not lag DR."
				}`
			: null,
	].filter((line): line is string => Boolean(line));
	if (flag(args, "--json")) {
		out({
			ok: true,
			domain,
			type,
			suggestions: opportunities,
			candidates: (candidates ?? []).map((site) => ({
				domain: site.domain ?? null,
				slug: site.slug ?? null,
				title: site.title ?? null,
				trueDr: num(site.authority?.trueDr),
				dr: num(site.authority?.dr),
				traffic: num(site.evidence?.traffic),
				opportunity: site.opportunity ?? null,
				contactedAt: contactedOn(site),
			})),
		});
		return;
	}
	const minTrueDr = option(args, "--min-truedr") || "20";
	const noMatches = wantPartners && candidates != null && candidates.length === 0;
	const lines = [
		`Opportunities for ${domain}:`,
		"",
		...opportunities.map((line, index) => `${index + 1}. ${line}`),
		candidates != null && candidates.length > 0 ? "" : null,
		candidates != null && candidates.length > 0
			? "Potential partnerships:"
			: null,
		...(candidates ?? []).map((site, index) => {
			const ref = site.slug || site.domain || "";
			const sentOn = contactedOn(site);
			const angle = site.opportunity?.reason
				? `
   Angle: ${site.opportunity.type || "Partnership"} - ${site.opportunity.reason}`
				: "";
			const contactLines = sentOn
				? `
   Already contacted on ${sentOn}. Re-preview: vdr opportunities ${domain} --contact ${ref} --dry-run`
				: `
   Preview drafted mail: vdr opportunities ${domain} --contact ${ref} --dry-run
   Send the preview: vdr opportunities ${domain} --contact ${ref} --approve`;
			return `${index + 1}. ${candidateLabel(site, index)}${angle}${contactLines}`;
		}),
		noMatches ? "" : null,
		noMatches
			? `No partner matches with TrueDR >= ${minTrueDr} and validated traffic yet.`
			: null,
		noMatches
			? `Retry with a lower bar: vdr opportunities ${domain} --min-truedr 10`
			: null,
		noMatches
			? `Or narrow by niche: vdr opportunities ${domain} --category <slug> (list: vdr categories:list)`
			: null,
		"",
		"Next:",
		`Run: vdr actions ${domain}`,
	];
	printLines(lines);
}

function coachFix(lookup: Lookup, args: string[]): void {
	const domain = lookup.domain || domainArg(args);
	const goal = option(args, "--goal") || "+10";
	const actions = coachActions(lookup);
	printLines([
		`30/60/90-day TrueDR growth plan for ${domain}`,
		`Goal: ${goal} TrueDR`,
		"",
		"First 30 days:",
		`- ${actions[0]?.title || "Find the highest-impact authority gap"}`,
		`- Run: ${actions[0]?.run || `vdr next ${domain}`}`,
		"",
		"Days 31-60:",
		`- ${actions[1]?.title || "Build relevant partner and directory links"}`,
		`- Run: ${actions[1]?.run || `vdr opportunities ${domain}`}`,
		"",
		"Days 61-90:",
		`- ${actions[2]?.title || "Validate progress and remove remaining weak signals"}`,
		`- Run: ${actions[2]?.run || `vdr track ${domain}`}`,
		"",
		"Heuristic result:",
		"Meaningful TrueDR lift if the links are relevant, traffic improves, and weak signals are reduced.",
	]);
}

function coachTrack(lookup: Lookup): void {
	const changes = lookup.changes ?? {};
	printLines([
		`Tracking ${lookup.domain || "domain"}:`,
		`TrueDR weekly: ${changes.trueDrWeeklyChange == null ? "unknown" : signed(changes.trueDrWeeklyChange)}`,
		`TrueDR monthly: ${changes.trueDrMonthlyChange == null ? "unknown" : signed(changes.trueDrMonthlyChange)}`,
		`DR weekly: ${changes.drWeeklyChange == null ? "unknown" : signed(changes.drWeeklyChange)}`,
		`Traffic change: ${changes.trafficChange == null ? "unknown" : signed(changes.trafficChange)}`,
		"",
		changes.trueDrWeeklyChange != null && changes.trueDrWeeklyChange > 0
			? "Verdict: recent actions appear to be improving TrueDR."
			: "Verdict: no clear TrueDR lift is visible in the latest stored changes yet.",
		`Next: ${coachActions(lookup)[0]?.run}`,
	]);
}

function coachExplain(lookup: Lookup): void {
	const domain = lookup.domain || "this site";
	const dr = score(num(lookup.authority?.dr));
	const trueDr = score(num(lookup.authority?.trueDr));
	const gap = gapOf(lookup);
	printLines([
		`${domain} has a DR of ${dr}, but its VerifiedDR TrueDR is ${trueDr}.`,
		`That ${gap == null ? "gap" : `${signed(gap)} point gap`} means the headline authority score is ${
			gap != null && gap < 0 ? "stronger than" : "close to"
		} the supporting evidence from traffic, backlink quality, and trust signals.`,
		"",
		mainIssue(lookup),
		"",
		`Recommended next step: ${coachActions(lookup)[0]?.title}.`,
		`Run: ${coachActions(lookup)[0]?.run}`,
	]);
}

function coachBoost(lookup: Lookup): void {
	const domain = lookup.domain || "domain";
	const actions = coachActions(lookup).slice(0, 4);
	printLines([
		`Recommended campaign for ${domain}:`,
		...actions.map((action) => action.title),
		actions.length < 4
			? "Build 3 partner links from customers, integrations, or portfolio pages"
			: null,
		"",
		"Heuristic result:",
		"Medium to high TrueDR lift in 90 days if execution creates relevant links and stronger traffic evidence.",
		"",
		`Start with: ${coachActions(lookup)[0]?.run}`,
	]);
}

function coachAuditBacklinks(lookup: Lookup): void {
	const domain = lookup.domain || "domain";
	const trust = num(lookup.authority?.trustScore);
	const referringDomains = num(lookup.evidence?.referringDomains);
	const topBacklinks = lookup.evidence?.topBacklinks ?? [];
	const bottomBacklinks = lookup.evidence?.bottomBacklinks ?? [];
	printLines([`Backlink audit for ${domain}:`, ""]);
	printLines([
		`Trust score: ${score(trust)} / 100`,
		`Referring domains: ${referringDomains == null ? "unknown" : referringDomains}`,
		"",
		trust != null && trust < 60
			? "Risk: aggregate trust is weak enough to review irrelevant, spam-like, or low-authority referring domains."
			: "Risk: no major aggregate backlink risk is visible from the public lookup data.",
		"Note: full per-signal backlink risk detail is available only on owner-scoped TrueDR data.",
		"",
		topBacklinks.length > 0 ? "Strongest public backlink evidence:" : null,
		...topBacklinks.slice(0, 5).map((link, index) => {
			const source = link.sourceDomain || link.url || "unknown source";
			const dr = typeof link.dr === "number" ? `DR ${link.dr}` : "DR unknown";
			return `${index + 1}. ${source} (${dr})`;
		}),
		bottomBacklinks.length > 0 ? "" : null,
		bottomBacklinks.length > 0 ? "Weakest public backlink evidence:" : null,
		...bottomBacklinks.slice(0, 5).map((link, index) => {
			const source = link.sourceDomain || link.url || "unknown source";
			const dr = typeof link.dr === "number" ? `DR ${link.dr}` : "DR unknown";
			const follow = link.follow === false ? ", nofollow" : "";
			return `${index + 1}. ${source} (${dr}${follow})`;
		}),
		"",
		"Next:",
		trust != null && trust < 60
			? "Prioritize reviewing weak or irrelevant referring domains and outgrow them with clean, relevant links."
			: "Focus on adding relevant directory and partner links.",
		`Run: vdr opportunities ${domain}`,
	]);
}

function coachContentPlan(lookup: Lookup): void {
	const domain = lookup.domain || "domain";
	const traffic = num(lookup.evidence?.traffic);
	const trafficLine =
		traffic == null
			? "Traffic evidence is unknown, so start with pages that can validate organic demand."
			: `Current traffic evidence is ${traffic}, so prioritize pages that can compound organic discovery.`;
	printLines([
		`Authority content plan for ${domain}:`,
		trafficLine,
		"",
		"1. Publish one comparison or alternatives page targeting a high-intent category query.",
		"   Heuristic impact: supports organic traffic validation.",
		"",
		"2. Publish two integration, template, or workflow pages that partners can link to naturally.",
		"   Heuristic impact: improves relevant referring domains.",
		"",
		"3. Publish one original data or benchmark page that deserves editorial citations.",
		"   Heuristic impact: creates a stronger reason for quality backlinks.",
		"",
		`Track it: vdr track ${domain}`,
	]);
}

async function coachNext(
	lookup: Lookup,
	args: string[],
): Promise<void> {
	const action = coachActions(lookup)[0];
	const domain = lookup.domain || commandDomainArg(args);
	const partnerCandidates = action?.run.startsWith("vdr opportunities ")
		? ((await partnershipCandidates(lookup, args)) ?? [])
		: [];
	const state = readState();
	// Prefer a partner that has not been contacted yet; a repeated suggestion
	// reads as stale, and there is usually a fresh candidate right behind it.
	const partner =
		partnerCandidates.find(
			(site) => !contactedEntry(state, domain, site),
		) ?? partnerCandidates[0];
	const partnerRef = partner ? partner.slug || partner.domain || "" : "";
	printLines([
		`Best next action for ${domain}:`,
		action.title,
		"",
		`Why: ${action.detail}`,
		`Heuristic impact: ${action.impact}`,
		`Run: ${action.run}`,
		partner ? "" : null,
		partner ? "Suggested partner:" : null,
		partner ? candidateLabel(partner, 0) : null,
		partner?.opportunity?.reason
			? `Angle: ${partner.opportunity.type || "Partnership"} - ${partner.opportunity.reason}`
			: null,
		partnerRef
			? `Preview before sending: vdr opportunities ${domain} --contact ${partnerRef} --dry-run`
			: null,
		partnerRef
			? `Send the preview: vdr opportunities ${domain} --contact ${partnerRef} --approve`
			: null,
	]);
}

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

function indexNowKey(args: string[]): string | undefined {
	return (
		option(args, "--indexnow-key") ||
		process.env.INDEXNOW_KEY ||
		process.env.VERIFIEDDR_INDEXNOW_KEY
	);
}

/**
 * Submit URLs to IndexNow-compatible search engines (Bing, Yandex, Seznam,
 * Naver). This runs entirely client-side against api.indexnow.org: no
 * VerifiedDR API call, no quota spend. Google does not support IndexNow or any
 * public request-indexing API for regular pages; for Google, keep the sitemap
 * lastmod fresh and verify pickup with `vdr sites:gsc-audit`.
 */
async function sitesSubmitUrls(args: string[]): Promise<void> {
	if (flag(args, "--generate-key")) {
		const { randomBytes } = await import("node:crypto");
		const key = randomBytes(16).toString("hex");
		out({
			ok: true,
			indexNowKey: key,
			instructions: [
				`1. Host a plain-text file at https://<your-domain>/${key}.txt containing exactly: ${key}`,
				`2. Export it: export INDEXNOW_KEY=${key}`,
				"3. Submit: vdr sites:submit-urls https://<your-domain>/some-page",
			],
		});
		return;
	}

	const rawUrls = positionalArgs(args);
	if (rawUrls.length === 0) {
		fail(
			"At least one full URL is required (e.g. vdr sites:submit-urls https://example.com/blog/post).",
			2,
		);
	}
	if (rawUrls.length > 10000) {
		fail("IndexNow accepts at most 10,000 URLs per submission.", 2);
	}

	let host = "";
	const urls: string[] = [];
	for (const raw of rawUrls) {
		let parsed: URL;
		try {
			parsed = new URL(raw);
		} catch {
			fail(`Not a valid URL: ${raw}. Pass full URLs including https://.`, 2);
		}
		if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
			fail(`Unsupported protocol in URL: ${raw}`, 2);
		}
		if (!host) host = parsed.hostname;
		if (parsed.hostname !== host) {
			fail(
				`All URLs must share one host per submission. Got ${parsed.hostname}, expected ${host}.`,
				2,
			);
		}
		urls.push(parsed.toString());
	}

	const key = indexNowKey(args);
	if (!key) {
		fail(
			"Missing IndexNow key. Pass --indexnow-key <key> or set INDEXNOW_KEY. No key yet? Run: vdr sites:submit-urls --generate-key",
			3,
		);
	}

	const keyLocation =
		option(args, "--key-location") ?? `https://${host}/${key}.txt`;

	if (!flag(args, "--skip-verify")) {
		let served: string | null = null;
		try {
			const res = await fetch(keyLocation, {
				signal: AbortSignal.timeout(15000),
			});
			if (res.ok) served = (await res.text()).trim();
		} catch {
			served = null;
		}
		if (served !== key) {
			fail(
				`Key file check failed: ${keyLocation} must serve exactly the key. Host the file first (or pass --key-location / --skip-verify).`,
				4,
			);
		}
	}

	let response: Response;
	try {
		response = await fetch(INDEXNOW_ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/json; charset=utf-8" },
			body: JSON.stringify({ host, key, keyLocation, urlList: urls }),
			signal: AbortSignal.timeout(20000),
		});
	} catch (error) {
		fail(
			`IndexNow request failed: ${error instanceof Error ? error.message : String(error)}`,
			4,
		);
	}

	if (response.status !== 200 && response.status !== 202) {
		const reason =
			{
				400: "invalid request format",
				403: "key not valid for this host (check the key file)",
				422: "URLs do not belong to the host or key mismatch",
				429: "too many requests, slow down",
			}[response.status] ?? (await response.text().catch(() => ""));
		fail(`IndexNow rejected the submission (HTTP ${response.status}): ${reason}`, 4);
	}

	out({
		ok: true,
		indexNow: {
			host,
			status: response.status,
			submitted: urls.length,
			urls,
			keyLocation,
			engines: "Bing, Yandex, Seznam, Naver (shared IndexNow endpoint)",
			note: "Google does not support IndexNow. For Google, keep your sitemap lastmod fresh and verify pickup with `vdr sites:gsc-audit`.",
		},
	});
}

async function coach(command: string, args: string[]): Promise<void> {
	if (command === "coach:audit") {
		const first = positionalArgs(args)[0];
		if (first !== "backlinks") {
			fail("Usage: vdr audit backlinks <domain>", 2);
		}
	}
	// Contact only needs the domain string, so skip the lookup call: a
	// partnership contact spends one quota unit, not two.
	if (command === "coach:opportunities" && option(args, "--contact")) {
		return contactPartnershipOpportunity(args);
	}
	const context = await lookupContext(args);
	const { lookup } = context;
	switch (command) {
		case "coach:analyze":
			return coachAnalyze(lookup);
		case "coach:diagnose":
			return coachDiagnose(lookup);
		case "coach:actions":
			return coachActionList(lookup);
		case "coach:opportunities":
			return coachOpportunities(lookup, args);
		case "coach:audit":
			return coachAuditBacklinks(lookup);
		case "coach:content-plan":
			return coachContentPlan(lookup);
		case "coach:fix":
			return coachFix(lookup, args);
		case "coach:track":
			return coachTrack(lookup);
		case "coach:explain":
			return coachExplain(lookup);
		case "coach:boost":
			return coachBoost(lookup);
		case "coach:next":
			return coachNext(lookup, args);
		default:
			fail(`Unknown coach command: ${command}`, 2);
	}
}

async function main(): Promise<void> {
	const [rawCommand, ...args] = process.argv.slice(2);
	const command = rawCommand ? (ALIASES[rawCommand] ?? rawCommand) : rawCommand;

	switch (command) {
		case "coach:analyze":
		case "coach:diagnose":
		case "coach:actions":
		case "coach:opportunities":
		case "coach:audit":
		case "coach:content-plan":
		case "coach:fix":
		case "coach:track":
		case "coach:explain":
		case "coach:boost":
		case "coach:next":
			return coach(command, args);
		case "authority:lookup":
			return request(args, "GET", `/api/v1/lookup/${encode(domainArg(args))}`);
		case "authority:map":
			return authorityMap(args);
		case "badge:snippets":
			return request(
				args,
				"GET",
				`/api/v1/snippets/${encode(domainArg(args))}`,
			);
		case "sites:export":
			return request(args, "GET", `/api/v1/export/${encode(domainArg(args))}`);
		case "sites:get":
			return request(args, "GET", `/api/v1/sites/${encode(domainArg(args))}`);
		case "sites:list":
			return request(args, "GET", "/api/v1/sites");
		case "categories:list":
			return request(args, "GET", "/api/v1/categories");
		case "sites:truedr": {
			const detailed = flag(args, "--detailed") ? "?detailed=true" : "";
			return request(
				args,
				"GET",
				`/api/v1/sites/${encode(domainArg(args))}/truedr${detailed}`,
			);
		}
		case "sites:visibility": {
			const domain = encode(domainArg(args));
			const addPrompt = option(args, "--add-prompt");
			if (addPrompt) {
				return request(args, "POST", `/api/v1/sites/${domain}/ai-visibility`, {
					prompt: addPrompt,
				});
			}
			const removePrompt = option(args, "--remove-prompt");
			if (removePrompt) {
				return request(
					args,
					"DELETE",
					`/api/v1/sites/${domain}/ai-visibility?promptId=${encodeURIComponent(removePrompt)}`,
				);
			}
			if (flag(args, "--reset-prompts")) {
				return request(args, "POST", `/api/v1/sites/${domain}/ai-visibility`, {
					action: "reset",
				});
			}
			return request(args, "GET", `/api/v1/sites/${domain}/ai-visibility`);
		}
		case "keywords:research": {
			const keyword = positionalArgs(args)[0];
			if (!keyword) {
				fail('A keyword is required (e.g. "best crm for startups").', 2);
			}
			const q = new URLSearchParams({ keyword });
			const domain = option(args, "--domain");
			if (domain) q.set("domain", domain);
			return request(args, "GET", `/api/v1/keywords?${q}`);
		}
		case "keywords:suggest":
			return request(
				args,
				"GET",
				`/api/v1/keywords/suggestions/${encode(domainArg(args))}`,
			);
		case "keywords:tracked": {
			const domain = encode(domainArg(args));
			const addKeyword = option(args, "--add");
			if (addKeyword) {
				return request(args, "POST", `/api/v1/sites/${domain}/keywords`, {
					keyword: addKeyword,
				});
			}
			const refreshId = option(args, "--refresh");
			if (refreshId) {
				return request(args, "POST", `/api/v1/sites/${domain}/keywords`, {
					action: "refresh",
					id: refreshId,
				});
			}
			const removeId = option(args, "--remove");
			if (removeId) {
				return request(
					args,
					"DELETE",
					`/api/v1/sites/${domain}/keywords?id=${encodeURIComponent(removeId)}`,
				);
			}
			return request(args, "GET", `/api/v1/sites/${domain}/keywords`);
		}
		case "discover:find": {
			const q = new URLSearchParams();
			const category = option(args, "--category");
			if (category) q.set("category", category);
			const minTrueDr = option(args, "--min-truedr");
			if (minTrueDr) q.set("minTrueDr", minTrueDr);
			const minDr = option(args, "--min-dr");
			if (minDr) q.set("minDr", minDr);
			const opportunitiesFor = option(args, "--opportunities-for");
			if (opportunitiesFor) q.set("opportunitiesFor", opportunitiesFor);
			if (flag(args, "--traffic-validated")) q.set("trafficValidated", "true");
			if (flag(args, "--include-unverified")) q.set("includeUnverified", "true");
			const limit = option(args, "--limit");
			if (limit) q.set("limit", limit);
			const qs = q.toString();
			return request(args, "GET", `/api/v1/find${qs ? `?${qs}` : ""}`);
		}
		case "sites:monitor": {
			const q = new URLSearchParams();
			if (flag(args, "--daily")) q.set("daily", "true");
			const domain = args.find((a) => !a.startsWith("--"));
			if (domain) q.set("domain", domain.toLowerCase());
			const qs = q.toString();
			return request(args, "GET", `/api/v1/monitor${qs ? `?${qs}` : ""}`);
		}
		case "sites:verify":
			return request(args, "POST", "/api/v1/verify", {
				url: domainArg(args),
			});
		case "sites:gsc-audit": {
			const path = `/api/v1/sites/${encode(domainArg(args))}/gsc-audit`;
			// GET returns the latest stored audit; --run spends inspection budget
			// on a fresh one and waits for the full server-side run.
			const run = flag(args, "--run");
			return request(
				args,
				run ? "POST" : "GET",
				path,
				undefined,
				true,
				run ? GSC_AUDIT_RUN_TIMEOUT_MS : DEFAULT_TIMEOUT_MS,
			);
		}
		case "sites:gsc-performance": {
			const range = option(args, "--range") ?? "28d";
			const path = `/api/v1/sites/${encode(domainArg(args))}/gsc-performance?${new URLSearchParams({ range })}`;
			return request(args, "GET", path);
		}
		case "sites:bing-setup":
			return openBingWebmasterTools();
		case "sites:submit-urls":
			return sitesSubmitUrls(args);
		case "sites:submit": {
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
		case "--version":
		case "-v":
		case "version": {
			const { readFileSync } = await import("node:fs");
			const { fileURLToPath } = await import("node:url");
			const { dirname, join } = await import("node:path");
			const here = dirname(fileURLToPath(import.meta.url));
			const pkg = JSON.parse(
				readFileSync(join(here, "../package.json"), "utf8"),
			) as { version?: string };
			process.stdout.write(`${pkg.version ?? "unknown"}\n`);
			return;
		}
		default:
			process.stderr.write(`${USAGE}\n`);
			fail(`Unknown command: ${rawCommand}`, 2);
	}
}

main().catch((error) => {
	fail(error instanceof Error ? error.message : String(error));
});
