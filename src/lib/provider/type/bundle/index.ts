/**
 * @author Eduardo Burgos <eburgos@gmail.com>
 */
import chalk from "chalk";
import { isArray } from "util";
import { writeDebugLog } from "../../../logging";
import {
  AppendableProperties,
  HasTargetMixin,
  NSchemaInterface,
  NSchemaPlugin,
  NSchemaTask,
  Target
} from "../../../model";
import { deepClone, updateNamespace } from "../../../utils";

const { magenta } = chalk;

export interface BundleTask extends HasTargetMixin, AppendableProperties {
  $nschemaLocation?: string;
  $type: "bundle";
  list: NSchemaTask[];
  namespace?: string;
}

async function execute(
  parentConfig: BundleTask,
  nschema: NSchemaInterface,
  context: object
) {
  const newConfig: NSchemaTask = updateNamespace(deepClone(parentConfig));

  const tempTargets = newConfig.target
    ? isArray(newConfig.target)
      ? newConfig.target
      : [newConfig.target]
    : [];

  let resultPromise: Promise<any> = Promise.resolve(true);

  (tempTargets || []).forEach((tgt: Target) => {
    const customBundle = nschema.getCustomPlugin("customBundle", tgt);
    if (customBundle) {
      resultPromise = resultPromise.then(async () => {
        newConfig.target = [tgt];
        if (customBundle) {
          if (customBundle.execute) {
            writeDebugLog(
              `executing custom bundle ${magenta(customBundle.name)}`
            );
            return customBundle.execute(newConfig, nschema, context);
          } else {
            throw new Error("custom bundle without execute");
          }
        } else {
          throw new Error("Not possible");
        }
      });
    }
  });

  await resultPromise;
  const arr = newConfig.list || [];
  newConfig.target = tempTargets;

  return arr.reduce(async (acc, next) => {
    return acc.then(async () => {
      return nschema.generate(newConfig, next, context);
    });
  }, resultPromise);
}

const bundle: NSchemaPlugin = {
  description: "Handles the concept of namespacing in the generation process",
  execute,
  name: "bundle",
  async init(nschema: NSchemaInterface) {
    return nschema.register("type", this);
  },
  type: "type"
};

export default bundle;
