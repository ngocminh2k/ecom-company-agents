// Mocks for agent-adapter runtimes

export interface AmrModelsResponse {
  models: any[];
}

export interface AgentFixIntent {
  type: string;
  [key: string]: any;
}

export interface AgentDiagnostic {
  message: string;
  severity: 'error' | 'warning' | 'info';
  [key: string]: any;
}

export interface TrackingRunResult {
  [key: string]: any;
}
