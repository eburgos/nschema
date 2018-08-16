/**
 * @module nschema/provider/type/clean
 * @author Eduardo Burgos <eburgos@gmail.com>
 */

import * as fs from "fs";
import * as path from "path";
import { Definition, NSchemaInterface, NSchemaPlugin } from "../../../model";

const excludedConfigNames = ["$type", "$namespace", "list"];

function deleteFolderRecursive(folderPath: string) {
  if (fs.existsSync(folderPath)) {
    const files = fs.readdirSync(folderPath);
    files.forEach((file: string) => {
      const curPath = `${folderPath}/${file}`;
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
}
function execute(parentConfig: Definition, nschema: NSchemaInterface) {
  const arr = (parentConfig.target || []).map(i => {
    return i.location;
  });
  const len = arr.length;
  const newConfig = nschema.objClone(parentConfig);
  //getting new config
  nschema.mixinRecursive(newConfig, parentConfig, (_1, _2, p) => {
    /* jshint unused: true */
    return excludedConfigNames.indexOf(p) < 0;
  });
  if (parentConfig.$namespace) {
    newConfig.namespace += `.${parentConfig.$namespace}`;
  }
  for (let cnt = 0; cnt < len; cnt += 1) {
    const cur = arr[cnt];
    const realFolder = path.resolve(cur);
    if (fs.existsSync(realFolder)) {
      if (fs.lstatSync(realFolder).isDirectory()) {
        console.log(`deleting folder ${realFolder}`);
        deleteFolderRecursive(realFolder);
      } else {
        console.log(`deleting file ${realFolder}`);
        fs.unlinkSync(realFolder);
      }
    }
  }
  return Promise.resolve(true);
}
const clean: NSchemaPlugin = {
  description: "Cleans directories. Normally used prior generation.",
  execute,
  name: "clean",
  init(nschema: NSchemaInterface) {
    nschema.register("type", this);
    return Promise.resolve(null);
  },
  type: "type"
};

export default clean;
