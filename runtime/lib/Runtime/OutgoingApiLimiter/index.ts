import Runtime from '@/runtime/lib/Runtime';

const MIN_NUMBER_OF_CALLS_TO_THROTTLE = 5000;

class OutgoingApiLimiter {
  private REDIS_PREFIX = 'outgoing_api';

  // 6 hours in seconds for the uses count to reset
  private EXPIRY_LENGTH = 60 * 60 * 6;

  constructor(private runtime: Runtime) {}

  public makeRedisHostnameHash(hostname: string): string {
    return `${this.REDIS_PREFIX}_${this.runtime.getVersionID()}_${hostname}`;
  }

  public async getHostnameUses(hostname: string): Promise<number | null> {
    const uses = await this.runtime.services.redis.get(this.makeRedisHostnameHash(hostname));

    return uses ? Number(uses) : null;
  }

  public async addHostnameUseAndShouldThrottle(hostname: string): Promise<boolean> {
    const uses = await this.getHostnameUses(hostname);
    // if already existing
    if (uses) {
      // add one to count without updating expiry date
      await this.runtime.services.redis.set(this.makeRedisHostnameHash(hostname), `${uses + 1}`, 'KEEPTTL');
    } else {
      await this.runtime.services.redis.set(this.makeRedisHostnameHash(hostname), '1', 'EX', this.EXPIRY_LENGTH);
    }
    return (uses ? uses + 1 : 1) > MIN_NUMBER_OF_CALLS_TO_THROTTLE;
  }
}

export default OutgoingApiLimiter;
