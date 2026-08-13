type Seksi = { nama: string; tugasSingkat: string };

export function OrgChart({
  kepala,
  seksi,
}: {
  kepala: string;
  seksi: Seksi[];
}) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex min-w-fit flex-col items-center py-6">
        <div className="rounded-xl border-2 border-primary bg-primary px-6 py-4 text-center text-primary-foreground shadow-sm">
          <p className="text-lg font-extrabold">{kepala}</p>
        </div>

        <div className="h-8 w-0.5 bg-border" aria-hidden="true" />

        <div className="relative flex w-full justify-center">
          <div
            className="absolute top-0 hidden h-0.5 bg-border sm:block"
            style={{ left: "12.5%", right: "12.5%" }}
            aria-hidden="true"
          />
          <ul className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {seksi.map((item) => (
              <li key={item.nama} className="flex flex-col items-center">
                <div className="h-8 w-0.5 bg-border sm:block" aria-hidden="true" />
                <div className="flex h-full w-full flex-col rounded-xl border border-border bg-card p-4 text-center shadow-sm">
                  <p className="text-base font-bold text-primary">
                    {item.nama}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.tugasSingkat}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
