// =============================================================================
// Data Access Layer — Neo4j Enterprise Connection Manager
// Singleton driver with connection pool limits, lifecycle management, and health probes.
// =============================================================================

import neo4j, {
  type Driver,
  type Session,
  type SessionConfig,
} from "neo4j-driver";

const NEO4J_URI = process.env.NEO4J_URI || "bolt://localhost:7687";
const NEO4J_USER = process.env.NEO4J_USER || "neo4j";
const NEO4J_PASSWORD =
  process.env.NEO4J_PASSWORD || "graph_saas_secure_password";
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || "neo4j";

let driverSingleton: Driver | null = null;

export function getDriver(): Driver {
  if (driverSingleton) return driverSingleton;

  try {
    driverSingleton = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
      {
        maxConnectionPoolSize: 100,
        connectionAcquisitionTimeout: 30_000,
        maxConnectionLifetime: 60 * 60 * 1000,
        connectionTimeout: 20_000,
        disableLosslessIntegers: true,
        logging: {
          level: process.env.NODE_ENV === "production" ? "warn" : "info",
          logger: (level, message) => {
            if (process.env.NODE_ENV !== "production" && level !== "debug") {
              console.log(`[neo4j:${level}] ${message}`);
            }
          },
        },
      },
    );

    return driverSingleton;
  } catch (err) {
    console.error("[neo4jDriver] Initialization failed:", err);
    throw err;
  }
}

export async function checkNeo4jHealth(): Promise<{
  connected: boolean;
  uri: string;
  database: string;
  serverInfo?: string;
  error?: string;
}> {
  try {
    const driver = getDriver();
    const serverInfo = await driver.getServerInfo();
    return {
      connected: true,
      uri: NEO4J_URI,
      database: NEO4J_DATABASE,
      serverInfo: `${serverInfo.agent} (${serverInfo.protocolVersion})`,
    };
  } catch (err: any) {
    return {
      connected: false,
      uri: NEO4J_URI,
      database: NEO4J_DATABASE,
      error: err?.message ?? "Connection failed",
    };
  }
}

export function getSession(config?: SessionConfig): Session {
  return getDriver().session({
    database: NEO4J_DATABASE,
    defaultAccessMode: neo4j.session.WRITE,
    ...config,
  });
}

export async function withSession<T>(
  work: (session: Session) => Promise<T>,
  config?: SessionConfig,
): Promise<T> {
  const session = getSession(config);
  try {
    return await work(session);
  } finally {
    await session.close();
  }
}

export async function closeDriver(): Promise<void> {
  if (driverSingleton) {
    await driverSingleton.close();
    driverSingleton = null;
  }
}
