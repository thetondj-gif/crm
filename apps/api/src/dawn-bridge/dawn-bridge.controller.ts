import type { Db } from "@crm/db";
import { Controller, Get, Headers, Param, Query } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { InjectDatabase } from "../database/database.constants";
import { DawnBridgeAuth } from "./dawn-bridge.auth";

@Controller("internal/dawn")
@AllowAnonymous()
export class DawnBridgeController {
	constructor(
		@InjectDatabase() private readonly db: Db,
		private readonly auth: DawnBridgeAuth,
	) {}

	private authorize(value: string | undefined) {
		this.auth.assertAuthorized(value);
	}

	@Get("health")
	async health(@Headers("authorization") authorization: string | undefined) {
		this.authorize(authorization);
		await this.db.$queryRaw`SELECT 1`;
		return { status: "ok", bridge: "dawn-crm", mode: "read-only" };
	}

	@Get("search")
	async search(
		@Headers("authorization") authorization: string | undefined,
		@Query("q") query = "",
	) {
		this.authorize(authorization);
		const term = query.trim();
		if (term.length < 2) return { hits: [] };

		const [companies, contacts, deals] = await Promise.all([
			this.db.company.findMany({
				where: {
					OR: [
						{ name: { contains: term, mode: "insensitive" } },
						{ domain: { contains: term, mode: "insensitive" } },
					],
				},
				take: 10,
				orderBy: { name: "asc" },
				select: { id: true, name: true, domain: true, industry: true },
			}),
			this.db.contact.findMany({
				where: {
					OR: [
						{ firstName: { contains: term, mode: "insensitive" } },
						{ lastName: { contains: term, mode: "insensitive" } },
						{ email: { contains: term, mode: "insensitive" } },
					],
				},
				take: 10,
				orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
				select: {
					id: true,
					firstName: true,
					lastName: true,
					email: true,
					title: true,
					company: { select: { id: true, name: true } },
				},
			}),
			this.db.deal.findMany({
				where: { name: { contains: term, mode: "insensitive" } },
				take: 10,
				orderBy: [{ stage: "asc" }, { name: "asc" }],
				select: {
					id: true,
					name: true,
					stage: true,
					amount: true,
					currency: true,
					company: { select: { id: true, name: true } },
				},
			}),
		]);

		return { companies, contacts, deals };
	}

	@Get("companies/:id")
	async company(
		@Headers("authorization") authorization: string | undefined,
		@Param("id") id: string,
	) {
		this.authorize(authorization);
		return this.db.company.findUnique({
			where: { id },
			select: {
				id: true,
				name: true,
				domain: true,
				website: true,
				description: true,
				industry: true,
				subIndustry: true,
				city: true,
				country: true,
				phone: true,
				email: true,
				linkedinUrl: true,
				lastActivityAt: true,
				createdAt: true,
				owner: { select: { id: true, name: true, email: true } },
				contacts: {
					select: { id: true, firstName: true, lastName: true, email: true, title: true },
				},
				deals: {
					select: { id: true, name: true, stage: true, amount: true, currency: true, expectedCloseDate: true },
				},
			},
		});
	}

	@Get("contacts/:id")
	async contact(
		@Headers("authorization") authorization: string | undefined,
		@Param("id") id: string,
	) {
		this.authorize(authorization);
		return this.db.contact.findUnique({
			where: { id },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true,
				phone: true,
				title: true,
				linkedinUrl: true,
				lastActivityAt: true,
				createdAt: true,
				company: { select: { id: true, name: true, domain: true } },
				owner: { select: { id: true, name: true, email: true } },
				facts: {
					where: { status: { in: ["APPLIED", "PROPOSED"] } },
					select: { id: true, field: true, value: true, band: true, status: true, method: true, sourceUrl: true, observedAt: true },
				},
				deals: {
					select: { role: true, deal: { select: { id: true, name: true, stage: true, amount: true, currency: true } } },
				},
			},
		});
	}

	@Get("deals/:id")
	async deal(
		@Headers("authorization") authorization: string | undefined,
		@Param("id") id: string,
	) {
		this.authorize(authorization);
		return this.db.deal.findUnique({
			where: { id },
			select: {
				id: true,
				name: true,
				description: true,
				stage: true,
				stageChangedAt: true,
				amount: true,
				currency: true,
				expectedCloseDate: true,
				closedAt: true,
				closedReason: true,
				lastActivityAt: true,
				company: { select: { id: true, name: true, domain: true } },
				owner: { select: { id: true, name: true, email: true } },
				contacts: {
					select: { role: true, contact: { select: { id: true, firstName: true, lastName: true, email: true, title: true } } },
				},
			},
		});
	}

	@Get("pipeline")
	async pipeline(@Headers("authorization") authorization: string | undefined) {
		this.authorize(authorization);
		const rows = await this.db.deal.groupBy({
			by: ["stage", "currency"],
			_count: { _all: true },
			_sum: { amount: true },
		});
		return {
			generatedAt: new Date().toISOString(),
			rows: rows.map((row) => ({
				stage: row.stage,
				currency: row.currency,
				count: row._count._all,
				amount: row._sum.amount,
			})),
		};
	}
}
