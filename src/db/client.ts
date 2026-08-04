import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

const client = new PGlite(`${process.cwd()}/.pglite`);

export const db = drizzle(client, { schema });
