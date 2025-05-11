const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  info: (args: object) => {
    console.info("[INFO]", JSON.stringify(args, null, 2));
  },

  warn: (args: object) => {
    console.warn("[WARN]", args);
  },

  error: (args: object) => {
    console.error("[ERROR]", args);
  },

  debug: (args: object) => {
    if (isDev) console.debug("[DEBUG]", args);
  },
};
