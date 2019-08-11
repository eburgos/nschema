/**
 * @module nschema/provider/type/object
 * @author Eduardo Burgos <eburgos@gmail.com>
 */

import {
  Definition,
  NSchemaInterface,
  NSchemaPlugin,
  Target
} from "../../../model";

function execute(
  parentConfig: Definition,
  nschema: NSchemaInterface,
  context: object
) {
  nschema.registerObject(parentConfig);

  return new Promise<any>((resolve, reject) => {
    process.nextTick(() => {
      const newConfig = nschema.objClone(parentConfig);
      newConfig.$subType = newConfig.$subType || "";

      const target: Target | Target[] = newConfig.$target;
      let targetArr: Target[];
      if (target) {
        if (!nschema.isArray(target)) {
          targetArr = [target];
        } else {
          targetArr = target;
        }
        const result = targetArr.map(item => {
          item.type = "object";
          const foundTarget = nschema.getTarget(item);
          if (foundTarget) {
            return foundTarget.generate(newConfig, nschema, item, context);
          } else {
            console.error("Target not found: ", item);
            throw new Error("Target not found");
          }
        });
        Promise.all(result).then(arr => {
          resolve(arr);
        }, reject);
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
  init(nschema: NSchemaInterface) {
    return nschema.register("type", this);
  }
};

export default obj;
