/**
 * Created by eburgos on 6/13/14.
 */
"use strict";
import {
  GRPC,
  GRPCContext,
  GRPCMessage,
  GRPCObject,
  GRPCService,
  typeName
} from "../..";
import {
  NSchemaInterface,
  Target,
  TemplateFunction
} from "../../../../../model";

async function baseGenerate(
  config: GRPCObject | GRPCService,
  nschema: NSchemaInterface,
  target: Target,
  template: TemplateFunction<
    GRPCObject | GRPCMessage | GRPCService,
    GRPCContext
  >,
  grpc: GRPC,
  context: object
) {
  return grpc.generate(nschema, config, template, target, context);
}

//    // ${JSON.stringify(operation, null, 4)
//    .split("\n")
//    .map(line => `// ${line}`)
//    .join("\n")}

const objectTemplate: TemplateFunction<
  GRPCMessage | GRPCObject | GRPCService,
  GRPCContext
> = (data, nschema, context) => {
  if (data.type === "message" || data.type === "service") {
    throw new Error("Invalid argument");
  }
  return `${
    data.description
      ? data.description
          .split("\n")
          .map((line: string) => `// ${line}`)
          .join("\n")
      : ""
  }
message ${data.name} {
${Object.keys(data.properties || {})
  .map((prop: string, idx: number) => {
    if (!data.properties) {
      throw new Error("Invalid argument");
    }
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
    nschema,
    data.namespace,
    data.name,
    context
  )} ${prop} = ${idx + 1};`;
  })
  .join("\n")}
}
`;
};

const serviceTemplate: TemplateFunction<
  GRPCMessage | GRPCObject | GRPCService,
  GRPCContext
> = (data) => {
  if (data.type === "message" || data.type === "object") {
    throw new Error("Invalid argument");
  }
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
  .map((operationName: string) => {
    const operation = data.operations[operationName];
    return `${
      operation.description
        ? operation.description
            .split("\n")
            .map((line: string) => `  // ${line}`)
            .join("\n")
        : ""
    }
  rpc ${operationName}(${(operation.inMessage.data || [])
      .map((argument: any) =>
        typeof argument.type === "object" ? argument.type.name : argument.type
      )
      .join(", ")}) returns (${(operation.outMessage.data || [])
      .map((argument: any) =>
        typeof argument.type === "object" ? argument.type.name : argument.type
      )
      .join(", ")}) {}`;
  })
  .join("\n")}
}
`;
};

const templates: {
  object: TemplateFunction<GRPCMessage | GRPCObject | GRPCService>;
  service: TemplateFunction<GRPCMessage | GRPCObject | GRPCService>;
} = {
  object: objectTemplate,
  service: serviceTemplate
};

export class NObject {
  public grpc: GRPC | undefined = undefined;
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
        config: GRPCObject,
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
        config: GRPCService,
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
