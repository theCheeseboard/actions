import path from "node:path";
import os from "node:os";

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

export function getBuildFolder(project: string, arch: string, commitish: string) {
    return path.join(project, "build", arch.replace(";", "_"), commitish);
}

export function getFolders(arch: string, project: string, commitish: string) {
    return {
        install: getInstallFolder(arch),
        source: getSourceFolder(project, commitish),
        build: getBuildFolder(project, arch, commitish)
    }
}