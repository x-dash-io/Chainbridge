type ConfigEntry = {
  key: string;
  label: string;
  required: boolean;
  sensitive: boolean;
};

const CONFIG_DEFINITIONS: ConfigEntry[] = [
  { key: "DATABASE_URL", label: "Database connection string", required: true, sensitive: true },
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase project URL", required: true, sensitive: false },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase anonymous key", required: true, sensitive: true },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase service role key", required: true, sensitive: true },
  { key: "MPESA_CONSUMER_KEY", label: "M-Pesa consumer key", required: true, sensitive: true },
  { key: "MPESA_CONSUMER_SECRET", label: "M-Pesa consumer secret", required: true, sensitive: true },
  { key: "MPESA_PASSKEY", label: "M-Pesa passkey", required: true, sensitive: true },
  { key: "MPESA_SHORTCODE", label: "M-Pesa shortcode", required: true, sensitive: false },
  { key: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", label: "Cloudinary cloud name", required: false, sensitive: false },
  { key: "NEXT_PUBLIC_CLOUDINARY_API_KEY", label: "Cloudinary API key", required: false, sensitive: false },
  { key: "CLOUDINARY_API_SECRET", label: "Cloudinary API secret", required: false, sensitive: true },
  { key: "MPESA_CALLBACK_URL", label: "M-Pesa callback URL override", required: false, sensitive: false },
  { key: "MPESA_CALLBACK_SECRET", label: "M-Pesa callback shared secret", required: false, sensitive: true },
];

export type ConfigValidationResult = {
  valid: boolean;
  missing: { key: string; label: string }[];
  errors: { key: string; message: string }[];
};

export function validateConfig(): ConfigValidationResult {
  const missing: { key: string; label: string }[] = [];
  const errors: { key: string; message: string }[] = [];

  for (const entry of CONFIG_DEFINITIONS) {
    if (!entry.required) continue;

    const value = process.env[entry.key];
    if (!value || value.trim() === "") {
      missing.push({ key: entry.key, label: entry.label });
    } else if (value.startsWith("your-") || value === "replace-me") {
      errors.push({
        key: entry.key,
        message: `${entry.label} (${entry.key}) still has a placeholder value`,
      });
    }
  }

  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors,
  };
}

export function getRequiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value || value === "") {
    throw new Error(
      `Missing required environment variable: ${key}. Check your .env file.`,
    );
  }
  return value;
}

export function getOptionalEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key]?.trim() || defaultValue;
}
