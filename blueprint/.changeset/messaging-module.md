---
'@forklaunch/interfaces-messaging': minor
'@forklaunch/implementation-messaging-base': minor
'@forklaunch/implementation-messaging-twilio': minor
---

Add messaging module: SmsService interface with a base implementation (persists and logs instead of dispatching) and a Twilio implementation (dependency-free Messages REST API dispatch via fetch plus delivery status callback mapping).
