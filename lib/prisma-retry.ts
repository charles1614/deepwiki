import { Prisma } from "@prisma/client";

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MIN_BACKOFF = 5;
const DEFAULT_MAX_BACKOFF = 30;

type BackoffOptions = {
  min?: number;
  max?: number;
};

type RetryOptions = {
  maxRetries?: number;
  backoff?: boolean | BackoffOptions;
};

const sleep = (min: number, max: number) => {
  const ms = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export class PrismaRetryError extends Error {
  constructor() {
    super("Prisma retry limit exceeded.");
    this.name = "PrismaRetryError";
  }
}

interface AllOperationsParams<TArgs = unknown, TResult = unknown> {
  args: TArgs;
  query: (args: TArgs) => Promise<TResult>;
}

/**
 * Creates a Prisma client extension that will retry the query should it have
 * failed because the DB server closed the connection.
 * 
 * This handles the "Error { kind: Closed, cause: None }" error that occurs
 * when Neon/PgBouncer closes idle connections.
 */
export const RetryExtension = (options?: RetryOptions) => ({
  name: "retry extension",
  query: {
    $allModels: {
      async $allOperations<TArgs = unknown, TResult = unknown>({
        args,
        query,
      }: AllOperationsParams<TArgs, TResult>): Promise<TResult> {
        const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

        const backoff = options?.backoff ?? true;

        const minBackoff =
          (typeof options?.backoff === "object" && options.backoff.min) ||
          DEFAULT_MIN_BACKOFF;
        const maxBackoff =
          (typeof options?.backoff === "object" && options.backoff.max) ||
          DEFAULT_MAX_BACKOFF;

        if (minBackoff > maxBackoff) {
          throw new Error("Minimum backoff must be less than maximum backoff");
        }

        let retries = 0;
        do {
          try {
            return await query(args);
          } catch (err) {
            if (
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === "P1017" // Server has closed the connection
            ) {
              console.warn(
                `Prisma: DB server closed connection. Retrying (${retries + 1}/${maxRetries})...`,
              );
              retries++;
              if (backoff) {
                await sleep(minBackoff, maxBackoff);
              }
              continue;
            }
            throw err;
          }
        } while (retries < maxRetries);
        throw new PrismaRetryError();
      },
    },
  },
});
