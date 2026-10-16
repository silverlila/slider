import { highlight, type LanguageName } from 'sugar-high'

export interface Snippet {
  file: string
  source: string
}

const LANGUAGES: Record<string, LanguageName> = {
  tsx: 'javascript',
  ts: 'typescript',
  css: 'css',
  html: 'html',
}

function language(file: string): LanguageName {
  const extension = file.slice(file.lastIndexOf('.') + 1)
  const name = LANGUAGES[extension]
  if (name === undefined) throw new Error(`No highlighting language for ${file}`)
  return name
}

export function CodeBlock({ file, source }: Snippet) {
  return (
    <figure className="code">
      <figcaption className="code-file">{file}</figcaption>
      <pre>
        <code
          dangerouslySetInnerHTML={{ __html: highlight(source.trim(), { lang: language(file) }) }}
        />
      </pre>
    </figure>
  )
}
