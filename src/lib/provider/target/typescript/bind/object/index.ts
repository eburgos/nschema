/**
 * Created by eburgos on 6/13/14.
 */
import { isArray } from "util";
import { TypeScript } from "../..";
import { writeDebugLog } from "../../../../../logging";
import {
  AppendableMixin,
  HasFilenameMixin,
  HasImplementsMixin,
  NSchemaInterface,
  NSchemaModifier,
  NSchemaProperty,
  NSchemaType,
  NSchemaTypeDefinition,
  Target,
  TemplateFunction
} from "../../../../../model";
import { initialCaps, wrap } from "../../../../../utils";
import { MessageTask } from "../../../../type/message";
import { ObjectTask } from "../../../../type/object";
import { ServiceTask } from "../../../../type/service";
import { renderFileHeader, typeName } from "../../helpers";

export interface TypeScriptLiteralsUnion {
  literals: string[];
  modifier?: NSchemaModifier;
  name: "string";
  namespace: undefined;
}

export type TypeScriptType = NSchemaType | TypeScriptLiteralsUnion;

export interface TypeScriptProperty extends NSchemaProperty {
  type: TypeScriptType;
  typescriptName?: string;
  typescriptValue?: string;
}

export interface TypeScriptObject
  extends ObjectTask,
    AppendableMixin,
    HasFilenameMixin,
    HasImplementsMixin {
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
          const $currentVal =
            typeof property.typescriptValue !== "undefined"
              ? property.typescriptValue
              : cnt;
          return `/*
          * ${(property.description || "").replace(/\n/g, "\n     * ")}
          */
         ${property.typescriptName || initialCaps(prop)} = ${$currentVal}`;
        }).join(`,
        `)}
    }
    /*::
    export type ${data.name} = ${Object.keys(data.properties || {})
    .map(wrapDoubleQuotes)
    .join(" | ")};
    */`;
}

function renderClass(data: TypeScriptObject, $nschema: NSchemaInterface) {
  return `interface ${data.name}${
    data.implements && data.implements.length
      ? ` extends ${data.implements.map(impl => typeName(impl)).join(", ")}`
      : ""
  } {
${Object.keys(data.properties || {})
  .map(prop => {
    if (!data.properties) {
      throw new Error("Invalid argument");
    }
    const $property = data.properties[prop];
    const $nschemaType = $property.type;
    const $registeredType =
      $nschema.getObject(
        typeof $nschemaType !== "string"
          ? $nschemaType.namespace || ""
          : "" || data.namespace || "",
        typeof $nschemaType !== "string" ? $nschemaType.name : ""
      ) || $nschemaType;
    const modifier = ($nschemaType as NSchemaTypeDefinition).modifier;
    const isOptional =
      typeof $nschemaType !== "string"
        ? modifier
          ? (isArray(modifier) ? modifier : [modifier]).indexOf("option") >= 0
            ? true
            : false
          : false
        : false;
    return `  /**
   * ${($property.description || "").replace(/\n/g, "\n     * ")}
   */
  ${$property.typescriptName || prop}${isOptional ? "?" : ""}: ${typeName(
      $registeredType,
      $nschema
    )};
`;
  })
  .join("\n")}}
`;
}

const templates = {
  object(
    data: TypeScriptObject | TypeScriptMessage | ServiceTask,
    nschema: NSchemaInterface
  ) {
    if (data.$type === "message" || data.$type === "service") {
      throw new Error("Invalid argument");
    }
    return `${renderFileHeader(data)}
export ${
      data.$subType === "enumeration"
        ? renderEnum(data)
        : renderClass(data, nschema)
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

    nschema.registerTarget({
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
    return Promise.resolve(true);
  }
}
const obj = new NObject();

export default obj;
