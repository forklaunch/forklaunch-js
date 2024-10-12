import { forklaunchExpress } from 'core';
import { bootstrap } from './bootstrapper';
import { router as organizationRouter } from './routes/organization.routes';
import { router as permissionRouter } from './routes/permission.routes';
import { router as roleRouter } from './routes/role.routes';
import { router as userRouter } from './routes/user.routes';

export const ci = bootstrap();

const app = forklaunchExpress();
const port = Number(process.env.PORT) || 8000;

app.use(organizationRouter);
app.use(roleRouter);
app.use(permissionRouter);
app.use(userRouter);

app.listen(port, () => {
  console.log(`🎉 IAM Server is running at http://localhost:${port} 🎉`);
});
