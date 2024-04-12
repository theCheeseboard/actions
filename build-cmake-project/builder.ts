import {BuilderOptions} from "./interfaces";
import * as path from "node:path";
import * as os from "node:os";

export function build(options: BuilderOptions) {
    const projectFolder = path.join(os.homedir(), "git", "project-name");
    const sourceFolder = path.join(projectFolder, "source", options.commitish);

}
