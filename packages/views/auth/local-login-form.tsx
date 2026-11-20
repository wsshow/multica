"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ApiError, errorCode } from "@multica/core/api";
import { configStore } from "@multica/core/config";
import { Alert, AlertDescription } from "@multica/ui/components/ui/alert";
import { Button } from "@multica/ui/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@multica/ui/components/ui/card";
import { Input } from "@multica/ui/components/ui/input";
import { Label } from "@multica/ui/components/ui/label";
import { Eye, EyeOff, Loader2 } from "@multica/ui/icons";
import { useT } from "../i18n";

interface LocalLoginFormProps {
  logo?: ReactNode;
  setupRequired: boolean;
  sessionExpired: boolean;
  onSubmit: (username: string, password: string, setupCode?: string) => Promise<void>;
}

export function LocalLoginForm({ logo, setupRequired, sessionExpired, onSubmit }: LocalLoginFormProps) {
  const { t } = useT("auth");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    const data = new FormData(event.currentTarget);
    const username = String(data.get("username") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const setupCode = setupRequired ? String(data.get("setup_code") ?? "").trim() : undefined;
    setError("");
    setPending(true);
    try {
      await onSubmit(username, password, setupCode);
    } catch (err) {
      switch (errorCode(err)) {
        case "local_auth_already_configured":
          configStore.setState({ localAuthSetupRequired: false });
          setError(t(($) => $.local.already_configured));
          break;
        case "local_auth_invalid_setup_code":
          setError(t(($) => $.local.invalid_setup_code));
          break;
        case "local_auth_invalid_credentials":
          setError(t(($) => $.local.invalid_credentials));
          break;
        case "local_auth_invalid_username":
          setError(t(($) => $.local.username_hint));
          break;
        case "local_auth_invalid_password":
          setError(t(($) => $.local.password_hint));
          break;
        default:
          setError(err instanceof ApiError && err.status === 429
            ? t(($) => $.local.rate_limited)
            : t(($) => $.local.failed));
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          {logo && <div className="mx-auto mb-4">{logo}</div>}
          <CardTitle className="text-display-sm">
            {setupRequired ? t(($) => $.local.setup_title) : t(($) => $.signin.title)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionExpired && !setupRequired && (
            <Alert><AlertDescription>{t(($) => $.errors.session_expired)}</AlertDescription></Alert>
          )}
          <form id="local-login-form" onSubmit={handleSubmit} className="space-y-4">
            {setupRequired && (
              <div className="space-y-2">
                <Label htmlFor="local-login-code">{t(($) => $.local.setup_code)}</Label>
                <Input id="local-login-code" name="setup_code" autoComplete="one-time-code" autoCapitalize="none"
                  spellCheck={false} aria-describedby="local-login-code-help" required />
                <p id="local-login-code-help" className="text-caption text-muted-foreground">
                  {t(($) => $.local.setup_code_hint)}{" "}
                  <code className="break-all">make integrated-personal-setup-code</code>
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="local-login-username">{t(($) => $.local.username)}</Label>
              <Input id="local-login-username" name="username" autoComplete="username" autoCapitalize="none"
                spellCheck={false} required aria-describedby={setupRequired ? "local-login-username-help" : undefined} />
              {setupRequired && (
                <p id="local-login-username-help" className="text-caption text-muted-foreground">
                  {t(($) => $.local.username_hint)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="local-login-password">{t(($) => $.local.password)}</Label>
              <div className="relative">
                <Input id="local-login-password" name="password" type={passwordVisible ? "text" : "password"}
                  autoComplete={setupRequired ? "new-password" : "current-password"} className="pe-9"
                  spellCheck={false} autoCapitalize="none" required
                  aria-describedby={setupRequired ? "local-login-password-help" : undefined} />
                <Button type="button" className="absolute end-0.5 top-1/2 -translate-y-1/2" size="icon-sm" variant="ghost"
                  aria-label={passwordVisible ? t(($) => $.local.hide_password) : t(($) => $.local.show_password)}
                  onClick={() => setPasswordVisible((visible) => !visible)}>
                  {passwordVisible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </Button>
              </div>
              {setupRequired && (
                <p id="local-login-password-help" className="text-caption text-muted-foreground">
                  {t(($) => $.local.password_hint)}
                </p>
              )}
            </div>
            {error && <p role="alert" className="text-body text-destructive">{error}</p>}
          </form>
        </CardContent>
        <CardFooter>
          <Button type="submit" form="local-login-form" className="w-full" size="lg"
            disabled={isPending} aria-busy={isPending}>
            {isPending && <Loader2 className="animate-spin" aria-hidden />}
            {setupRequired ? t(($) => $.local.setup_submit) : t(($) => $.local.sign_in)}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
