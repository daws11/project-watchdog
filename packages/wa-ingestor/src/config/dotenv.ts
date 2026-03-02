import { config } from "dotenv";

config({ path: "../../.env" });
config({ path: "../../.env.local" });
config();

export const dotenvConfigured = true;

