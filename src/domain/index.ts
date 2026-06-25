// Domain layer — pure business rules, platform-agnostic (no Electron/Node).
export type { UserContext } from "./auth/user-context.js";
export type { ElementDescriptor } from "./selectors/element-descriptor.js";
export {
  bestSelector,
  generateSelectors,
  unstableSelectorWarning,
  type GeneratedSelector,
  type SelectorConfidence,
  type SelectorStrategy,
} from "./selectors/selector-generator.js";
export { isAbsoluteXpath, isStableCss } from "./selectors/selector-stability.js";
