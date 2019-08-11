/**
 * Created by eburgos on 6/13/14.
 */
"use strict";
import {
  NineSchemaConfig,
  NSchemaInterface,
  Target,
  TemplateFunction
} from "../../../../../model";
import { gRPC, typeName } from "../../gRPC";

function baseGenerate(
  config: NineSchemaConfig,
  nschema: NSchemaInterface,
  target: Target,
  template: TemplateFunction,
  grpc: gRPC,
  context: object
) {
  return grpc.generate(nschema, config, template, target, context);
}

//    // ${JSON.stringify(operation, null, 4)
//    .split("\n")
//    .map(line => `// ${line}`)
//    .join("\n")}

const objectTemplate: TemplateFunction = data => {
  return `${
    data.description
      ? data.description
          .split("\n")
          .map((line: string) => `// ${line}`)
          .join("\n")
      : ""
  }
message ${data.name} {
${Object.keys(data.properties)
  .map((prop: string, idx: number) => {
    const property = data.properties[prop];
    return `${
      property.description
        ? property.description
            .split("\n")
            .map((line: string) => `  // ${line}`)
            .join("\n")
        : ""
    }
  ${typeName(
    property.type,
    data.$nschema,
    data.namespace,
    data.name,
    data.$context
  )} ${property.name || prop} = ${idx + 1};`;
  })
  .join("\n")}
}
`;
};

const serviceTemplate: TemplateFunction = data => {
  return `${
    data.description
      ? data.description
          .split("\n")
          .map((line: string) => `// ${line}`)
          .join("\n")
      : ""
  }
service ${data.name} {
${Object.keys(data.operations)
  .map((op: string) => {
    const operation = data.operations[op];
    return `${
      operation.description
        ? operation.description
            .split("\n")
            .map((line: string) => `  // ${line}`)
            .join("\n")
        : ""
    }
  rpc ${op}(${operation.inMessage.data
      .map((f: any) => (typeof f.type === "object" ? f.type.name : f.type))
      .join(", ")}) returns (${operation.outMessage.data
      .map((f: any) => (typeof f.type === "object" ? f.type.name : f.type))
      .join(", ")}) {}`;
  })
  .join("\n")}
}
`;
};

const templates: {
  object: TemplateFunction;
  service: TemplateFunction;
} = {
  object: objectTemplate,
  service: serviceTemplate
};

export class NObject {
  public grpc: gRPC | undefined = undefined;
  public async init(nschema: NSchemaInterface) {
    if (!this.grpc) {
      throw new Error("Argument exception");
    }
    const grpc = this.grpc;

    nschema.registerTarget({
      description: "Generate gRPC models for your nineschema definitions",
      language: "gRPC",
      name: "gRPC/object",
      type: "object",
      async generate(
        config: NineSchemaConfig,
        thisNschema: NSchemaInterface,
        target: Target,
        context: object
      ) {
        return baseGenerate(
          config,
          thisNschema,
          target,
          templates.object,
          grpc,
          context
        );
      }
    });

    nschema.registerTarget({
      description: "Generate gRPC services for your nineschema definitions",
      language: "gRPC",
      name: "gRPC/service",
      type: "service",
      async generate(
        config: NineSchemaConfig,
        thisNschema: NSchemaInterface,
        target: Target,
        context: object
      ) {
        return baseGenerate(
          config,
          thisNschema,
          target,
          templates.service,
          grpc,
          context
        );
      }
    });
    return true;
  }
}
const obj = new NObject();

export default obj;
