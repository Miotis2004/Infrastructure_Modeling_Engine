import type { InfrastructureModel } from "../ir/model";
import { sampleModelFixture } from "../fixtures/sampleModel";

export function createSampleArchitectureTemplate(): InfrastructureModel {
  return structuredClone(sampleModelFixture as InfrastructureModel);
}
