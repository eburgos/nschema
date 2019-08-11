/**
 * @module nschema/provider/type/import
 * @author Eduardo Burgos <eburgos@gmail.com>
 */
import {
  Definition,
  NSchemaInterface,
  NSchemaPlugin,
  Target
} from "../../../model";

const excludedConfigNames = ["$type", "$namespace", "list"];

function execute(
  parentConfig: Definition,
  nschema: NSchemaInterface,
  context: object
) {
  const arr = parentConfig.list || [];

  const newConfig = nschema.objClone(parentConfig);
  //getting new config
  nschema.mixinRecursive(newConfig, parentConfig, (_1, _2, p) => {
    /* jshint unused: true */
    return excludedConfigNames.indexOf(p) < 0;
  });
  if (parentConfig.$namespace) {
    newConfig.namespace += `.${parentConfig.$namespace}`;
  }
  const tempTargets = newConfig.$target;
  let resultPromise: Promise<any> = Promise.resolve(true);
  const toRemove: number[] = [];
  (tempTargets || []).forEach((tgt: Target, i: number) => {
    const customBundle = nschema.getCustomPlugin("customBundle", tgt);
    if (customBundle) {
      resultPromise = resultPromise.then(() => {
        newConfig.$target = [tgt];
        if (customBundle) {
          if (customBundle.execute) {
            return customBundle
              .execute(newConfig, nschema, context)
              .then(() => {
                newConfig.$target = tempTargets;
              });
          } else {
            throw new Error("custom bundle without execute");
          }
        } else {
          throw new Error("Not possible");
        }
      });
      toRemove.push(i);
    }
  });

  toRemove.reverse().forEach(i => {
    newConfig.$target.splice(i, 1);
  });

  return arr.reduce((acc, next) => {
    return acc.then(() => {
      return nschema.generate(newConfig, next, context);
    });
  }, resultPromise);
}

const bundle: NSchemaPlugin = {
  description: "Handles the concept of namespacing in the generation process",
  execute,
  name: "bundle",
  init(nschema: NSchemaInterface) {
    return nschema.register("type", this);
  },
  type: "type"
};

export default bundle;
