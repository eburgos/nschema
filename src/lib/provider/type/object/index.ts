/**
 * @author Eduardo Burgos <eburgos@gmail.com>
 */

import { writeError } from "../../../logging";
import {
  AppendableProperties,
  HasTargetMixin,
  Identifier,
  NSchemaInterface,
  NSchemaPlugin,
  NSchemaProperty,
  NSchemaTask,
  Target
} from "../../../model";
import { deepClone } from "../../../utils";

/**
 * Describes an object interface being generated. May be extended for specific purposes (with caution).
 *
 * @export
 * @interface ObjectTask
 * @extends {HasTargetMixin}
 */
export interface ObjectTask extends HasTargetMixin, AppendableProperties {
  $extends?: Identifier;
  $subType?: "enumeration" | "";
  $type: "object";
  description?: string;
  name: string;
  namespace?: string;

  properties?: {
    [name: string]: NSchemaProperty;
  };
}

async function execute(
  parentConfig: NSchemaTask,
  nschema: NSchemaInterface,
  context: object
) {
  if (parentConfig.$type !== "object") {
    throw new Error("Invalid object task");
  }
  nschema.registerObject(parentConfig);

  return new Promise<any>((resolve, reject) => {
    process.nextTick(() => {
      const newConfig = deepClone(parentConfig);
      newConfig.$subType = newConfig.$subType || "";

      const target = newConfig.target;
      if (target) {
        const targetArr: Target[] = !nschema.isArray(target)
          ? [target]
          : target;
        const result = targetArr.map(async arrayItem => {
          const item: Target = { ...arrayItem, type: "object" };
          const foundTarget = nschema.getTarget(item);
          if (foundTarget) {
            return await foundTarget.generate(
              newConfig,
              nschema,
              item,
              context
            );
          } else {
            writeError("Target not found");
            writeError(item);
            throw new Error("Target not found");
          }
        });
        Promise.all(result).then(resolve, reject);
      } else {
        resolve(false);
      }
    });
  });
}

const obj: NSchemaPlugin = {
  description: "Generates classes and objects",
  execute,
  name: "object",
  type: "type",
  async init(nschema: NSchemaInterface) {
    return await nschema.register("type", this);
  }
};

export default obj;
