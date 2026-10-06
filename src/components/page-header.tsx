export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-border bg-secondary/60">
      <div className="container-page py-10 sm:py-14">
        <h1 className="text-3xl font-extrabold text-primary sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-lg text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
