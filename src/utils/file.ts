export const MAX_PDF_MB = 100;

export function isPdf(file: File) {
  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  );
}

export function validateFile(file: File) {
  const errors: string[] = [];
  if (!isPdf(file)) {
    errors.push(`${file.name}: not a PDF`);
    return { valid: false, errors: [errors[0]] };
  }
  const mb = file.size / (1024 * 1024);
  if (mb > MAX_PDF_MB) {
    errors.push(`${file.name}: exceeds ${MAX_PDF_MB}MB`);
    return { valid: [], errors: [errors[0]] };
  }
  return { valid: [file], errors: [] };
}
