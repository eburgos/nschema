# TypeScript

Generate TypeScript interfaces

## String Literal Types

You can generate string literal types using the following:

(Note that type must be exactly `{ name: "string", namespace: "" }`) in order to tell the generator that we are generating a string fromt the literals.

### Configuration

```typescript
import {
  TypeScriptObject,
  TypeScriptBundle
} from "nineschema/src/lib/provider/target/typescript";

const MessageA: TypeScriptObject = {
  type: "object",
  name: "MessageA",
  properties: {
    type: {
      description: "Message type",
      type: {
        name: "string",
        namespace: "",
        literals: ["typeA"]
      }
    },
    name: {
      description: `Name`,
      type: "string"
    }
  }
};

const MessageBandC: TypeScriptObject = {
  type: "object",
  name: "MessageBandC",

  properties: {
    type: {
      description: "Message type",
      type: {
        name: "string",
        namespace: "",
        literals: ["typeB", "typeC"]
      }
    }
  }
};

const bundle: TypeScriptBundle = {
  type: "bundle",
  $namespace: "Messages",
  list: [MessageA, MessageBancC],
  $target: [
    {
      location: `<your target location>`,
      language: "typescript"
    }
  ]
};

export default bundle;
```

### Output

```TypeScript
/**
 *
 */
export interface MessageA {
  /**
   * Message type
   */
  type: "typeA";

  /**
   * Name
   */
  name: string;
}

/**
 *
 */
export interface MessageBandC {
  /**
   * Message type
   */
  type: "typeB" | "typeC";
}
```

## Context-based Service Operations

You can group arguments into service operations.

### Configuration

```typescript
import {
  TypeScriptObject,
  TypeScriptBundle
} from "nineschema/src/lib/provider/target/typescript";

const ordersService: NSchemaRestService = {
  type: "service",
  description: "Orders service",
  name: "OrdersService",
  routePrefix: "api/",
  operations: {
    Orders: {
      description: "Returns all orders",
      method: "GET",
      route: "orders",
      inMessage: {
        data: [
          {
            name: "companyId",
            type: "string",
            paramType: "query"
          },
          {
            name: "authorization",
            type: "string",
            paramType: "header",
            headerName: "Authorization"
          }
        ]
      },
      outMessage: {
        data: [
          {
            name: "orders",
            type: {
              name: TripOrder.name,
              namespace: "Api.Orders",
              modifier: ["list"]
            }
          }
        ]
      }
    },
    RemoveOrder: {
      description: "Removes an order",
      method: "DELETE",
      route: "orders/:orderId",
      inMessage: {
        data: [
          {
            name: "companyId",
            type: "string",
            paramType: "query"
          },
          {
            name: "authorization",
            type: "string",
            paramType: "header",
            headerName: "Authorization"
          },
          {
            name: "orderId",
            type: "string",
            paramType: "query"
          }
        ]
      },
      outMessage: {
        data: []
      }
    }
  },
  producerContexts: {
    withAuthentication: {
      description: "Provide authentication token and companyId only once",
      arguments: ["authorization", "companyId"],
      operations: ["Orders", "RemoveOrder"]
    }
  }
};
```

### Output

```TypeScript
  /*
  ...
  <LOTS OF CODE>
  ...
  */

  /*
   * Provide authentication token and companyId only once
   */
  public withAuthentication(authorization: string /* :string */, companyId: string /* :string */) {
    return {
      Orders: () => this.Orders(companyId, authorization),
      RemoveOrder: (orderId: string) => this.RemoveOrder(companyId, authorization, orderId)
    };
  }}
```
