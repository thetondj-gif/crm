import { timingSafeEqual } from "node:crypto";
import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

function constantTimeEqual(left: string, right: string): boolean {
	const a = Buffer.from(left, "utf8");
	const b = Buffer.from(right, "utf8");
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

@Injectable()
export class DawnBridgeAuth {
	constructor(private readonly config: ConfigService) {}

	assertAuthorized(authorization: string | undefined): void {
		const expected = this.config.get<string>("DAWN_SERVICE_TOKEN")?.trim();
		if (!expected) {
			throw new ServiceUnavailableException({
				status: "disabled",
				reason: "DAWN service bridge is not configured",
			});
		}

		const [scheme, token] = (authorization ?? "").split(" ", 2);
		if (scheme !== "Bearer" || !token || !constantTimeEqual(token, expected)) {
			throw new UnauthorizedException({ status: "unauthorized" });
		}
	}
}
