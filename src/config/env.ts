import "dotenv/config"

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`❌ Missing environment variable: ${name}`);
  }
  return value;
}

const env = {
  DB: requireEnv("DATABASE_CONNECTION"),
  PORT: requireEnv("PORT"),
  SECRET_KEY: requireEnv("SECRET_KEY"),
  PASSWORD_SECRET_KEY: requireEnv("PASSWORD_SECRET_KEY"),
  SESSION_SECRET:requireEnv("SESSION_SECRET")
};

export const { DB, PORT, SECRET_KEY, PASSWORD_SECRET_KEY, SESSION_SECRET } = env;