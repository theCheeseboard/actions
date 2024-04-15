import {setFailed} from "@actions/core";
import * as os from "node:os";
import {deployMac} from "./deploy-mac";
import {deployLinux} from "./deploy-linux";

export async function run() {
    try {
        switch (os.platform()) {
            case "darwin":
                await deployMac();
                break;
            case "linux":
                await deployLinux();
                break;
            case "win32":
            default:
                setFailed(`Platform ${os.platform()} not supported`);
        }
    } catch (error) {
        setFailed("Unable to deploy");
    }
}

void run()