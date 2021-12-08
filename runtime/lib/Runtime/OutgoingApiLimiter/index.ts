const MIN_NUMBER_OF_CALLS_TO_THROTTLE = 0;
const THROTTLE_FREQUENCY = 5;

class OutgoingApiLimiter {
  private hostnameHits: Record<string, number> = {};

  constructor() {
    this.hostnameHits = {};
  }

  public addHostnameUse(host: string): void {
    if (host in this.hostnameHits) {
      this.hostnameHits[host] += 1;
    } else {
      this.hostnameHits[host] = 1;
    }
  }

  public shouldThrottle(host: string): boolean {
    // throttle the request every THROTTLE_FREQUENCY requests after it exceeds MIN_NUMBER_OF_CALLS_TO_THROTTLE total calls
    return (
      host in this.hostnameHits && this.hostnameHits[host] > MIN_NUMBER_OF_CALLS_TO_THROTTLE && this.hostnameHits[host] % THROTTLE_FREQUENCY === 0
    );
  }
}

export default OutgoingApiLimiter;
