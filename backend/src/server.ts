import app from './app';
import { APP_PORT } from '@constants/index';

app.listen(APP_PORT, () => {
  console.info('Voting System Server running at ', APP_PORT);
});
