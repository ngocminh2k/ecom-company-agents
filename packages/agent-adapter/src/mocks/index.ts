// Mocks for missing imports

export const loadAppConfig = async () => ({});
export const getActiveVelaProfile = async () => null;
export const resolveProjectRootPath = async () => process.cwd();
export const isSandboxMode = () => false;
export const getKnownAgents = () => [];
export const ensureAgentDependencies = async () => true;

export const systemPrompt = "MOCK SYSTEM PROMPT";
export const getResearchContractPrompt = () => "MOCK RESEARCH PROMPT";
export const roleMarkerGuardStream = (stream: any) => stream;

export const MOCKED_ACP = {};
export const MOCKED_PI_RPC = {};
export const detectQuestionForm = (str: string) => false;

export const resolveSandboxRuntimeConfigFromEnv = () => ({});
export const normalizeMediaExecutionPolicyForRun = () => ({});
export const projectWorkspaceProvenance = () => ({});

// Tool bundle mock
export const loadToolBundle = async () => [];
export const toolBundleToToolDefs = () => [];

// Types
export interface RuntimeAgentDef {
  id: string;
  name: string;
  probe: () => Promise<boolean>;
  spawn: () => any;
}

export interface RuntimeModelOption {
  id: string;
  name: string;
}

export interface RoleMarkerGuard {
  write: (chunk: any) => void;
  end: () => void;
}

export const detectAcpModels = async () => [];
export const parsePiModels = async () => [];
export const execAgentFile = async () => null;
export const DEFAULT_MODEL_OPTION = null;

export const agentCliEnvForAgent = () => ({});
export const readVelaCredentialRevision = async () => null;
export const readAppConfig = async () => ({});
export const renderResearchCommandContract = () => "MOCK";
export const createRoleMarkerGuard = (): RoleMarkerGuard => ({ write: () => {}, end: () => {} });
export const agentCapabilities = () => [];
export const loadMmdRouteModels = async () => [];
export const resolveAmrProfile = async () => null;
export const readAppConfigSync = () => ({});
export const resolveProjectRelativePath = (path: string) => path;
export const amrVelaProfileEnv = async () => ({});
export const resolveProjectRootFromNestedModule = () => process.cwd();
export const emittedRenderableQuestionForm = () => false;

export const applySandboxContainerLimits = () => {};
