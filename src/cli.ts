#!/usr/bin/env node

/**
 * VerifiedDR CLI — a thin, dependency-free HTTP client for the public
 * VerifiedDR API (https://verifieddr.com/api/v1). It never touches a database
 * or any admin credential; every call is authenticated with your own
 * `vdr_…` API key and metered against your plan's quota.
 *
 * Auth:  VERIFIEDDR_API_KEY=vdr_…   (or pass --key vdr_…)
 * Base:  VERIFIEDDR_API_BASE=https://verifieddr.com   (override for testing)
 */

const DEFAULT_BASE = "https://verifieddr.com";

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
	"--base",
	"--category",
	"--description",
	"--goal",
	"--key",
	"--limit",
	"--min-dr",
	"--min-truedr",
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

async function request(
	args: string[],
	method: "GET" | "POST",
	path: string,
	body?: Json,
	requireKey = true,
): Promise<void> {
	out(await requestData(args, method, path, body, requireKey));
}

async function requestData(
	args: string[],
	method: "GET" | "POST",
	path: string,
	body?: Json,
	requireKey = true,
): Promise<Json> {
	return (await requestResult(args, method, path, body, requireKey)).data;
}

async function requestResult(
	args: string[],
	method: "GET" | "POST",
	path: string,
	body?: Json,
	requireKey = true,
	failOnError = true,
	quietQuota = false,
): Promise<ApiResult> {
	const key = apiKey(args);
	if (requireKey && !key) {
		fail(
			"Missing API key. Set VERIFIEDDR_API_KEY=vdr_… or pass --key vdr_…. Create one free in your VerifiedDR dashboard — Free includes 10 calls/day; Pro includes 1,000 calls/month; Agency includes 10,000 calls/month.",
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
		fail(message, response.status === 402 ? 5 : 6);
	}
	return { data: { ok: true, ...(data as Json) }, tier };
}

function encode(value: string): string {
	return encodeURIComponent(value.trim().toLowerCase());
}

const USAGE = `VerifiedDR CLI — authority & trust data over the VerifiedDR API.

Quickstart:
  npx skills add thijssmudde/verifieddr-cli   # install the agent skill
  npm install -g verifieddr                    # install the CLI
  export VERIFIEDDR_API_KEY=vdr_your_key       # free key in your dashboard
  vdr analyze verifieddr.com                   # score + next actions
  vdr next verifieddr.com                      # single best next action

Coach commands:
  vdr analyze <domain>                   Score, main issue, top actions
  vdr diagnose <domain>                  Why TrueDR is lower than DR
  vdr actions <domain>                   Ranked actions by impact/effort/confidence
  vdr opportunities <domain>             Directories, partner, backlink ideas
  vdr audit backlinks <domain>           Backlink risk review
  vdr content-plan <domain>              Authority-supporting page plan
  vdr fix <domain> [--goal +10]          30/60/90-day TrueDR growth plan
  vdr track <domain>                     TrueDR trend signals
  vdr explain <domain>                   Client/founder-ready explanation
  vdr boost <domain>                     Recommended campaign
  vdr next <domain>                      Single best next action

API commands (any approved site):
  vdr authority:lookup <domain>          DR, TrueDR, trust score, evidence
  vdr discover:find [filters]            Discover trusted sites, ranked by TrueDR
  vdr badge:snippets <domain>            Badge / embed snippets
  vdr categories:list                    Valid category values

Your own sites (owner-scoped):
  vdr sites:list                         List your sites + metrics
  vdr sites:get <domain>                 One of your sites with DR/traffic trends
  vdr sites:truedr <domain> [--detailed] Your site's TrueDR (+ signal breakdown)
  vdr sites:export <domain>              Machine-readable export of your site
  vdr sites:monitor [<domain>] [--daily] Watch changes + trust alerts
  vdr sites:submit <url> [--title --description --category --xhandle]
  vdr sites:verify <domain>              Re-check the badge embed

discover:find filters:
  --category <slug>  --min-truedr <n>  --min-dr <n>
  --traffic-validated  --include-unverified  --limit <n> (max 50)

opportunities filters:
  --type <all|directories|partners|backlinks>  --category <slug>  --min-truedr <n>

Global flags: --key vdr_…   --base <url>`;

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
	find: "discover:find",
	sites: "sites:list",
	site: "sites:get",
	truedr: "sites:truedr",
	export: "sites:export",
	monitor: "sites:monitor",
	submit: "sites:submit",
	verify: "sites:verify",
	snippets: "badge:snippets",
	categories: "categories:list",
};

type Lookup = {
	domain?: string | null;
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
		reportCreatedAt?: string | null;
	};
	links?: {
		page?: string;
		badge?: string;
	} | null;
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

function canShowPartnerNames(tier: ApiTier | null): boolean {
	return tier === "pro" || tier === "agency";
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
	showNames: boolean,
): string {
	const trueDr = score(num(site.authority?.trueDr));
	const dr = score(num(site.authority?.dr));
	const traffic = num(site.evidence?.traffic);
	const metric = `TrueDR ${trueDr}, DR ${dr}${
		traffic == null ? "" : `, traffic ${traffic}`
	}`;
	if (!showNames) return `Potential partner ${index + 1}: ${metric}`;
	const name = site.title || site.domain || `Potential partner ${index + 1}`;
	const domain = site.domain && site.domain !== name ? ` (${site.domain})` : "";
	return `${name}${domain}: ${metric}`;
}

async function partnershipCandidates(
	lookup: Lookup,
	args: string[],
): Promise<Lookup[]> {
	const q = new URLSearchParams();
	q.set("opportunitiesFor", lookup.domain || commandDomainArg(args));
	q.set("trafficValidated", "true");
	q.set("limit", "5");
	const minTrueDr = option(args, "--min-truedr") || "20";
	q.set("minTrueDr", minTrueDr);
	const category = option(args, "--category");
	if (category) q.set("category", category);
	try {
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
		return sites
			.filter((site): site is Lookup => Boolean(site && typeof site === "object"))
			.slice(0, 5);
	} catch {
		process.stderr.write(
			"partnership candidates unavailable; showing base opportunities\n",
		);
		return [];
	}
}

async function coachOpportunities(
	lookup: Lookup,
	args: string[],
	tier: ApiTier | null,
): Promise<void> {
	const type = option(args, "--type") || "all";
	const domain = lookup.domain || domainArg(args);
	const trust = num(lookup.authority?.trustScore);
	const referringDomains = num(lookup.evidence?.referringDomains);
	const topBacklinks = lookup.evidence?.topBacklinks ?? [];
	const showNames = canShowPartnerNames(tier);
	const candidates =
		type === "all" || type === "partners"
			? await partnershipCandidates(lookup, args)
			: [];
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
					topBacklinks.length > 0 && showNames
						? ` similar to ${topBacklinks[0]?.sourceDomain || "the strongest current referring domains"}.`
						: "."
				}`
			: null,
		type === "all" || type === "backlinks"
			? `Backlink cleanup: ${
					trust != null && trust < 60
						? "aggregate trust is weak, so review irrelevant or low-authority patterns before scaling outreach."
						: "keep new links relevant so the trust score does not lag DR."
				}`
			: null,
	].filter((line): line is string => Boolean(line));
	const lines = [
		`Opportunities for ${domain}:`,
		"",
		...opportunities.map((line, index) => `${index + 1}. ${line}`),
		candidates.length > 0 ? "" : null,
		candidates.length > 0
			? showNames
				? "Potential partnerships:"
				: "Potential partnerships (names hidden on Free):"
			: null,
		...candidates.map((site, index) =>
			`${index + 1}. ${candidateLabel(site, index, showNames)}`,
		),
		candidates.length > 0 && !showNames
			? "Upgrade to Pro or Agency to see actual partner names."
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
		"",
		"Next:",
		trust != null && trust < 60
			? "Prioritize cleanup or replacement of weak/irrelevant referring domains."
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

function coachNext(lookup: Lookup): void {
	const action = coachActions(lookup)[0];
	printLines([
		`Best next action for ${lookup.domain || "domain"}:`,
		action.title,
		"",
		`Why: ${action.detail}`,
		`Heuristic impact: ${action.impact}`,
		`Run: ${action.run}`,
	]);
}

async function coach(command: string, args: string[]): Promise<void> {
	if (command === "coach:audit") {
		const first = positionalArgs(args)[0];
		if (first !== "backlinks") {
			fail("Usage: vdr audit backlinks <domain>", 2);
		}
	}
	const context = await lookupContext(args);
	const { lookup, tier } = context;
	switch (command) {
		case "coach:analyze":
			return coachAnalyze(lookup);
		case "coach:diagnose":
			return coachDiagnose(lookup);
		case "coach:actions":
			return coachActionList(lookup);
		case "coach:opportunities":
			return coachOpportunities(lookup, args, tier);
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
			return coachNext(lookup);
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
		case "discover:find": {
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
		default:
			process.stderr.write(`${USAGE}\n`);
			fail(`Unknown command: ${rawCommand}`, 2);
	}
}

main().catch((error) => {
	fail(error instanceof Error ? error.message : String(error));
});
