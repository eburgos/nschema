"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../..");
const utils_1 = require("../../../../../utils");
async function baseGenerate(config, nschema, target, template) {
    return __1.default.generate(nschema, config, template, target);
}
function enumTemplate(data) {
    return `[<DataContract>]
  type ${data.name} =
      ${Object.keys(data.properties || {})
        .map((prop, cnt) => {
        if (!data.properties) {
            throw new Error("Invalid parameter");
        }
        const property = data.properties[prop];
        const $currentVal = typeof property.fsharpValue !== "undefined"
            ? property.fsharpValue
            : cnt;
        return `  // ${property.description || ""}
        | [<EnumMember>][<JsonProperty("${prop}")>] ${property.fsharpName ||
            utils_1.initialCaps(prop)} = ${$currentVal}`;
    })
        .join("\n")}`;
}
function classTemplate(data, nschema) {
    const indentIndex = data.append ? 1 : 0;
    return `${data.append ? " and " : ""}${utils_1.indent(indentIndex, "  ")}[<System.CLSCompliant (true)>]
  ${utils_1.indent(indentIndex, "  ")}[<System.Serializable ()>]
  ${utils_1.indent(indentIndex, "  ")}[<DataContract>]
  ${utils_1.indent(indentIndex, "  ")}[<AllowNullLiteral>]
  ${utils_1.indent(indentIndex, "  ")}${data.append ? "" : "type "}${data.name}() =
  ${!data.implements
        ? ""
        : `${data.implements
            .map(imp => {
            return `${utils_1.indent(indentIndex, "  ")}  implements ${__1.default.typeName(imp, nschema, data.namespace || "")}`;
        })
            .join("\n")}`}
  ${Object.keys(data.properties || {})
        .map(prop => {
        if (!data.properties) {
            throw new Error("Invalid argument");
        }
        const property = data.properties[prop];
        const $nschemaType = property.type;
        const $registeredType = typeof $nschemaType === "string"
            ? undefined
            : nschema.getObject($nschemaType.namespace || data.namespace || "", $nschemaType.name);
        return `${utils_1.indent(indentIndex, "  ")}  /// <summary>${data.description ||
            ""}</summary>
      ${utils_1.indent(indentIndex, "  ")}  ${$registeredType && $registeredType.subType === "enumeration"
            ? `[<JsonConverter(typeof<StringEnumConverter>)>]
${utils_1.indent(indentIndex, "  ")}  `
            : ""}${property.options && property.options.ignoreSerialization
            ? "[<System.Runtime.Serialization.IgnoreDataMember>][<System.Xml.Serialization.XmlIgnore()>][<JsonIgnore()>]"
            : `[<DataMember>][<JsonProperty("${prop}")>]`} member val ${property.fsharpName ||
            utils_1.initialCaps(prop)}: ${__1.default.typeName($nschemaType, nschema, data.namespace || "")} = ${__1.typeDefaultValue($nschemaType, property, __1.default, nschema, data.namespace || "")} with get, set`;
    })
        .join("\n")}
`;
}
const objectTemplate = (data, nschema) => {
    if (data.type === "service" || data.type === "message") {
        throw new Error("Invalid argument");
    }
    return `${__1.classHeader(data)}
  ${data.subType === "enumeration"
        ? enumTemplate(data)
        : classTemplate(data, nschema)}
`;
};
const obj = {
    async init(nschema) {
        nschema.registerTarget({
            description: "Generate fsharp models for your nineschema definitions",
            language: "fsharp",
            name: "fsharp/object",
            type: "object",
            async generate(config, thisNschema, target) {
                return baseGenerate(config, thisNschema, target, objectTemplate);
            }
        });
        return Promise.resolve(true);
    }
};
exports.default = obj;
