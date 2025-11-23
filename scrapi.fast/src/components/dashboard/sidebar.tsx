"use client";

import { useState } from "react";
import {
	ChevronDown,
	ChevronRight,
	Folder,
	Globe,
	Rocket,
	Plus,
	Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Deployment {
	id: string;
	status: "active" | "building" | "error";
	timestamp: string;
}

interface Service {
	id: string;
	name: string;
	url: string;
	deployments: Deployment[];
}

interface Project {
	id: string;
	name: string;
	services: Service[];
}

// Mock data
const MOCK_PROJECTS: Project[] = [
	{
		id: "1",
		name: "E-commerce Scraper",
		services: [
			{
				id: "s1",
				name: "product-api",
				url: "product-api.scrapi.fast",
				deployments: [
					{ id: "d1", status: "active", timestamp: "2m ago" },
					{ id: "d2", status: "active", timestamp: "1h ago" },
				],
			},
			{
				id: "s2",
				name: "inventory-sync",
				url: "inventory.scrapi.fast",
				deployments: [
					{ id: "d3", status: "building", timestamp: "just now" },
				],
			},
		],
	},
	{
		id: "2",
		name: "Job Board Aggregator",
		services: [
			{
				id: "s3",
				name: "jobs-api",
				url: "jobs.scrapi.fast",
				deployments: [
					{ id: "d4", status: "active", timestamp: "5m ago" },
				],
			},
		],
	},
];

export function Sidebar() {
	const [projects] = useState<Project[]>(MOCK_PROJECTS);
	const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
		new Set(["1"])
	);
	const [expandedServices, setExpandedServices] = useState<Set<string>>(
		new Set(["s1"])
	);
	const [search, setSearch] = useState("");

	const toggleProject = (projectId: string) => {
		setExpandedProjects((prev) => {
			const next = new Set(prev);
			if (next.has(projectId)) {
				next.delete(projectId);
			} else {
				next.add(projectId);
			}
			return next;
		});
	};

	const toggleService = (serviceId: string) => {
		setExpandedServices((prev) => {
			const next = new Set(prev);
			if (next.has(serviceId)) {
				next.delete(serviceId);
			} else {
				next.add(serviceId);
			}
			return next;
		});
	};

	const getStatusColor = (status: Deployment["status"]) => {
		switch (status) {
			case "active":
				return "bg-primary";
			case "building":
				return "bg-yellow-500";
			case "error":
				return "bg-destructive";
		}
	};

	const filteredProjects = projects.filter((project) =>
		project.name.toLowerCase().includes(search.toLowerCase())
	);

	return (
		<div className="flex h-full w-64 flex-col border-r bg-background">
			{/* Header */}
			<div className="border-b p-3">
				<div className="mb-3 flex items-center justify-between">
					<span className="text-xs font-semibold text-muted-foreground">
						PROJECTS
					</span>
					<Button variant="ghost" size="sm" className="h-6 w-6 p-0">
						<Plus className="h-3.5 w-3.5" />
					</Button>
				</div>
				<div className="relative">
					<Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search projects..."
						className="h-7 pl-7 text-xs"
					/>
				</div>
			</div>

			{/* Projects List */}
			<div className="flex-1 overflow-auto p-2">
				{filteredProjects.map((project) => (
					<div key={project.id} className="mb-1">
						{/* Project */}
						<button
							onClick={() => toggleProject(project.id)}
							className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
						>
							{expandedProjects.has(project.id) ? (
								<ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
							) : (
								<ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
							)}
							<Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
							<span className="flex-1 truncate font-medium">
								{project.name}
							</span>
							<Badge
								variant="secondary"
								className="h-4 px-1.5 text-[9px] font-normal"
							>
								{project.services.length}
							</Badge>
						</button>

						{/* Services */}
						{expandedProjects.has(project.id) && (
							<div className="ml-4 mt-0.5 space-y-0.5">
								{project.services.map((service) => (
									<div key={service.id}>
										{/* Service */}
										<button
											onClick={() => toggleService(service.id)}
											className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
										>
											{expandedServices.has(service.id) ? (
												<ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
											) : (
												<ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
											)}
											<Globe className="h-3 w-3 shrink-0 text-primary" />
											<div className="flex-1 truncate font-mono">
												<div className="font-medium">{service.name}</div>
												<div className="text-[10px] text-muted-foreground">
													{service.url}
												</div>
											</div>
										</button>

										{/* Deployments */}
										{expandedServices.has(service.id) && (
											<div className="ml-4 mt-0.5 space-y-0.5">
												{service.deployments.map((deployment) => (
													<button
														key={deployment.id}
														className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
													>
														<Rocket className="h-3 w-3 shrink-0 text-muted-foreground" />
														<div className="flex-1">
															<div className="flex items-center gap-1.5">
																<div
																	className={cn(
																		"h-1.5 w-1.5 rounded-full",
																		getStatusColor(deployment.status)
																	)}
																/>
																<span className="text-[10px] text-muted-foreground">
																	{deployment.timestamp}
																</span>
															</div>
														</div>
													</button>
												))}
											</div>
										)}
									</div>
								))}
							</div>
						)}
					</div>
				))}

				{filteredProjects.length === 0 && (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<Folder className="mb-2 h-8 w-8 text-muted-foreground/50" />
						<p className="text-xs text-muted-foreground">No projects found</p>
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="border-t p-2">
				<Button
					variant="outline"
					size="sm"
					className="h-7 w-full justify-start text-xs"
				>
					<Plus className="mr-1.5 h-3 w-3" />
					New Project
				</Button>
			</div>
		</div>
	);
}
