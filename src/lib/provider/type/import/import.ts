/**
 * @module nschema/provider/type/import
 * @author Eduardo Burgos <eburgos@gmail.com>
 */

import * as path from "path";
import { Definition, NSchemaInterface, NSchemaPlugin } from "../../../model";

declare const require: (name: string) => any;

function execute(
  parentConfig: Definition,
  nschema: NSchemaInterface,
  context: object
) {
  const location = parentConfig.$importLocation || "";
  const newLocation = path.resolve(
    parentConfig.$nschemaLocation || "",
    location
  );
  const newConfig = require(newLocation);
  if (!newConfig) {
    throw new Error(`Invalid import location: ${location}`);
  }
  return nschema.generate(parentConfig, newConfig, context);
}
const $import: NSchemaPlugin = {
  description: "Reference external files in your NSchema tasks",
  execute,
  name: "import",
  type: "type",
  init(nschema: NSchemaInterface) {
    nschema.register("type", this);
    return Promise.resolve(null);
  }
};

export default $import;
