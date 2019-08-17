/**
 * @module nschema/provider/type/clean
 * @author Eduardo Burgos <eburgos@gmail.com>
 */

import chalk from "chalk";
import { existsSync, lstatSync, readdirSync, rmdirSync, unlinkSync } from "fs";
import { resolve as pathResolve } from "path";
import { LogLevel, writeDebugLog, writeLog } from "../../../logging";
import { NSchemaInterface, NSchemaPlugin, Target } from "../../../model";

const { red, green, yellow } = chalk;

export interface CleanTask {
  $type: "clean";
  simulate?: boolean;
  target: Target[];
}

function deleteFolderRecursive(folderPath: string, simulate: boolean) {
  if (existsSync(folderPath)) {
    const files = readdirSync(folderPath);
    files.forEach((file: string) => {
      const curPath = `${folderPath}/${file}`;
      if (lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath, simulate);
      } else {
        // delete file
        if (!simulate) {
          unlinkSync(curPath);
        } else {
          writeDebugLog(
            `${yellow("clean")}: simulating file delete: ${red(curPath)}`
          );
        }
      }
    });
    if (!simulate) {
      rmdirSync(folderPath);
    } else {
      writeDebugLog(
        `${yellow("clean")}: simulating folder delete: ${red(folderPath)}`
      );
    }
  }
}
async function execute(parentConfig: CleanTask, _nschema: NSchemaInterface) {
  const arr = (parentConfig.target || []).map(i => {
    return i.location;
  });
  const len = arr.length;

  for (let cnt = 0; cnt < len; cnt += 1) {
    const cur = arr[cnt];
    const realFolder = pathResolve(cur);
    if (existsSync(realFolder)) {
      if (lstatSync(realFolder).isDirectory()) {
        if (!parentConfig.simulate) {
          writeLog(
            LogLevel.Default,
            `${red("deleting")} folder ${green(realFolder)}`
          );
        }
        deleteFolderRecursive(realFolder, !!parentConfig.simulate);
      } else {
        if (!parentConfig.simulate) {
          writeLog(
            LogLevel.Default,
            `${red("deleting")} file ${green(realFolder)}`
          );
          unlinkSync(realFolder);
        } else {
          writeDebugLog(
            `${yellow("clean")}: simulating file delete: ${red(realFolder)}`
          );
        }
      }
    }
  }
  return Promise.resolve(true);
}
const clean: NSchemaPlugin = {
  description: "Cleans directories. Normally used prior generation.",
  execute,
  name: "clean",
  async init(nschema: NSchemaInterface) {
    nschema.register("type", this);
    return Promise.resolve(null);
  },
  type: "type"
};

export default clean;
