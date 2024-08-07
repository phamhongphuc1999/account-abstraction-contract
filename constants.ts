import * as dotenv from 'dotenv';

dotenv.config();

export const DEPLOY_ACCOUNT = process?.env?.DEPLOY_ACCOUNT;
export const ENTRYPOINT = process.env.ENTRYPOINT as string;
