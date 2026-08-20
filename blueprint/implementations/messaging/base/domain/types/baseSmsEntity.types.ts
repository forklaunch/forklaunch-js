import { ResolvedEntity } from '@forklaunch/core/persistence';
import { SmsRecord } from '../../persistence/entities';

// sms record entity types
export type BaseSmsEntities<StatusEnum> = {
  SmsRecordMapper: {
    '~entity': ResolvedEntity<(typeof SmsRecord)['~entity']> & {
      status: StatusEnum[keyof StatusEnum];
    };
  };
  SendSmsMapper: {
    '~entity': ResolvedEntity<(typeof SmsRecord)['~entity']> & {
      status: StatusEnum[keyof StatusEnum];
    };
  };
};
