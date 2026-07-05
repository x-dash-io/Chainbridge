import { LoginForm } from "./login-form";

export default async function LoginPage(props: {
  searchParams: Promise<{ registered?: string; reset?: string }>;
}) {
  const { registered, reset } = await props.searchParams;

  return (
    <LoginForm
      registered={registered === "true"}
      reset={reset === "true"}
    />
  );
}
