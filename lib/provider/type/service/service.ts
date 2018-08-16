/**
 * @module nschema/provider/type/service
 *  @author Eduardo Burgos <eburgos@gmail.com>
 */

import {
  Definition,
  NSchemaInterface,
  NSchemaPlugin,
  NSchemaService,
  Target
} from "../../../model";
import { processMessage } from "../message/message";

function execute(origParentConfig: Definition, nschema: NSchemaInterface) {
  const parentConfig: NSchemaService = origParentConfig as NSchemaService;

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
  const newConfig = nschema.objClone(parentConfig);
  const target: Target | Target[] = newConfig.$target;
  const targetArr: Target[] = (() => {
    if (!nschema.isArray(target)) {
      return [target];
    } else {
      return target;
    }
  })();

  const r = targetArr.map(item => {
    item.type = "service";
    const targetImplementation = nschema.getTarget(item);
    if (targetImplementation) {
      return targetImplementation.generate(newConfig, nschema, item);
    } else {
      console.error("Service not found: ", item);
      throw new Error("Service not found");
    }
  });

  return Promise.all(r);
}

const service: NSchemaPlugin = {
  description: "Handles service generation",
  execute,
  name: "service",
  type: "type",
  init(nschema: NSchemaInterface) {
    nschema.register("type", this);
    return Promise.resolve(null);
  }
};

export default service;
