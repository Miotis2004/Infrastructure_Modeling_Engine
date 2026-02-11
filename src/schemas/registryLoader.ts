import { DEFAULT_ENGINE_FEATURE_FLAGS, resolveEngineFeatureFlags, type EngineFeatureFlags } from "../featureFlags";
import { awsResourceSchemaRegistry } from "./aws";
import type { ResourceSchemaRegistry } from "./types";

export interface SchemaRegistryLoaderContext {
  featureFlags?: Partial<EngineFeatureFlags>;
}

export interface SchemaRegistryLoader {
  load(context?: SchemaRegistryLoaderContext): ResourceSchemaRegistry;
}

export class StaticSchemaRegistryLoader implements SchemaRegistryLoader {
  constructor(private readonly registry: ResourceSchemaRegistry = awsResourceSchemaRegistry) {}

  load(): ResourceSchemaRegistry {
    return this.registry;
  }
}

export class DynamicSchemaRegistryLoader implements SchemaRegistryLoader {
  constructor(private readonly loadFromSource: () => ResourceSchemaRegistry) {}

  load(context: SchemaRegistryLoaderContext = {}): ResourceSchemaRegistry {
    const flags = resolveEngineFeatureFlags(context.featureFlags);

    if (!flags.dynamicSchemaLoading) {
      throw new Error(
        "Dynamic schema loading is disabled. Enable the 'dynamicSchemaLoading' feature flag to use DynamicSchemaRegistryLoader."
      );
    }

    return this.loadFromSource();
  }
}

export function loadDefaultSchemaRegistry(context: SchemaRegistryLoaderContext = {}): ResourceSchemaRegistry {
  const flags = resolveEngineFeatureFlags(context.featureFlags);

  if (flags.dynamicSchemaLoading) {
    throw new Error(
      "Dynamic schema loading is enabled, but no dynamic loader was configured. Provide a SchemaRegistryLoader implementation."
    );
  }

  return awsResourceSchemaRegistry;
}

export const DEFAULT_SCHEMA_REGISTRY_LOADER: SchemaRegistryLoader = new StaticSchemaRegistryLoader();
export const DEFAULT_SCHEMA_REGISTRY_LOADER_CONTEXT: Readonly<SchemaRegistryLoaderContext> = Object.freeze({
  featureFlags: DEFAULT_ENGINE_FEATURE_FLAGS
});
