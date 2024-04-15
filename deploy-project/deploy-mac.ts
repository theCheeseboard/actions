import {exec} from "@actions/exec";
import {getInstallFolder, resolveArch} from "../common";
import {getInput, setFailed} from "@actions/core";
import * as path from "node:path";
import * as glob from "@actions/glob"
import artifact from "@actions/artifact"
import * as fs from "node:fs/promises";

export async function deployMac() {
    const sourceFolder = getInput("sourceFolder");
    const buildFolder = getInput("buildFolder");
    const installFolder = getInstallFolder(resolveArch(getInput("arch")));

    const deployAppGlobber = await glob.create(`${buildFolder}/**/*.app`, {
        matchDirectories: true,
        implicitDescendants: true
    });
    const appGlobResult: string[] = [];

    for await (const result of deployAppGlobber.globGenerator()) {
        const stat = await fs.stat(result);
        if (stat.isDirectory()) appGlobResult.push(result);
    }

    if (appGlobResult.length != 1) {
        console.log(`App bundles found: ${appGlobResult.join(", ")}`);
        setFailed("Detection of app bundle failed");
        return;
    }

    const appBundle = appGlobResult[0];
    const appName = path.basename(appBundle, ".app");

    await exec("macdeployqt", [
        appBundle,
        `-qmlimport=${path.join(installFolder, "qml")}`,
        `-qmldir=${sourceFolder}`
    ]);

    const outputDmg = path.resolve(`${appName}.dmg`);
    await exec(`${installFolder}/bin/cntp-macpack`, [
        appBundle, outputDmg
    ]);

    // Upload artifact
    console.log("Uploading artifact")
    await artifact.uploadArtifact(`${appName}-macOS`, [outputDmg], path.resolve("."));
}
