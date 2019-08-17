/**
 * @module nschema/provider/type/service
 *  @author Eduardo Burgos <eburgos@gmail.com>
 */

import {
  AppendableProperties,
  HasFilenameMixin,
  HasTargetMixin,
  NSchemaInterface,
  NSchemaOperation,
  NSchemaPlugin,
  NSchemaTask,
  Target
} from "../../../model";
import { deepClone } from "../../../utils";
import { processMessage } from "../message";

export interface ServiceTask
  extends HasTargetMixin,
    HasFilenameMixin,
    AppendableProperties {
  $type: "service";

  description?: string;
  name: string;
  namespace?: string;
  operations: { [name: string]: NSchemaOperation };
}

async function execute(
  origParentConfig: NSchemaTask,
  nschema: NSchemaInterface,
  providedContext: any
) {
  if (origParentConfig.$type !== "service") {
    throw new Error("Invalid service task");
  }
  const parentConfig = origParentConfig;

  if (parentConfig.operations) {
    const operations = parentConfig.operations;
    for (const p in operations) {
      if (operations.hasOwnProperty(p)) {
        processMessage(operations[p].inMessage, nschema);
        processMessage(operations[p].outMessage, nschema);
      }
    }
  }
  nschema.registerService(parentConfig);

  return await new Promise<any>((resolve, reject) => {
    process.nextTick(() => {
      const newConfig = deepClone(parentConfig);
      const target = newConfig.target;

      if (target) {
        const targetArr: Target[] = !nschema.isArray(target)
          ? [target]
          : target;

        const r = targetArr.map(async item => {
          item.type = "service";
          const targetImplementation = nschema.getTarget(item);
          if (targetImplementation) {
            return await targetImplementation.generate(
              newConfig,
              nschema,
              item,
              providedContext
            );
          } else {
            console.error("Service not found: ", item);
            throw new Error("Service not found");
          }
        });

        Promise.all(r).then(resolve, reject);
      } else {
        resolve(false);
      }
    });
  });
}

const service: NSchemaPlugin = {
  description: "Handles service generation",
  execute,
  name: "service",
  type: "type",
  async init(nschema: NSchemaInterface) {
    nschema.register("type", this);
    return Promise.resolve(null);
  }
};

export default service;
