import Runtime from '@/runtime/lib/Runtime';

const MIN_NUMBER_OF_CALLS_TO_THROTTLE_PRIVATE = 5000;
const MIN_NUMBER_OF_CALLS_TO_THROTTLE_PUBLIC = 1000;

class OutgoingApiLimiter {
  private REDIS_PREFIX = 'outgoing_api';

  // in seconds for the uses count to reset
  private EXPIRY_LENGTH = 60;

  constructor(private runtime: Runtime) {}

  private isPublic(): boolean {
    return !this.runtime.authorization;
  }

  private makeRedisHostnameHash(hostname: string): string {
    return `${this.REDIS_PREFIX}_${this.isPublic() ? 'public' : this.runtime.authorization!}_${hostname}`;
  }

  private async getHostnameUses(hostname: string): Promise<string | null> {
    return this.runtime.services.redis.get(this.makeRedisHostnameHash(hostname));
  }

  public async addHostnameUseAndShouldThrottle(hostname: string): Promise<boolean> {
    const uses = await this.getHostnameUses(hostname);
    // if already existing
    if (uses) {
      // add one to count without updating expiry date
      await this.runtime.services.redis.set(this.makeRedisHostnameHash(hostname), `${Number(uses) + 1}`, 'KEEPTTL');
    } else {
      await this.runtime.services.redis.set(this.makeRedisHostnameHash(hostname), '1', 'EX', this.EXPIRY_LENGTH);
    }
    const numberCallsLimitForProject = this.isPublic() ? MIN_NUMBER_OF_CALLS_TO_THROTTLE_PUBLIC : MIN_NUMBER_OF_CALLS_TO_THROTTLE_PRIVATE;
    return (uses ? Number(uses) + 1 : 1) > numberCallsLimitForProject;
  }
}

export default OutgoingApiLimiter;
