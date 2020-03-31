/**
 * Created by eburgos on 6/13/14.
 */
import { TypeScript, TypeScriptContext } from "../..";
import { writeDebugLog } from "../../../../../logging";
import {
  AppendableMixin,
  HasFilenameMixin,
  NSchemaInterface,
  NSchemaProperty,
  NSchemaType,
  Target,
  TemplateFunction
} from "../../../../../model";
import {
  initialCaps,
  isOptional,
  removeOptional,
  wrap
} from "../../../../../utils";
import { MessageTask } from "../../../../type/message";
import { ObjectTask } from "../../../../type/object";
import { ServiceTask } from "../../../../type/service";
import { renderFileHeader, typeName } from "../../helpers";

export interface TypeScriptProperty extends NSchemaProperty {
  canOmit?: boolean;
  type: NSchemaType;
  typescriptName?: string;
  typescriptValue?: string;
}

export interface TypeScriptObject
  extends ObjectTask,
    AppendableMixin,
    HasFilenameMixin {
  properties?: {
    [name: string]: TypeScriptProperty;
  };
}

export interface TypeScriptMessage extends MessageTask, HasFilenameMixin {}

async function baseGenerate(
  config: TypeScriptObject | TypeScriptMessage,
  nschema: NSchemaInterface,
  target: Target,
  template: TemplateFunction<
    TypeScriptObject | TypeScriptMessage | ServiceTask
  >,
  typescript: TypeScript,
  context: object
) {
  return typescript.generate(nschema, config, template, target, context);
}

const wrapDoubleQuotes = wrap(`"`, `"`);

function renderEnum(data: TypeScriptObject) {
  return `enum ${data.name} {
${Object.keys(data.properties || {}).map((prop, cnt) => {
  if (!data.properties) {
    throw new Error(`Invalid properties`);
  }
  const property = data.properties[prop];
  const currentVal =
    typeof property.typescriptValue !== "undefined"
      ? property.type === "string"
        ? `"${property.typescriptValue}"`
        : property.typescriptValue
      : cnt;
  return `  /*
   * ${(property.description || "").replace(/\n/g, "\n     * ")}
   */
  ${property.typescriptName || initialCaps(prop)} = ${currentVal}`;
}).join(`,

`)}
}

/*::
 export type ${data.name} = ${Object.keys(data.properties || {})
    .map(wrapDoubleQuotes)
    .join(" | ")};
*/
`;
}

function renderClass(
  data: TypeScriptObject,
  nschema: NSchemaInterface,
  context: TypeScriptContext
) {
  return `interface ${data.name}${
    data.implements && data.implements.length
      ? ` extends ${data.implements
          .map((impl) =>
            typeName(
              impl,
              nschema,
              data.namespace || "",
              data.name,
              context,
              false,
              false,
              true
            )
          )
          .join(", ")}`
      : ""
  } {
${Object.keys(data.properties || {})
  .map((prop) => {
    if (!data.properties) {
      throw new Error("Invalid argument");
    }
    const property = data.properties[prop];
    const nschemaType = property.type;

    const canOmitProperty = isOptional(property) && property.canOmit;

    return `  /**
   * ${(property.description || "").replace(/\n/g, "\n     * ")}
   */
  ${property.typescriptName || prop}${canOmitProperty ? "?" : ""}: ${typeName(
      canOmitProperty ? removeOptional(nschemaType) : nschemaType,
      nschema,
      data.namespace,
      data.name,
      context,
      false,
      false,
      true
    )};
`;
  })
  .join("\n")}}
`;
}

const templates = {
  object(
    data: TypeScriptObject | TypeScriptMessage | ServiceTask,
    nschema: NSchemaInterface,
    context: TypeScriptContext
  ) {
    if (data.type === "message" || data.type === "service") {
      throw new Error("Invalid argument");
    }
    return `${renderFileHeader(data)}
export ${
      data.subType === "enumeration"
        ? renderEnum(data)
        : renderClass(data, nschema, context)
    }`;
  }
};

export class NObject {
  public typescript: TypeScript | undefined = undefined;
  public async init(nschema: NSchemaInterface) {
    if (!this.typescript) {
      throw new Error("Argument exception");
    }
    const typescript = this.typescript;

    await nschema.registerTarget({
      description: "Generate typescript models for your nineschema definitions",
      language: "typescript",
      name: "typescript/object",
      type: "object",
      async generate(
        config: TypeScriptObject | TypeScriptMessage,
        thisNschema: NSchemaInterface,
        target: Target,
        context: object
      ) {
        writeDebugLog(
          `generating contents for ${config.namespace} - ${config.name}`
        );
        return baseGenerate(
          config,
          thisNschema,
          target,
          templates.object,
          typescript,
          context
        );
      }
    });
    return true;
  }
}
const obj = new NObject();

export default obj;
