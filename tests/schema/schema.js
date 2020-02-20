"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bundle = {
    $target: [
        {
            language: "fsharp",
            location: "./generated/test1/schema"
        },
        {
            $namespaceMapping: {
                "@angular/core": "@angular/core",
                "@angular/http": "@angular/http",
                "ninejs/request": "ninejs/request",
                "rxjs/Rx": "rxjs/Rx"
            },
            $restClientStrategy: "Default",
            bind: "rest",
            language: "typescript",
            location: "./generated/typescriptClient/schema",
            serviceType: "producer"
        }
    ],
    list: [
        {
            importLocation: "./subschema.json",
            type: "import"
        },
        {
            $namespace: "Invoicing",
            list: [
                {
                    name: "Invoice",
                    properties: {
                        customerId: {
                            description: "Customer's number",
                            type: "int"
                        },
                        details: {
                            description: "Invoice details",
                            type: {
                                modifier: "list",
                                name: "InvoiceDetail",
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
                    ],
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
                    $namespaceMapping: {
                        "@angular/core": "@angular/core",
                        "@angular/http": "@angular/http",
                        "ninejs/request": "ninejs/request",
                        "rxjs/Rx": "rxjs/Rx"
                    },
                    $restClientStrategy: "Default",
                    bind: "rest",
                    language: "typescript",
                    location: "./generated/typescriptClient/schema",
                    serviceType: "producer"
                }
            ],
            list: [
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
                            $namespaceMapping: {
                                "@angular/core": "@angular/core",
                                "@angular/http": "@angular/http",
                                "rxjs/Rx": "rxjs/Rx"
                            },
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
                            description: "Tests an operation that has parameters of all kinds",
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
                                ],
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
                                            modifier: "list",
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
                                ]
                            },
                            route: "parameters/{routeParameter1}/all"
                        },
                        Authenticate: {
                            description: "Tests for authentication",
                            inMessage: {
                                data: [],
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
                                    }
                                ]
                            }
                        },
                        GetTwoValueOperation: {
                            description: "Tests an operation that yields 2 values",
                            inMessage: {
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
                }
            ],
            type: "bundle"
        }
    ],
    namespace: "NSchema.Model",
    type: "bundle"
};
exports.default = bundle;
