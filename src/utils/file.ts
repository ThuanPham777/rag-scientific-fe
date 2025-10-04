export const MAX_PDF_MB = 100;

export function isPdf(file: File) {
  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  );
}

export function validateFiles(files: File[]) {
  const errors: string[] = [];
  const valid: File[] = [];
  for (const f of files) {
    if (!isPdf(f)) {
      errors.push(`${f.name}: not a PDF`);
      continue;
    }
    const mb = f.size / (1024 * 1024);
    if (mb > MAX_PDF_MB) {
      errors.push(`${f.name}: exceeds ${MAX_PDF_MB}MB`);
      continue;
    }
    valid.push(f);
  }
  return { valid, errors };
}
