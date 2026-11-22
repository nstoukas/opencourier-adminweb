import React from 'react'

// A placeholder value that no real sentence contains, put where an element (a link) goes.
export const NODE_MARK = '\u0000node\u0000'

/**
 * A translated sentence with a React element in it, such as "Offered together with <link>." The
 * sentence is looked up with NODE_MARK as the value of its placeholder (`t(key, { partner: NODE_MARK })`),
 * so each language puts the link where its own word order needs it; this splits the words at the mark
 * and puts the element there. A sentence with no mark is shown as it is.
 */
export function withNode(sentence: string, node: React.ReactNode): React.ReactNode {
  const [before, ...rest] = sentence.split(NODE_MARK)
  if (rest.length === 0) return sentence
  return (
    <>
      {before}
      {node}
      {rest.join('')}
    </>
  )
}
