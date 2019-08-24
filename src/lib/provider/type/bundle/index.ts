/**
 * @author Eduardo Burgos <eburgos@gmail.com>
 */
import chalk from "chalk";
import { isArray } from "util";
import { writeDebugLog, writeError } from "../../../logging";
import {
  AppendableProperties,
  HasTargetMixin,
  NSchemaInterface,
  NSchemaPlugin,
  NSchemaTask,
  Target
} from "../../../model";
import {
  deepClone,
  exitOrError,
  getCriteria,
  updateNamespace
} from "../../../utils";

const { magenta } = chalk;

export interface BundleTask extends HasTargetMixin, AppendableProperties {
  list: NSchemaTask[];
  namespace?: string;
  nschemaLocation?: string;
  type: "bundle";
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
    const customBundles = nschema.getCustomPlugin("customBundle", tgt);
    if (customBundles.length > 1) {
      writeError(
        `Multiple customBundle plugins found for ${getCriteria(tgt)}.
Unable to generate ${parentConfig.namespace || ""}.

Available options are:

${customBundles.map(p => JSON.stringify(p, null, 2)).join("\n")}`
      );
      throw new Error(`Error: multiple plugins found for ${getCriteria(tgt)}.`);
    } else if (customBundles.length === 1) {
      const customBundle = customBundles[0];
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
    }, exitOrError);
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
