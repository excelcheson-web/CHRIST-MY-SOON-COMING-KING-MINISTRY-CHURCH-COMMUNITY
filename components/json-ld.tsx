import type { JsonLdObject } from '@/lib/seo'

/**
 * Renders one or more schema.org objects into the page.
 *
 * ## Why the escaping matters
 *
 * This writes into a `<script>` element, and the HTML parser ends that element
 * at the first literal `</script>` in the text — it does not care that the
 * sequence is inside a JSON string. So a sermon titled
 * `Freedom </script><script>…` would close our tag early and run whatever came
 * next, in the visitor's session, on every page that lists it.
 *
 * The event and sermon markup is built from titles and descriptions typed into
 * the admin forms, which makes this a real path rather than a theoretical one:
 * a compromised or careless staff account must not be able to reach into the
 * page. Escaping `<` to its `<` unicode form makes it impossible to write
 * any tag at all, and JSON parsers read the escape back as a plain `<`, so the
 * structured data itself is unchanged.
 *
 * `dangerouslySetInnerHTML` is unavoidable here — React would otherwise escape
 * the JSON into HTML entities and no consumer could parse it.
 */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  const documents = Array.isArray(data) ? data : [data]

  return (
    <>
      {documents.map((document, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(document).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  )
}
