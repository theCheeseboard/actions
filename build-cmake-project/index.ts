import {getInput, setFailed} from "@actions/core";
import {build} from "./builder";
import * as os from "node:os";
import {context} from "@actions/github";
import {resolveArch} from "../common";

export async function run() {
    try {
        const project = getInput("project");
        const commitish = getInput("commitish");
        const extraCmakeArgs = getInput("extra-cmake-args");
        const arch = getInput("arch");

        let options = {
            project: project,
            arch: resolveArch(arch),
            commitish: commitish,
            extraCmakeArgs: ""
        };

        if (project == ".") {
            options.project = `${context.repo.owner}/${context.repo.repo}`;

            let ref = context.ref;
            if (ref.startsWith("refs/heads/")) {
                ref = ref.substring(11);
            }
            options.commitish = ref;
        }

        if (extraCmakeArgs) options.extraCmakeArgs = extraCmakeArgs;

        await build(options);
    } catch (error) {
        setFailed("Unable to build");
    }
}

void run();