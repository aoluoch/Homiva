import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";

export default function NotFoundPage() {
  return (
    <div className="container grid min-h-[70vh] place-items-center py-10 text-center">
      <div>
        <Logo className="justify-center" />
        <p className="mt-6 text-6xl font-extrabold text-primary">404</p>
        <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}
