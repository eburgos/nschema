/**
 * @module nschema/provider/type/service
 *  @author Eduardo Burgos <eburgos@gmail.com>
 */

import { writeError } from "../../../logging";
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
import {
  deepClone,
  exitOrError,
  getCriteria,
  prettyJson
} from "../../../utils";
import { processMessage } from "../message";

export interface ServiceTask
  extends HasTargetMixin,
    HasFilenameMixin,
    AppendableProperties {
  description?: string;
  name: string;
  namespace?: string;
  operations: { [name: string]: NSchemaOperation };

  /**
   * Only applicable to message producers (clients).
   *
   * @type {{
   *     [name: string]: { arguments: string[]; description?: string; operations: string[] };
   *   }}
   * @memberof ServiceTask
   */
  producerContexts?: {
    [name: string]: {
      arguments: string[];
      description?: string;
      operations: string[];
    };
  };

  /**
   * Only applicable to message consumers (servers).
   *
   * @type {{
   *     [name: string]: { arguments: string[]; description?: string; operations: string[] };
   *   }}
   * @memberof ServiceTask
   */
  consumerContexts?: {
    [name: string]: {
      arguments: string[];
      description?: string;
      operations: string[];
    };
  };
  type: "service";
}

async function execute(
  origParentConfig: NSchemaTask,
  nschema: NSchemaInterface,
  providedContext: any
) {
  if (origParentConfig.type !== "service") {
    throw new Error("Invalid service task");
  }
  const parentConfig = origParentConfig;

  if (parentConfig.operations) {
    const operations = parentConfig.operations;
    for (const operationKey in operations) {
      if (Object.prototype.hasOwnProperty.call(operations, operationKey)) {
        processMessage(
          operations[operationKey].inMessage,
          nschema,
          parentConfig.namespace || ""
        );
        processMessage(
          operations[operationKey].outMessage,
          nschema,
          parentConfig.namespace || ""
        );
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

        const waitables = targetArr.map(async (item) => {
          item.type = "service";
          try {
            const foundTargets = nschema.getTarget(item);
            if (foundTargets.length > 1) {
              exitOrError(`multiple targets for service: ${getCriteria(item)}
Unable to generate service ${newConfig.namespace || ""} :: ${newConfig.name}

Available targets:

${foundTargets.map(prettyJson).join("\n--------\n")}
        `);
              throw new Error();
            } else if (foundTargets.length === 1) {
              const targetImplementation = foundTargets[0];

              return await targetImplementation.generate(
                newConfig,
                nschema,
                item,
                providedContext
              );
            } else {
              exitOrError(`Target not found for service: ${getCriteria(item)}
Unable to generate service ${newConfig.namespace || ""} :: ${newConfig.name}`);
              throw new Error();
            }
          } catch (err) {
            writeError(err);
            reject(err);
          }
        });

        Promise.all(waitables).then(resolve, reject);
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
    await nschema.register("type", this);
  }
};

export default service;
