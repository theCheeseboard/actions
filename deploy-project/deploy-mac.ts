import {exec} from "@actions/exec";
import {getInstallFolder, resolveArch} from "../common";
import {getInput, setFailed} from "@actions/core";
import * as path from "node:path";
import * as glob from "@actions/glob"
import artifact from "@actions/artifact"

export async function deployMac() {
    const sourceFolder = getInput("sourceFolder");
    const buildFolder = getInput("buildFolder");
    const installFolder = getInstallFolder(resolveArch(getInput("arch")));

    const deployAppGlobber = await glob.create(path.join(buildFolder, "**", "*.app"));
    const appGlobResult = await deployAppGlobber.glob();

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
