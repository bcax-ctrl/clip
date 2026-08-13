import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqList } from "@/lib/data";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Pertanyaan yang sering diajukan seputar layanan haji dan umrah.",
};

export default function FaqPage() {
  return (
    <div>
      <PageHeader
        title="Pertanyaan yang Sering Diajukan"
        description="Kumpulan jawaban atas pertanyaan yang sering ditanyakan seputar layanan haji dan umrah."
      />

      <section className="container-page py-12 space-y-10">
        {faqList.map((group) => (
          <div key={group.topik}>
            <h2 className="mb-4 text-2xl font-extrabold text-primary">
              {group.topik}
            </h2>
            <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-5">
              {group.pertanyaan.map((item, idx) => (
                <AccordionItem key={idx} value={`${group.topik}-${idx}`}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </section>
    </div>
  );
}
