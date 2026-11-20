import { useState, type FormEvent } from "react";
import { MulticaIcon } from "@multica/ui/components/common/multica-icon";
import { Button } from "@multica/ui/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@multica/ui/components/ui/card";
import { Input } from "@multica/ui/components/ui/input";
import { Label } from "@multica/ui/components/ui/label";
import { Loader2 } from "@multica/ui/icons";
import { useT } from "@multica/views/i18n";
import { DragStrip } from "@multica/views/platform";

export function ConnectServerPage() {
  const { t } = useT("auth");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    const address = new FormData(event.currentTarget).get("address");
    if (typeof address !== "string") return;
    setError("");
    setIsPending(true);
    try {
      const result = await window.desktopAPI.connectToServer(address);
      if (result.ok) return;
      setError(t(($) => $.desktop.connection[result.reason]));
    } catch {
      setError(t(($) => $.desktop.connection.save_failed));
    }
    setIsPending(false);
  };

  return (
    <div className="flex h-screen flex-col">
      <DragStrip />
      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4"><MulticaIcon mode="intro" size={48} /></div>
            <CardTitle className="text-display-sm">{t(($) => $.desktop.connection.title)}</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="desktop-server-form" onSubmit={handleSubmit} className="space-y-2">
              <Label htmlFor="desktop-server-address">{t(($) => $.desktop.connection.address)}</Label>
              <Input id="desktop-server-address" name="address" type="url" placeholder="http://localhost:8080"
                aria-invalid={Boolean(error)} autoCapitalize="none" spellCheck={false} required />
              {error && <p role="alert" className="text-body text-destructive">{error}</p>}
            </form>
          </CardContent>
          <CardFooter>
            <Button type="submit" form="desktop-server-form" className="w-full" size="lg"
              disabled={isPending} aria-busy={isPending}>
              {isPending && <Loader2 className="animate-spin" aria-hidden />}
              {t(($) => $.desktop.connection.connect)}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
