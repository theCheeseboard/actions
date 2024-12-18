import {BuilderOptions} from "./interfaces";
import * as path from "node:path";
import * as os from "node:os";
import {exec} from "@actions/exec";
import * as fs from "node:fs/promises";
import crypto from "crypto";
import {restoreCache, saveCache} from "@actions/cache";
import {setOutput} from "@actions/core";
import {getFolders} from "../common/common";
import * as process from "node:process";

function calculateSHA256(inputString: string) {
    const hashSum = crypto.createHash('sha256');
    hashSum.update(inputString);

    return hashSum.digest('hex');
}

export async function build(options: BuilderOptions) {
    const {
        install: installFolder,
        source: sourceFolder,
        build: buildFolder
    } = await getFolders(options.arch, options.project, options.commitish)

    const installLibFolder = path.join(installFolder, "lib");
    const pkgconfigFolder = path.join(installLibFolder, "pkgconfig");

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

    let headCommit = "";
    await exec("git", ["rev-parse", "HEAD"], {
        listeners: {
            stdout: (data) => headCommit += data.toString()
        },
        cwd: sourceFolder
    })
    headCommit = headCommit.trim();

    console.log(`Cloned ${options.project} at commit ${headCommit}`);

    // Init CMake
    const cmakeDefs: Record<string, string> = {
        "CMAKE_INSTALL_PREFIX": installFolder,
        "CMAKE_PREFIX_PATH": [installLibFolder, pkgconfigFolder].join(";"),
        "CMAKE_INSTALL_RPATH": installLibFolder,
        "CMAKE_OSX_ARCHITECTURES": options.arch,
        "CMAKE_BUILD_TYPE": "Release"
    };

    if (options.useVcpkg) {
        cmakeDefs["CMAKE_TOOLCHAIN_FILE"] = `${process.env["VCPKG_ROOT"] ?? process.env["VCPKG_INSTALLATION_ROOT"]}/scripts/buildsystems/vcpkg.cmake`;
    }

    const cmakeArgs = [
        "-B", buildFolder, "-S", sourceFolder,
        "-GNinja",
        ...Object.keys(cmakeDefs).map(def => `-D${def}=${cmakeDefs[def]}`),
        ...options.extraCmakeArgs.split(" ").filter(x => x != ""),
    ];

    // Cache build folder
    const cacheKey = `cmake-${headCommit}-${options.project}@${options.commitish}-${options.arch}-${calculateSHA256(buildFolder)}-${calculateSHA256(cmakeArgs.join(" "))}`;

    let needBuild = true;
    if (await restoreCache([buildFolder], cacheKey)) {
        // The cache was restored successfully, so skip the build
        console.log("Cache restore successful - skipping build step");
        needBuild = false;
    }

    if (needBuild) {
        await exec("cmake", cmakeArgs, {
            env: {
                ...process.env,
                "PKG_CONFIG_PATH": pkgconfigFolder,
            }
        });
        await exec("cmake", ["--build", buildFolder]);
    }

    await exec("cmake", ["--install", buildFolder]);

    await saveCache([buildFolder], cacheKey);

    setOutput("source-directory", sourceFolder)
    setOutput("build-directory", buildFolder)
    setOutput("install-directory", installFolder);
}
