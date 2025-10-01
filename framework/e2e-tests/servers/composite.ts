import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { forklaunchExpress } from '@forklaunch/express';
import { SchemaValidator } from '@forklaunch/validator/zod';
import { forklaunchApplication as forklaunchExpressZod } from './express-zod';
import { forklaunchApplication as forklaunchExpressZodRaw } from './express-zod-raw';

const schemaValidator = SchemaValidator();
const openTelemetryCollector = new OpenTelemetryCollector('test');

export const forklaunchApplication = forklaunchExpress(
  schemaValidator,
  openTelemetryCollector
);

forklaunchApplication.use(forklaunchExpressZod);
forklaunchApplication.use(forklaunchExpressZodRaw);

forklaunchApplication.listen(6935, () => {
  console.log('server started on 6935');
});
