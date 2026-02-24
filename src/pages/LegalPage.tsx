import { Link, Navigate, useParams } from "react-router-dom";
import {
  LegalDocumentContent,
  legalDocumentList,
  legalDocuments,
  type LegalDocumentKey,
} from "../shared/legal/legalDocuments";
import { useSeo } from "../shared/seo/useSeo";

export function LegalPage() {
  const params = useParams<{ doc: LegalDocumentKey }>();
  const docKey = params.doc;

  if (!docKey || !(docKey in legalDocuments)) {
    return <Navigate to="/legal/terminos" replace />;
  }

  const document = legalDocuments[docKey as LegalDocumentKey];

  useSeo({
    title: `${document.title} | DomusBrag`,
    description: document.summary,
    canonicalPath: `/legal/${document.key}`,
    noindex: true,
  });

  return (
    <div className="space-y-6">
      <section className="relative isolate -mx-2 -mt-2 overflow-hidden rounded-[26px] border border-white/12 bg-night-900/55 px-5 py-6 shadow-card md:mx-0 md:-mt-6 md:px-8 md:py-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#AF8C5C]/12 via-transparent to-white/5" />
        <div className="relative space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-[#D1C7BD]">Legal</p>
          <h1 className="font-display text-3xl text-white md:text-4xl">{document.title}</h1>
          <p className="mx-auto max-w-3xl text-sm text-[#D1C7BD]">{document.subtitle}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass-card h-fit p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.14em] text-[#D1C7BD]">
            Documentos
          </div>
          <nav className="space-y-2">
            {legalDocumentList.map((item) => (
              <Link
                key={item.key}
                to={`/legal/${item.key}`}
                className={`block rounded-xl border px-3 py-2 text-sm transition ${
                  item.key === document.key
                    ? "border-gold-500/45 bg-gold-500/10 text-white"
                    : "border-white/10 bg-night-900/30 text-[#D1C7BD] hover:border-white/20 hover:text-white"
                }`}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="glass-card p-5 md:p-6">
          <LegalDocumentContent document={document} />
        </section>
      </div>
    </div>
  );
}

