import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
	url: process.env.UPSTASH_REDIS_REST_URL!,
	token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const apiRatelimit = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(10, "10 s"),
	analytics: true,
	prefix: "scrapi:api",
});

export const aiRatelimit = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(3, "60 s"),
	analytics: true,
	prefix: "scrapi:ai",
});

export async function checkRateLimit(
	limiter: Ratelimit,
	identifier: string,
): Promise<Response | null> {
	const { success, limit, remaining, reset } = await limiter.limit(identifier);

	if (!success) {
		return Response.json(
			{ error: "Rate limit exceeded" },
			{
				status: 429,
				headers: {
					"X-RateLimit-Limit": limit.toString(),
					"X-RateLimit-Remaining": remaining.toString(),
					"X-RateLimit-Reset": reset.toString(),
				},
			},
		);
	}
	return null;
}
