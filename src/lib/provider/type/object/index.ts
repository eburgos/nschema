/**
 * @author Eduardo Burgos <eburgos@gmail.com>
 */

import {
  AppendableProperties,
  HasTargetMixin,
  NSchemaInterface,
  NSchemaPlugin,
  NSchemaProperty,
  NSchemaTask,
  Target,
  NSchemaTypeDefinition
} from "../../../model";
import {
  deepClone,
  exitOrError,
  getCriteria,
  prettyJson
} from "../../../utils";

/**
 * Describes an object interface being generated. May be extended for specific purposes (with caution).
 *
 * @export
 * @interface ObjectTask
 * @extends {HasTargetMixin}
 */
export interface ObjectTask extends HasTargetMixin, AppendableProperties {
  description?: string;

  /**
   * List of interfaces that this type implements. Not supported in all languages.
   *
   * @type {NSchemaTypeDefinition[]}
   * @memberof ObjectTask
   */
  implements?: NSchemaTypeDefinition[];
  name: string;
  namespace?: string;
  properties?: {
    [name: string]: NSchemaProperty;
  };
  subType?: "enumeration" | "";
  type: "object";
}

async function execute(
  parentConfig: NSchemaTask,
  nschema: NSchemaInterface,
  context: object
) {
  if (parentConfig.type !== "object") {
    throw new Error("Invalid object task");
  }
  nschema.registerObject(parentConfig);

  return new Promise<any>((resolve, reject) => {
    process.nextTick(() => {
      const newConfig = deepClone(parentConfig);
      newConfig.subType = newConfig.subType || "";

      const target = newConfig.target;
      if (target) {
        const targetArr: Target[] = !nschema.isArray(target)
          ? [target]
          : target;
        const result = targetArr.map(async (arrayItem) => {
          const item: Target = { ...arrayItem, type: "object" };
          const foundTargets = nschema.getTarget(item);
          if (foundTargets.length > 1) {
            exitOrError(`multiple targets for object: ${getCriteria(item)}
      Unable to generate ${newConfig.namespace || ""} :: ${newConfig.name}

      Available targets:

      ${foundTargets.map(prettyJson).join("\n--------\n")}
      `);
            throw new Error();
          } else if (foundTargets.length === 1) {
            const foundTarget = foundTargets[0];

            return await foundTarget.generate(
              newConfig,
              nschema,
              item,
              context
            );
          } else {
            exitOrError(`Target not found for object: ${getCriteria(item)}
            Unable to generate ${newConfig.namespace || ""} :: ${
              newConfig.name
            }`);
            throw new Error();
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
