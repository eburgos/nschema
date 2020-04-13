import { NSchemaRestService, RestMessageArgument } from "../../lib/model";
import { TypeScriptRestTarget } from "../../lib/provider/target/typescript/bind/rest";
import { BundleTask } from "../../lib/provider/type/bundle";

// This is a NSchema sample config file. Config files can either be defined as pure JSON or as a CJS module like this one.
// NSchema configs work in a parent-child model. Each child config overrides whatever a parent defines.
// Eg: If parent defines target language as 'javascript' then a child can redefine target language as ['javascript', 'fsharp']
const bundle: BundleTask = {
  // Available default targets can be found in lib/provider/target. The names are the same as it's filename
  // 'javascript' and 'fsharp' are valid values
  // This property can either be an array or a single string
  $target: [
    {
      language: "fsharp",
      location: "./generated/test1/schema"
    },
    {
      $namespaceMapping: {},
      $restClientStrategy: "Default",
      bind: "rest",
      language: "typescript",
      location: "./generated/typescriptClient/schema",
      serviceType: "producer"
    } as TypeScriptRestTarget
  ],

  // type can be one of: 'import', 'bundle', 'message', 'model', 'service'
  // 'import'  defines that this object is a reference to a NSchema definition somewhere else (probably a local file but possibly a remote file via http)
  // 'bundle'  defines that this object is a bundle (an array of other NSchema definitions)
  // 'object'   defines that this object is an object model. A class such as Person, Dog, etc
  // 'service' defines that this object is a service definition. It probably defines all it's methods, types, parameters, etc
  // 'message' defines that this object is a service message. A message can be a parameter or a group of parameters
  //
  // It's probably better to start off with a bundle since a bundle let's you define a list of objects

  list: [
    // This import executes whatever is in the external subschema.json file
    {
      importLocation: "./subschema.json",
      type: "import"
    },
    // As you can see, we can have bundles inside of bundles
    {
      // $namespace means Append this string to the current 'namespace' variable. This sets 'namespace' to 'NSchema.Model.Invoicing'
      $namespace: "Invoicing",

      list: [
        {
          name: "Invoice",
          properties: {
            customerId: {
              description: "Customer's number",
              // Simple types normally have just a string value
              type: "int" //primitive types can be 'int', 'string', 'bool', 'float'
            },
            details: {
              description: "Invoice details",
              // Custom types can be defined as an object
              type: {
                // This tells that 'details' is a list of InvoiceDetail
                modifier: ["list"],
                name: "InvoiceDetail",
                // If namespace is not present it is assumed as if the type belongs to your namespace.
                // Empty namespaces must be defined as ''
                namespace: "NSchema.Model.InvoicingDetail"
              }
            }
          },
          type: "object"
        },
        {
          name: "AuthenticationStatus",
          properties: {
            LoggedIn: {
              description: "User is logged in",
              type: "string"
            },
            LoggedOut: {
              description: "User is logged out",
              type: "string"
            }
          },
          subType: "enumeration",
          type: "object"
        },
        {
          name: "UserInfo",
          properties: {
            name: {
              description: "User name",
              type: "string"
            },
            status: {
              description: "Auth Status",
              type: {
                name: "AuthenticationStatus"
              }
            }
          },
          type: "object"
        },
        {
          data: [
            {
              description: "Your login that you registered",
              name: "userName",
              paramType: "query",
              type: "string"
            },
            {
              description: "Your secret password",
              name: "password",
              paramType: "query",
              type: "string"
            }
          ] as RestMessageArgument[],
          name: "AuthMessage",
          type: "message"
        }
      ],
      type: "bundle"
    },
    {
      $namespace: "Services",
      $target: [
        {
          $namespaceMapping: {},
          $restClientStrategy: "Default",
          bind: "rest",
          language: "typescript",
          location: "./generated/typescriptClient/schema",
          serviceType: "producer"
        } as TypeScriptRestTarget
      ],
      list: [
        // Finally our first service
        {
          $target: [
            {
              bind: "amqpRpc",
              language: "fsharp",
              location: "./generated/test1/schema/client",
              serviceType: "producer"
            },
            {
              $fileName: "InvoiceServiceConsumer.fs",
              bind: "amqpRpc",
              language: "fsharp",
              location: "./generated/test1/schema/server",
              serviceType: "consumer"
            },
            {
              $namespaceMapping: {},
              bind: "rest",
              language: "typescript",
              location: "./generated/typescriptClient/schema/client",
              serviceType: "producer"
            },
            {
              bind: "rest",
              language: "typescript",
              location: "./generated/typescriptClient/schema/server",
              serviceType: "consumer"
            }
          ],
          name: "InvoiceService",
          operations: {
            AllParametersOperation: {
              description:
                "Tests an operation that has parameters of all kinds",

              inMessage: {
                data: [
                  {
                    description: "Header parameter",
                    name: "headerParameter1",
                    paramType: "header",
                    type: "string"
                  },
                  {
                    description: "Get parameter",
                    name: "getParameter1",
                    paramType: "query",
                    type: "int"
                  },
                  {
                    description: "route parameter",
                    name: "routeParameter1",
                    paramType: "query",
                    type: "int"
                  },
                  {
                    description: "body parameter",
                    name: "bodyParameter1",
                    paramType: "body",
                    type: "string"
                  },
                  {
                    description: "body parameter 2",
                    name: "bodyParameter2",
                    paramType: "body",
                    type: {
                      name: "Invoice",
                      namespace: "NSchema.Model.Invoicing"
                    }
                  }
                ] as RestMessageArgument[],
                // This message inherits AuthMessage
                extends: {
                  name: "AuthMessage",
                  namespace: "NSchema.Model.Invoicing"
                }
              },
              method: "post",
              outMessage: {
                data: [
                  {
                    description: "List of invoices",
                    type: {
                      modifier: ["list"],
                      name: "Invoice",
                      namespace: "NSchema.Model.Invoicing"
                    }
                  },
                  {
                    description: "error message",
                    paramType: "header",
                    type: "string"
                  },
                  {
                    description: "Instance name who took the message",
                    name: "instanceName",
                    paramType: "header",
                    type: "string"
                  }
                ] as RestMessageArgument[]
              },
              route: "parameters/{routeParameter1}/all"
            },
            Authenticate: {
              description: "Tests for authentication",
              inMessage: {
                data: [],
                // This message inherits AuthMessage
                extends: {
                  name: "AuthMessage",
                  namespace: "NSchema.Model.Invoicing"
                }
              },
              outMessage: {
                data: [
                  {
                    description: "",
                    name: "userInfo",
                    type: {
                      name: "UserInfo",
                      namespace: "NSchema.Model.Invoicing"
                    }
                  }
                ]
              }
            },
            GetInvoiceList: {
              description: "Returns the list of invoices",
              inMessage: {
                data: [],
                // This message inherits AuthMessage
                extends: {
                  name: "AuthMessage",
                  namespace: "NSchema.Model.Invoicing"
                }
              },
              outMessage: {
                data: [
                  {
                    description: "List of invoices",
                    name: "invoiceList",
                    type: {
                      modifier: ["list"],
                      name: "Invoice",
                      namespace: "NSchema.Model.Invoicing"
                    }
                  }
                ]
              }
            },

            GetTwoValueOperation: {
              description: "Tests an operation that yields 2 values",
              inMessage: {
                // This message inherits AuthMessage
                extends: {
                  name: "AuthMessage",
                  namespace: "NSchema.Model.Invoicing"
                }
              },
              outMessage: {
                data: [
                  {
                    description: "List of invoices",
                    name: "invoiceList",
                    type: {
                      modifier: "list",
                      name: "Invoice",
                      namespace: "NSchema.Model.Invoicing"
                    }
                  },
                  {
                    description: "error message",
                    name: "errorMessage",
                    type: "string"
                  }
                ]
              }
            }
          },
          type: "service"
        } as NSchemaRestService
      ],
      type: "bundle"
    }
  ],
  // Namespace used assuming this generation generates classes or something that requires namespaces (such as C# or Java)
  namespace: "NSchema.Model",
  type: "bundle"
};

export default bundle;
