/**
 * Created by eburgos on 6/13/14.
 */
"use strict";
import fsharp, { classHeader, typeDefaultValue } from "../..";
import {
  AppendableMixin,
  HasFilenameMixin,
  HasImplementsMixin,
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
    HasFilenameMixin,
    HasImplementsMixin {
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
        | [<EnumMember>][<JsonProperty("${prop}")>] ${property.fsharpName ||
            initialCaps(prop)} = ${$currentVal}`;
        })
        .join("\n")}`;
}

function classTemplate(data: FSharpObject, nschema: NSchemaInterface) {
  const i = data.append ? 1 : 0;
  return `${data.append ? " and " : ""}${indent(
    i,
    "  "
  )}[<System.CLSCompliant (true)>]
  ${indent(i, "  ")}[<System.Serializable ()>]
  ${indent(i, "  ")}[<DataContract>]
  ${indent(i, "  ")}[<AllowNullLiteral>]
  ${indent(i, "  ")}${data.append ? "" : "type "}${data.name}() =
  ${
    !data.implements
      ? ""
      : `${data.implements
          .map(imp => {
            return `${indent(i, "  ")}  implements ${fsharp.typeName(
              imp,
              nschema,
              data.namespace || ""
            )}`;
          })
          .join("\n")}`
  }
  ${Object.keys(data.properties || {})
    .map(prop => {
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
      return `${indent(i, "  ")}  /// <summary>${data.description ||
        ""}</summary>
      ${indent(i, "  ")}  ${
        $registeredType && $registeredType.$subType === "enumeration"
          ? `[<JsonConverter(typeof<StringEnumConverter>)>]
${indent(i, "  ")}  `
          : ""
      }${
        property.options && property.options.ignoreSerialization
          ? "[<System.Runtime.Serialization.IgnoreDataMember>][<System.Xml.Serialization.XmlIgnore()>][<JsonIgnore()>]"
          : `[<DataMember>][<JsonProperty("${prop}")>]`
      } member val ${property.fsharpName ||
        initialCaps(prop)}: ${fsharp.typeName(
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
  if (data.$type === "service" || data.$type === "message") {
    throw new Error("Invalid argument");
  }
  return `${classHeader(data)}
  ${
    data.$subType === "enumeration"
      ? enumTemplate(data)
      : classTemplate(data, nschema)
  }
`;
};

const obj = {
  async init(nschema: NSchemaInterface) {
    nschema.registerTarget({
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
