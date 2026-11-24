/** Dialogue portraits already identify the speaker; do not read stage directions as speech. */
export function spokenDialogue(body: string): string {
  const quotes = [...body.matchAll(/[「“]([^」”]+)[」”]/g)].map(match => match[1]);
  return quotes.length ? quotes.join('\n') : body;
}
