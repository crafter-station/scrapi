import {
	SignedIn,
	SignedOut,
	SignInButton,
	SignUpButton,
	UserButton,
} from "@clerk/nextjs";
import { ArrowRight, Code2, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { DotMatrix } from "@/components/dot-matrix";
import { ScrapiLongLogo } from "@/components/scrapi-long-logo";
import { ThemeSwitcherButton } from "@/components/theme-switcher-button";
import { Button } from "@/components/ui/button";

export default async function Home() {
	return (
		<div className="flex min-h-screen flex-col">
			{/* Header */}
			<header className="sticky top-0 z-50 h-header w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container mx-auto flex h-full items-center justify-between px-4">
					<ScrapiLongLogo className="h-7 w-auto" />
					<div className="flex items-center gap-4">
						<ThemeSwitcherButton />
						<SignedOut>
							<div className="flex gap-2">
								<SignInButton />
								<SignUpButton />
							</div>
						</SignedOut>
						<SignedIn>
							<UserButton />
						</SignedIn>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<section className="overflow-hidden relative">
				<DotMatrix
					variant="diamond"
					pixelSize={2}
					patternScale={1}
					patternDensity={1.5}
					enableRipples={true}
					rippleIntensityScale={1.5}
					rippleSpeed={0.4}
					speed={1.8}
					edgeFade={0.2}
				/>
				<div className="flex flex-col items-center justify-center gap-8 py-24 px-6 md:px-8 lg:px-16 xl:px-24 text-center md:py-32 relative z-10 bg-background/0">
					<Link
						href="https://platanus-votes.vercel.app/"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center rounded-full border bg-background px-4 py-2 text-sm shadow-sm hover:bg-accent transition-colors"
					>
						<Zap className="mr-2 h-4 w-4 text-primary" />
						<span className="font-medium">
							Vote for us at Platanus Hack 2025!
						</span>
					</Link>

					<h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
						Turn websites into{" "}
						<span className="text-primary">deterministic APIs</span>
					</h1>

					<p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
						Transform any website into a reliable, structured API endpoint. No
						more fragile scraping scripts. Just query in natural language and
						get clean JSON.
					</p>

					<div className="flex flex-col gap-4 sm:flex-row">
						<SignedOut>
							<SignInButton mode="modal">
								<Button size="lg" className="group">
									Get Started
									<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
								</Button>
							</SignInButton>
						</SignedOut>
						<SignedIn>
							<Button asChild size="lg" className="group">
								<Link href="/dashboard">
									Get Started
									<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
								</Link>
							</Button>
						</SignedIn>
						<Button variant="outline" size="lg">
							<Code2 className="mr-2 h-4 w-4" />
							View Docs
						</Button>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="flex gap-[1px]">
				<div className="w-8 md:w-12 lg:w-16 xl:w-24 bg-background border-r border-dotted border-border" />
				<div className="flex-auto space-y-[1px]">
					<div className="bg-background overflow-hidden border-y border-dotted border-border">
						<div className="py-16 px-6 md:px-8 lg:px-16 xl:px-24 md:py-20">
							<div className="grid gap-8 md:grid-cols-3">
								<div className="flex flex-col gap-4 rounded-lg border bg-card p-8 text-card-foreground transition-all hover:shadow-lg">
									<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
										<Zap className="h-6 w-6 text-primary-foreground" />
									</div>
									<h3 className="text-xl font-bold">Lightning Fast</h3>
									<p className="text-muted-foreground leading-relaxed">
										Execute scraping jobs in milliseconds using Browserbase
										automation. Built for performance from the ground up.
									</p>
								</div>

								<div className="flex flex-col gap-4 rounded-lg border bg-card p-8 text-card-foreground transition-all hover:shadow-lg">
									<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
										<Code2 className="h-6 w-6 text-primary-foreground" />
									</div>
									<h3 className="text-xl font-bold">Natural Language</h3>
									<p className="text-muted-foreground leading-relaxed">
										Describe what you want in plain English. Our AI handles the
										complex extraction logic automatically.
									</p>
								</div>

								<div className="flex flex-col gap-4 rounded-lg border bg-card p-8 text-card-foreground transition-all hover:shadow-lg">
									<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
										<Shield className="h-6 w-6 text-primary-foreground" />
									</div>
									<h3 className="text-xl font-bold">Deterministic</h3>
									<p className="text-muted-foreground leading-relaxed">
										Get consistent, reliable results every time. No more brittle
										selectors breaking on site updates.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="w-8 md:w-12 lg:w-16 xl:w-24 bg-background border-l border-dotted border-border" />
			</section>

			{/* Code Example Section */}
			<section className="flex gap-[1px]">
				<div className="w-8 md:w-12 lg:w-16 xl:w-24 bg-stripes border-r border-dotted border-border" />
				<div className="flex-auto space-y-[1px]">
					<div className="bg-background overflow-hidden border-y border-dotted border-border">
						<div className="py-16 px-6 md:px-8 lg:px-16 xl:px-24 md:py-20">
							<div className="mx-auto max-w-3xl">
								<h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">
									Simple API, Powerful Results
								</h2>
								<CodeBlock
									lang="javascript"
									code={`// Input: Natural language query
const query = "Get product name, price, and rating";

// Output: Clean, structured API
const api = await sf.create({
  url: "https://example.com/product",
  query: query
});

// Use your new API
const data = await api.fetch();
console.log(data);
// {
//   productName: "...",
//   price: "...",
//   rating: "..."
// }`}
								/>
							</div>
						</div>
					</div>
				</div>
				<div className="w-8 md:w-12 lg:w-16 xl:w-24 bg-stripes border-l border-dotted border-border" />
			</section>

			{/* CTA Section */}
			<section className="flex items-center justify-center p-4 py-24 md:py-32">
				<div className="w-full max-w-6xl">
					<div className="relative overflow-hidden rounded-3xl border border-border bg-card px-8 py-16 md:px-20 md:py-24 lg:py-28">
						{/* Subtle grid pattern */}
						<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />

						{/* Top accent line */}
						<div className="absolute top-0 left-1/2 h-px w-1/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

						<div className="relative z-10 mx-auto max-w-3xl">
							<h2 className="text-balance text-center font-semibold leading-[1.1] tracking-[-0.02em] text-foreground text-[clamp(2rem,5vw,4rem)]">
								Ready to scrape{" "}
								<span className="relative inline-block">
									<span className="relative z-10">smarter</span>
									<span className="absolute inset-x-0 -bottom-1 h-3 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 blur-sm" />
								</span>
								?
							</h2>

							<p className="mt-6 text-pretty text-center text-lg leading-relaxed text-muted-foreground md:text-xl">
								Join developers building better integrations with{" "}
								<span className="font-medium text-foreground">scrapi.fast</span>
							</p>

							<div className="mt-10 flex justify-center">
								<SignedOut>
									<SignInButton mode="modal">
										<Button
											size="lg"
											className="group relative h-14 gap-2.5 overflow-hidden rounded-xl px-10 text-base font-semibold transition-all duration-300 hover:scale-[1.02] hover:opacity-90 hover:shadow-lg active:scale-[0.98]"
										>
											<span className="relative z-10 flex items-center gap-2.5">
												Start Building
												<ArrowRight className="h-4 w-4 transition-all duration-300 group-hover:translate-x-1" />
											</span>
										</Button>
									</SignInButton>
								</SignedOut>
								<SignedIn>
									<Button
										asChild
										size="lg"
										className="group relative h-14 gap-2.5 overflow-hidden rounded-xl px-10 text-base font-semibold transition-all duration-300 hover:scale-[1.02] hover:opacity-90 hover:shadow-lg active:scale-[0.98]"
									>
										<Link href="/dashboard">
											<span className="relative z-10 flex items-center gap-2.5">
												Start Building
												<ArrowRight className="h-4 w-4 transition-all duration-300 group-hover:translate-x-1" />
											</span>
										</Link>
									</Button>
								</SignedIn>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
