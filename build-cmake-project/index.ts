import {getInput, setFailed} from "@actions/core";

try {
    const project = getInput("project");
    const commitish = getInput("commitish");
    const extraCmakeArgs = getInput("extra-cmake-args");
    const arch = getInput("arch");

    let options = {
        project: project,
        arch: arch,
        commitish: "",
        extraCmakeArgs: ""
    };

    if (arch === "default") {
        // Use the host arch
        options.arch = "x86";
    }

    if (commitish) options.commitish = commitish;
    if (extraCmakeArgs) options.extraCmakeArgs = extraCmakeArgs;

    // await builder(options);
} catch (error) {
    setFailed("Unable to build");
}
