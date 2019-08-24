/**
 * @author Eduardo Burgos <eburgos@gmail.com>
 */

import { resolve as pathResolve } from "path";
import { NSchemaInterface, NSchemaPlugin, NSchemaTask } from "../../../model";
import { requireDefaultOrPackage } from "../../../utils";

export interface ImportTask {
  importLocation: string;
  nschemaLocation?: string;
  type: "import";
}

async function execute(
  parentConfig: NSchemaTask,
  nschema: NSchemaInterface,
  context: object
) {
  if (parentConfig.type !== "import") {
    throw new Error("Invalid import task");
  }
  const location = parentConfig.importLocation || "";
  const newLocation = pathResolve(parentConfig.nschemaLocation || "", location);
  const cfg = requireDefaultOrPackage(newLocation);
  return nschema.generate(parentConfig, cfg, context);
}
const $import: NSchemaPlugin = {
  description: "Reference external files in your NSchema tasks",
  execute,
  name: "import",
  type: "type",
  async init(nschema: NSchemaInterface) {
    nschema.register("type", this);
    return Promise.resolve(null);
  }
};

export default $import;
