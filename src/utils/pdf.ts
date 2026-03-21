import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch();
  }
  return browser;
}

export async function htmlToPdf(htmlPath: string, pdfPath: string): Promise<void> {
  const browserInstance = await getBrowser();
  const page: Page = await browserInstance.newPage();

  try {
    const fileUrl = 'file://' + path.resolve(htmlPath);
    await page.goto(fileUrl, { waitUntil: 'networkidle' });

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export async function generatePdfFromHtml(htmlContent: string, pdfPath: string): Promise<void> {
  const browserInstance = await getBrowser();
  const page: Page = await browserInstance.newPage();

  try {
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });
  } finally {
    await page.close();
  }
}
