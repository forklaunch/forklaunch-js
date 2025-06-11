import { BetterAuthOptions, betterAuth } from 'better-auth';

export class BetterAuth<T extends BetterAuthOptions> {
  betterAuthConfig: ReturnType<typeof betterAuth<T>>;

  constructor(options: T) {
    this.betterAuthConfig = betterAuth(options);
  }
}
