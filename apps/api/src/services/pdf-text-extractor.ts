import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

import { AppError } from '../lib/app-error.js'

const maximumPageCount = 20
const maximumCharacterCount = 40_000
const minimumCharacterCount = 80
const extractionTimeoutMs = 10_000

export interface PdfTextExtractor {
  extract(contents: Uint8Array): Promise<string>
}

function timeoutAfter(milliseconds: number): Promise<never> {
  return new Promise((_, reject) => {
    const timeout = setTimeout(() => {
      reject(new AppError(422, 'PDF_EXTRACTION_FAILED', 'The PDF could not be read.'))
    }, milliseconds)
    timeout.unref()
  })
}

function normalizeExtractedText(value: string): string {
  return value
    .replaceAll('\u0000', '')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export class PdfJsTextExtractor implements PdfTextExtractor {
  async extract(contents: Uint8Array): Promise<string> {
    const loadingTask = getDocument({
      data: contents.slice(),
      disableFontFace: true,
      enableXfa: false,
      stopAtErrors: true,
      useSystemFonts: false,
      useWasm: false,
      verbosity: 0,
    })

    try {
      const extracted = await Promise.race([
        (async () => {
          const document = await loadingTask.promise

          if (document.numPages > maximumPageCount) {
            throw new AppError(
              422,
              'UNSUPPORTED_PDF',
              `PDFs may contain at most ${maximumPageCount} pages.`,
            )
          }

          let text = ''
          for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
            const page = await document.getPage(pageNumber)
            const content = await page.getTextContent()
            const pageText = content.items
              .filter((item) => 'str' in item)
              .map((item) => `${item.str}${item.hasEOL ? '\n' : ' '}`)
              .join('')

            text += `${pageText}\n`
            if (text.length > maximumCharacterCount) {
              text = text.slice(0, maximumCharacterCount)
              break
            }
          }

          return normalizeExtractedText(text)
        })(),
        timeoutAfter(extractionTimeoutMs),
      ])

      if (extracted.length < minimumCharacterCount) {
        throw new AppError(
          422,
          'EMPTY_PDF',
          'The PDF does not contain enough selectable text to analyze.',
        )
      }

      return extracted
    } catch (error: unknown) {
      if (error instanceof AppError) throw error
      throw new AppError(422, 'PDF_EXTRACTION_FAILED', 'The PDF could not be read.')
    } finally {
      await loadingTask.destroy()
    }
  }
}
