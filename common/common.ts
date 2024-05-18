import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises"

export function resolveArch(arch: string) {
    if (arch === "default") {
        // Use the host arch
        return os.platform() == "darwin" ? "arm64;x86_64" : "x86";
    }
    return arch;
}

export function getInstallFolder(arch: string) {
    return path.join(os.homedir(), "install", arch.replace(";", "_"));
}

export function getProjectFolder(project: string) {
    return path.join(os.homedir(), "git", project);
}

export function getSourceFolder(project: string, commitish: string) {
    return path.join(getProjectFolder(project), "source", commitish);
}

export async function getBuildFolder(project: string, arch: string, commitish: string) {
    if (os.platform() == "win32") {
        let registry: Record<string, string> = {};

        try {
            const file = await fs.readFile(".tc-registry", "utf-8");
            registry = JSON.parse(file);
        } catch {
            // Do nothing
        }

        const key = `${project}-${arch}-${commitish}`;
        let path = `C:/${String.fromCharCode(96 + Object.keys(registry).length)}`;
        if (registry[key]) {
            path = registry[key];
        }

        registry[key] = path;
        await fs.writeFile(".tc-registry", JSON.stringify(registry), "utf-8");

        return path;
    } else {
        return path.join(getProjectFolder(project), "build", arch.replace(";", "_"), commitish);
    }
}

export async function getFolders(arch: string, project: string, commitish: string) {
    return {
        install: getInstallFolder(arch),
        source: getSourceFolder(project, commitish),
        build: await getBuildFolder(project, arch, commitish)
    }
}