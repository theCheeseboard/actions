import * as fs from "node:fs/promises"
import {exec} from "@actions/exec";
import * as path from "node:path";
import {getInstallFolder, resolveArch} from "../common";
import {getInput, isDebug} from "@actions/core";
import * as glob from "@actions/glob";
import * as console from "node:console";
import artifact from "@actions/artifact";

export async function deployLinux() {
    const qtPluginPath = process.env["QT_PLUGIN_PATH"];

    // Remove troublesome plugin
    await fs.rm(`${qtPluginPath}/sqldrivers/libqsqlmimer.so`);

    const [
        linuxDeployQt,
        {
            desktopFile
        }
    ] = await Promise.all([
        prepareLinuxDeployQt(),
        initialiseAppdir(),
        installNativeLibraries()
    ]);

    // Execute linuxdeployqt on the appdir
    await exec(linuxDeployQt, [
        desktopFile,
        "-appimage",
        `-qmldir=${getInput("sourceDirectory")}`,
        "-unsupported-allow-new-glibc"
    ]);

    // Locate the .appimage file
    const appimageGlobber = await glob.create(`*.appimage`, {
        matchDirectories: false,
        implicitDescendants: false
    });
    const appImages = await appimageGlobber.glob();

    if (appImages.length != 1) {
        console.log("Unable to locate created .appimage file");
        throw new Error("Unable to locate created .appimage file");
    }

    // Upload artifact
    const appName = path.basename(desktopFile, ".desktop");
    console.log("Uploading artifact")
    await artifact.uploadArtifact(`${appName}-Linux`, [appImages[0]], path.resolve("."));
}

async function installNativeLibraries() {
    await exec("sudo", ["apt-get", "install", "libfuse2", "libxcb-cursor0"]);
}

async function prepareLinuxDeployQt() {
    const filePath = path.resolve("linuxdeployqt");

    const linuxdeployqt = await fetch("https://github.com/probonopd/linuxdeployqt/releases/download/continuous/linuxdeployqt-continuous-x86_64.AppImage", {
        redirect: "follow"
    })
    const arrayBuffer = await linuxdeployqt.arrayBuffer();
    const file = await fs.open(filePath, "w", 0o777);
    await file.write(Buffer.from(arrayBuffer));
    await file.close();

    return filePath;
}

async function initialiseAppdir() {
    const appdir = path.resolve("appdir");
    await fs.mkdir(path.join(appdir, "usr"), {
        recursive: true
    });

    const installFolder = getInstallFolder(resolveArch(getInput("arch")));
    for (const item of await fs.readdir(installFolder)) {
        const filePath = path.join(installFolder, item);
        const destination = path.join(appdir, "usr", item);
        await fs.rename(filePath, destination);
    }

    // Look for the .desktop file
    const desktopGlobber = await glob.create(`${appdir}/**/*.desktop`, {
        matchDirectories: false,
        implicitDescendants: false
    });
    const desktopFiles = await desktopGlobber.glob();
    if (desktopFiles.length == 0) {
        // Can't find the .desktop file
        console.log("Unable to locate .desktop file for deployment");
        throw new Error("Unable to locate .desktop file for deployment");
    } else if (desktopFiles.length > 1) {
        console.log(`Found more than one .desktop file: ${desktopFiles.join(", ")}`);
    }

    // Look for every file under appdir and if it's an ELF, update the runpath
    const elfGlobber = await glob.create(`${appdir}/**/*`, {
        matchDirectories: false,
        implicitDescendants: false
    });
    for await (const item of elfGlobber.globGenerator()) {
        if (!await isElfFile(item)) continue;
        const dir = path.dirname(item);
        const rpath = `$ORIGIN/${path.relative(dir, path.join(appdir, "usr", "lib"))}`;
        if (isDebug()) {
            console.log(`Updating runpath for ELF file: ${item} -> ${rpath}`);
        }
        await exec("patchelf", ["--set-rpath", rpath, item]);
    }

    // Touch the libc6 copyright file because linuxdeployqt needs it
    const libc6Doc = path.join(appdir, "usr", "share", "doc", "libc6");
    await fs.mkdir(libc6Doc, {
        recursive: true
    });
    const libc6Copyright = await fs.open(path.join(libc6Doc, "copyright"), "w", 0o777);
    await libc6Copyright.close();

    return {
        appdir: appdir,
        desktopFile: desktopFiles[0]
    };
}


async function isElfFile(filePath: string) {
    let buffer = Buffer.alloc(4);
    let fd = await fs.open(filePath, 'r');
    await fd.read(buffer, 0, 4, 0);
    await fd.close();

    return buffer.toString() === '\x7fELF';
}