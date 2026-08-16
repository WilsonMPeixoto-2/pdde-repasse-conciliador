export interface CurrentMonitoringPublisher {
  publish(input: {
    runId: string;
    expectedSchoolCount: number;
    fiscal: unknown;
    human: unknown;
  }): Promise<void>;
}
