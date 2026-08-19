import { describe, expect, it } from 'vitest'

import type { AppError } from '../lib/app-error.js'
import { PdfJsTextExtractor } from './pdf-text-extractor.js'

function createSyntheticPdf(text: string): Uint8Array {
  const escapedText = text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
  const stream = `BT /F1 12 Tf 72 720 Td (${escapedText}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let document = '%PDF-1.4\n'
  const offsets: number[] = [0]

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(document, 'ascii'))
    document += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(document, 'ascii')
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  document += offsets
    .slice(1)
    .map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`)
    .join('')
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new TextEncoder().encode(document)
}

describe('PDF.js text extraction', () => {
  const extractor = new PdfJsTextExtractor()

  it('extracts selectable text from a synthetic PDF in process', async () => {
    const text =
      'Synthetic Candidate builds reliable TypeScript services and documents measurable outcomes for every project.'

    await expect(extractor.extract(createSyntheticPdf(text))).resolves.toContain(
      'Synthetic Candidate',
    )
  })

  it('returns a safe extraction error for malformed content', async () => {
    await expect(extractor.extract(new TextEncoder().encode('%PDF-not-valid'))).rejects.toEqual(
      expect.objectContaining<Partial<AppError>>({
        code: 'PDF_EXTRACTION_FAILED',
        statusCode: 422,
      }),
    )
  })
})
