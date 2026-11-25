/**
 * Tests for the "Frontmatter property" project detection method:
 * a folder is a project when its folder note has e.g. `Class: Project`.
 */

import { TFile } from "obsidian";
import { ProjectConfigManager } from "../managers/project-config-manager";

function setup(files: Record<string, Record<string, any>>, rule: string) {
	const fileObjs = new Map<string, TFile>();
	for (const path of Object.keys(files)) {
		const file = new TFile(path, path.split("/").pop() || "");
		(file as any).stat = { mtime: 1 };
		fileObjs.set(path, file);
	}
	const vault = {
		getFileByPath: (p: string) => fileObjs.get(p) || null,
		getAbstractFileByPath: (p: string) => fileObjs.get(p) || null,
	};
	const metadataCache = {
		getFileCache: (f: TFile) => ({ frontmatter: files[f.path] }),
	};
	return new ProjectConfigManager({
		vault: vault as any,
		metadataCache: metadataCache as any,
		configFileName: "project.md",
		searchRecursively: false,
		metadataKey: "project",
		pathMappings: [],
		metadataMappings: [],
		defaultProjectNaming: {
			strategy: "filename",
			stripExtension: true,
			enabled: false,
		},
		enhancedProjectEnabled: true,
		metadataConfigEnabled: false,
		configFileEnabled: false,
		detectionMethods: [
			{ type: "frontmatterProperty", propertyKey: rule, enabled: true },
		],
	});
}

const vaultFiles = {
	"Work/Client X/Client X.md": { Class: "Project" },
	"Work/Client X/Meetings/2026-11-20.md": {},
	"Work/Client X/Sub/Sub.md": { class: ["Area", "project"] },
	"Work/Client X/Sub/notes.md": {},
	"Work/Other/Other.md": { Class: "Area" },
	"Work/Other/a.md": {},
	"Work/Beta.md": { Class: "[[Project]]" },
	"Work/Beta/task.md": {},
	"Daily/2026-11-25.md": {},
};

describe("Frontmatter property project detection", () => {
	const cases: Array<[string, string | undefined]> = [
		["Work/Client X/Client X.md", "Client X"],
		["Work/Client X/Meetings/2026-11-20.md", "Client X"],
		["Work/Client X/Sub/Sub.md", "Sub"],
		["Work/Client X/Sub/notes.md", "Sub"],
		["Work/Other/Other.md", undefined],
		["Work/Other/a.md", undefined],
		["Work/Beta.md", "Beta"],
		["Work/Beta/task.md", "Beta"],
		["Daily/2026-11-25.md", undefined],
	];

	it.each(cases)("%s -> %s", async (path, expected) => {
		const manager = setup(vaultFiles, "Class = Project");
		const project = await manager.determineTgProject(path, {
			applyDefaultNaming: false,
		});
		expect(project?.name).toBe(expected);
	});

	it("matches any value when the rule has no '='", async () => {
		const manager = setup(vaultFiles, "Class");
		const project = await manager.determineTgProject("Work/Other/a.md");
		expect(project?.name).toBe("Other");
	});

	it("does nothing when disabled or empty", async () => {
		const manager = setup(vaultFiles, "");
		expect(
			await manager.determineTgProject("Work/Client X/Sub/notes.md"),
		).toBeUndefined();
	});
});
