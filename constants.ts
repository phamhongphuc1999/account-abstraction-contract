import * as dotenv from "dotenv";
import { BigNumber } from "ethers";

dotenv.config();

export const DEPLOY_ACCOUNT = process?.env?.DEPLOY_ACCOUNT;
export const ENTRYPOINT = process.env.ENTRYPOINT as string;

export const BASE18 = BigNumber.from("10").pow(18);
