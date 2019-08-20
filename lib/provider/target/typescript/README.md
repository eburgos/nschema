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
  $type: "object",
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
  $type: "object",
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
  $type: "bundle",
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
