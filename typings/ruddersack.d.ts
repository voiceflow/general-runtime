declare module '@rudderstack/rudder-sdk-node' {
  namespace Analytics {
    interface IdentifyRequest {
      userId: string;
    }

    interface TrackRequest {
      userId: string;
      event: string;
      properties: Record<string, unknown>;
    }
  }

  class Analytics {
    constructor(writeKey?: string, endpoint?: string);

    public identify(data: Analytics.IdentifyRequest): void;

    public track(data: Analytics.TrackRequest): void;
  }

  export = Analytics;
}
