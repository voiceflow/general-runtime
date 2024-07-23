/* eslint-disable no-console */
import dotenv from 'dotenv';
import fs from 'fs';

if (process.env.NODE_ENV && fs.existsSync(`./.env.${process.env.NODE_ENV}`)) {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`Running in ${process.env.NODE_ENV} environment`);
  }

  dotenv.config({ path: `./.env.${process.env.NODE_ENV}` });
} else if (fs.existsSync('./.env')) {
  dotenv.config();
}
