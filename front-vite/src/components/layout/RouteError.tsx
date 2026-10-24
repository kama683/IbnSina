import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import ErrorState from "@/components/ui/ErrorState";
import NotFound from "@/components/ui/NotFound";

/** errorElement корня: сюда попадают необработанные ошибки рендера. */
export default function RouteError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound />;
  }

  const message = error instanceof Error ? error.message : undefined;
  return (
    <ErrorState
      fullscreen
      message={message}
      onRetry={() => window.location.reload()}
    />
  );
}
