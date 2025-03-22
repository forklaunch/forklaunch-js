// TODO

// export class BaseBillingPortalService implements BillingPortalService {
//   constructor(private cache: TtlCache) {}

// async createBillingPortalSession(params: any): Promise<BillingPortalDto> {
//   const sessionId = uuidv4();
//   const session = {
//     id: sessionId,
//     createdAt: new Date(),
//     ...params
//   };
//   // Save the session to your database or external service
//   await this.cache.putRecord({
//     key: `billing_portal_session_${sessionId}`,
//     value: session,
//     ttlMilliseconds: this.cache.getTtlMilliseconds()
//   });
//   return session;
// }

// async getBillingPortalSession(id: string): Promise<BillingPortalDto> {
//   const session = await this.cache.readRecord(`billing_portal_session_${id}`);
//   if (!session) {
//     throw new Error('Session not found');
//   }
//   return session;
// }

// async expireBillingPortalSession(id: string): Promise<void> {
//   const sessionExists = await this.cache.readRecord(
//     `billing_portal_session_${id}`
//   );
//   if (!sessionExists) {
//     throw new Error('Session not found');
//   }
//   await this.cache.deleteRecord(`billing_portal_session_${id}`);
//   return { message: 'Portal session deleted successfully', id };
// }
// }
