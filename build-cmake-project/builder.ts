import {BuilderOptions} from "./interfaces";
import * as path from "node:path";
import * as os from "node:os";
import {exec} from "@actions/exec";
import * as fs from "node:fs/promises";

export async function build(options: BuilderOptions) {
    const installFolder = path.join(os.homedir(), "install", options.arch.replace(";", "_"));
    const installLibFolder = path.join(installFolder, "lib");
    const projectFolder = path.join(os.homedir(), "git", options.project);
    const sourceFolder = path.join(projectFolder, "source", options.commitish);
    const buildFolder = path.join(projectFolder, "build", options.arch.replace(";", "_"), options.commitish);

    await fs.mkdir(sourceFolder, {
        recursive: true
    });
    await fs.mkdir(buildFolder, {
        recursive: true
    });

    // Clone the source of the project
    await exec("git", ["clone", `https://github.com/${options.project}.git`, sourceFolder])
    await exec("git", ["checkout", options.commitish], {
        cwd: sourceFolder
    })

    // Init CMake
    const cmakeDefs: Record<string, string> = {
        "CMAKE_INSTALL_PREFIX": installFolder,
        "CMAKE_PREFIX_PATH": installLibFolder,
        "CMAKE_INSTALL_RPATH": installLibFolder,
        "CMAKE_OSX_ARCHITECTURES": options.arch
    };

    const cmakeArgs = [
        ...Object.keys(cmakeDefs).map(def => `-D${def}=${cmakeDefs[def]}`)
    ];
    await exec("cmake", ["-B", buildFolder, "-S", sourceFolder, ...cmakeArgs]);
    await exec("cmake", ["--build", buildFolder]);
    await exec("cmake", ["--install", buildFolder]);
}
