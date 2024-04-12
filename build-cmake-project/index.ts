import {getInput, setFailed} from "@actions/core";
import {build} from "./builder";

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
        options.arch = "x86";
    }

    if (extraCmakeArgs) options.extraCmakeArgs = extraCmakeArgs;

    await build(options);
} catch (error) {
    setFailed("Unable to build");
}
