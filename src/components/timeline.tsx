export function Timeline({
  steps,
}: {
  steps: { judul: string; deskripsi: string }[];
}) {
  return (
    <ol className="space-y-0">
      {steps.map((step, idx) => (
        <li key={idx} className="relative flex gap-5 pb-8 last:pb-0">
          {idx !== steps.length - 1 ? (
            <span
              className="absolute top-11 left-5 h-[calc(100%-1.5rem)] w-0.5 -translate-x-1/2 bg-border"
              aria-hidden="true"
            />
          ) : null}
          <span className="z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-primary-foreground">
            {idx + 1}
          </span>
          <div className="pt-1.5">
            <p className="text-lg font-bold">{step.judul}</p>
            <p className="mt-1 text-base text-muted-foreground">
              {step.deskripsi}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
