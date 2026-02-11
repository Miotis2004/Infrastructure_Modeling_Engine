export interface EngineFeatureFlags {
  dynamicSchemaLoading: boolean;
  multiTargetCompilation: boolean;
}

export const DEFAULT_ENGINE_FEATURE_FLAGS: Readonly<EngineFeatureFlags> = Object.freeze({
  dynamicSchemaLoading: false,
  multiTargetCompilation: false
});

export function resolveEngineFeatureFlags(overrides?: Partial<EngineFeatureFlags>): EngineFeatureFlags {
  return {
    ...DEFAULT_ENGINE_FEATURE_FLAGS,
    ...(overrides ?? {})
  };
}
