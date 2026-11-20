export function wrapCjkText(value: string, maxCharacters: number): string {
  return value.split('\n').map((paragraph) => {
    const lines: string[] = [];
    let line = '';
    let count = 0;
    for (const character of paragraph) {
      if (count >= maxCharacters) {
        lines.push(line);
        line = '';
        count = 0;
      }
      line += character;
      count += 1;
    }
    lines.push(line);
    return lines.join('\n');
  }).join('\n');
}
