// Turns PDF / OCR failures into a message that says what actually went wrong, instead of a
// blanket "file is broken" (which hid device-specific problems on phones and tablets).

/** Thrown when the OCR engine (tesseract) cannot start or run on this device. */
export class OcrError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'OcrError';
  }
}

function detail(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`.slice(0, 160);
  return String(err).slice(0, 160);
}

export function describePdfError(err: unknown): string {
  const name = err instanceof Error ? err.name : '';
  if (err instanceof OcrError) {
    return `Metin tanıma (OCR) bu cihazda çalıştırılamadı. Sayfayı yenileyip tekrar deneyin. (${detail(err.cause ?? err)})`;
  }
  if (name === 'PasswordException') return 'PDF parola korumalı. Parolasız bir kopyasını yükleyin.';
  if (name === 'InvalidPDFException') return 'Dosya geçerli bir PDF değil ya da bozuk.';
  if (name === 'MissingPDFException' || name === 'NotReadableError') {
    return 'Dosya okunamadı. iCloud/Drive’daki dosyalar için önce cihaza indirilmesini bekleyip tekrar seçin.';
  }
  return `PDF işlenirken bir hata oluştu. Sayfayı yenileyip tekrar deneyin. (${detail(err)})`;
}
