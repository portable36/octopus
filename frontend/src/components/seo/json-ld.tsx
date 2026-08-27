export function JsonLd({ data }: { readonly data: Record<string, unknown> }) {
  // Escape < so JSON cannot break out of the script element (output encoding).
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
