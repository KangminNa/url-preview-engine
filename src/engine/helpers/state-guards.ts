import type { PreviewPipelineState } from '../state'

const assertExists = <T>(
  value: T | undefined,
  field: string,
): T => {
  if (value === undefined) {
    throw new Error(`Preview pipeline state missing: ${field}`)
  }

  return value
}

export const requireNormalizedUrl = (state: PreviewPipelineState): URL => {
  return assertExists(state.normalizedUrl, 'normalizedUrl')
}

export const requireOriginalUrl = (state: PreviewPipelineState): string => {
  return assertExists(state.originalUrl, 'originalUrl')
}

export const requireResolvedUrl = (state: PreviewPipelineState): URL => {
  return assertExists(state.resolvedUrl, 'resolvedUrl')
}

export const requireProvider = (state: PreviewPipelineState) => {
  return assertExists(state.provider, 'provider')
}

export const requireDynamicOptions = (
  state: PreviewPipelineState,
) => {
  return assertExists(state.dynamicOptions, 'dynamicOptions')
}

export const requirePolicies = (state: PreviewPipelineState) => {
  return assertExists(state.activePolicies, 'activePolicies')
}

export const requireContentRules = (state: PreviewPipelineState) => {
  return assertExists(state.activeContentRules, 'activeContentRules')
}

export const requirePolicyRegistry = (state: PreviewPipelineState) => {
  return assertExists(state.policyRegistry, 'policyRegistry')
}

export const requireContentProfileRegistry = (
  state: PreviewPipelineState,
) => {
  return assertExists(state.contentProfileRegistry, 'contentProfileRegistry')
}

export const requireClassification = (state: PreviewPipelineState) => {
  return assertExists(state.classification, 'classification')
}

export const requireCapability = (state: PreviewPipelineState) => {
  return assertExists(state.capability, 'capability')
}

export const requireCard = (state: PreviewPipelineState) => {
  return assertExists(state.card, 'card')
}
