/**
 * Created by eburgos on 6/13/14.
 */
"use strict";
import fsharp, { classHeader, typeDefaultValue } from "../..";
import {
  AppendableMixin,
  HasFilenameMixin,
  NSchemaInterface,
  NSchemaProperty,
  NSchemaType,
  Target,
  TemplateFunction
} from "../../../../../model";
import { indent, initialCaps } from "../../../../../utils";
import { MessageTask } from "../../../../type/message";
import { ObjectTask } from "../../../../type/object";
import { ServiceTask } from "../../../../type/service";

export interface FSharpProperty extends NSchemaProperty {
  fsharpName?: string;
  fsharpValue?: string;
  init?: boolean;
  type: NSchemaType;
}

export interface FSharpObject
  extends ObjectTask,
    AppendableMixin,
    HasFilenameMixin {
  properties?: {
    [name: string]: FSharpProperty;
  };
}

async function baseGenerate(
  config: FSharpObject | MessageTask,
  nschema: NSchemaInterface,
  target: Target,
  template: TemplateFunction<FSharpObject | ServiceTask | MessageTask>
) {
  return fsharp.generate(nschema, config, template, target);
}

function enumTemplate(data: FSharpObject) {
  return `[<DataContract>]
  type ${data.name} =
      ${Object.keys(data.properties || {})
        .map((prop, cnt) => {
          if (!data.properties) {
            throw new Error("Invalid parameter");
          }
          const property = data.properties[prop];
          const $currentVal =
            typeof property.fsharpValue !== "undefined"
              ? property.fsharpValue
              : cnt;
          return `  // ${property.description || ""}
        | [<EnumMember>][<JsonProperty("${prop}")>] ${
            property.fsharpName || initialCaps(prop)
          } = ${$currentVal}`;
        })
        .join("\n")}`;
}

function classTemplate(data: FSharpObject, nschema: NSchemaInterface) {
  const indentIndex = data.append ? 1 : 0;
  return `${data.append ? " and " : ""}${indent(
    indentIndex,
    "  "
  )}[<System.CLSCompliant (true)>]
  ${indent(indentIndex, "  ")}[<System.Serializable ()>]
  ${indent(indentIndex, "  ")}[<DataContract>]
  ${indent(indentIndex, "  ")}[<AllowNullLiteral>]
  ${indent(indentIndex, "  ")}${data.append ? "" : "type "}${data.name}() =
  ${
    !data.implements
      ? ""
      : `${data.implements
          .map((imp) => {
            return `${indent(indentIndex, "  ")}  implements ${fsharp.typeName(
              imp,
              nschema,
              data.namespace || ""
            )}`;
          })
          .join("\n")}`
  }
  ${Object.keys(data.properties || {})
    .map((prop) => {
      if (!data.properties) {
        throw new Error("Invalid argument");
      }
      const property = data.properties[prop];
      const $nschemaType = property.type;
      const $registeredType =
        typeof $nschemaType === "string"
          ? undefined
          : nschema.getObject(
              $nschemaType.namespace || data.namespace || "",
              $nschemaType.name
            );
      return `${indent(indentIndex, "  ")}  /// <summary>${
        data.description || ""
      }</summary>
      ${indent(indentIndex, "  ")}  ${
        $registeredType && $registeredType.subType === "enumeration"
          ? `[<JsonConverter(typeof<StringEnumConverter>)>]
${indent(indentIndex, "  ")}  `
          : ""
      }${
        property.options && property.options.ignoreSerialization
          ? "[<System.Runtime.Serialization.IgnoreDataMember>][<System.Xml.Serialization.XmlIgnore()>][<JsonIgnore()>]"
          : `[<DataMember>][<JsonProperty("${prop}")>]`
      } member val ${
        property.fsharpName || initialCaps(prop)
      }: ${fsharp.typeName(
        $nschemaType,
        nschema,
        data.namespace || ""
      )} = ${typeDefaultValue(
        $nschemaType,
        property,
        fsharp,
        nschema,
        data.namespace || ""
      )} with get, set`;
    })
    .join("\n")}
`;
}

const objectTemplate: TemplateFunction<
  FSharpObject | ServiceTask | MessageTask
> = (data, nschema) => {
  if (data.type === "service" || data.type === "message") {
    throw new Error("Invalid argument");
  }
  return `${classHeader(data)}
  ${
    data.subType === "enumeration"
      ? enumTemplate(data)
      : classTemplate(data, nschema)
  }
`;
};

const obj = {
  async init(nschema: NSchemaInterface) {
    await nschema.registerTarget({
      description: "Generate fsharp models for your nineschema definitions",
      language: "fsharp",
      name: "fsharp/object",
      type: "object",
      async generate(
        config: FSharpObject | MessageTask,
        thisNschema: NSchemaInterface,
        target: Target
      ) {
        return baseGenerate(config, thisNschema, target, objectTemplate);
      }
    });
    return Promise.resolve(true);
  }
};

export default obj;
