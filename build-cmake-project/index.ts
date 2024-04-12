import {getInput, setFailed} from "@actions/core";
import {build} from "./builder";
import * as os from "node:os";

export async function run() {
    try {
        const project = getInput("project");
        const commitish = getInput("commitish");
        const extraCmakeArgs = getInput("extra-cmake-args");
        const arch = getInput("arch");

        let options = {
            project: project,
            arch: arch,
            commitish: commitish,
            extraCmakeArgs: ""
        };

        if (arch === "default") {
            // Use the host arch
            options.arch = os.platform() == "darwin" ? "arm64;x86_64" : "x86";
        }

        if (extraCmakeArgs) options.extraCmakeArgs = extraCmakeArgs;

        await build(options);
    } catch (error) {
        setFailed("Unable to build");
    }
}

void run();