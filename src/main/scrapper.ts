// eslint-disable-next-line max-classes-per-file
import { Browser, Page } from 'puppeteer-core';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';

import { getEdgePath } from 'edge-paths';
import fs from 'fs';
import EventEmitter from 'events';
// eslint-disable-next-line camelcase
import { set_fs, utils, WorkBook, WorkSheet, writeFileXLSX } from 'xlsx';

puppeteer.use(StealthPlugin());
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: '2captcha',
      token: 'XXXXXXX', // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
    },
    visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
  }),
);
const EDGE_PATH = getEdgePath();

if (process.env.NODE_ENV === 'production') {
  set_fs(fs);
}

const BASE_URL = 'https://www.olx.ua/uk';
const CATALOG_URL = `${BASE_URL}/nedvizhimost/krivoyrog/`;

async function writeToLogFile(message: any) {
  try {
    const logFile = fs.openSync(
      `scraper_log_${new Date().toISOString().slice(0, 10)}.log`,
      'a+',
    );
    fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
    fs.closeSync(logFile);
  } catch (error) {
    writeToLogFile(error);
    console.error('Помилка запису в файл логів:', error);
  }
}

interface IProductData {
  // id: string | undefined;
  date: string;
  saleType: string;
  rooms: string;
  title: string;
  location: string;
  description: string;
  price: string;
  user?: string;
  phones: string | null;
  link: string;
  parameters: string;
}

writeToLogFile('Init');

class Product {
  // id: string | undefined;

  date: string;

  saleType: string;

  rooms: string;

  title: string;

  location: string;

  description: string;

  price: string;

  user?: string;

  phones: string | null = null;

  link: string;

  parameters: string;

  constructor({
    // id,
    date,
    saleType,
    rooms,
    title,
    location,
    description,
    price,
    user,
    phones,
    link,
    parameters,
  }: IProductData) {
    // this.id = id;
    this.date = date;
    this.title = title;
    this.location = location;
    this.date = date;
    this.saleType = saleType;
    this.rooms = rooms;
    this.title = title;
    this.location = location;
    this.description = description;
    this.price = price;
    this.user = user;
    this.phones = phones;
    this.link = link;
    this.parameters = parameters;
  }
}

class ProductDetailsScraper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async login(email: string, password: string): Promise<void> {
    try {
      console.log('Проводимо вхід...');
      await this.page.goto(`${BASE_URL}/account`);
      await this.page.focus('input[type=email]');
      await this.page.keyboard.type(email);
      await this.page.focus('input[type=password]');
      await this.page.keyboard.type(password);
      await this.page.click('button[type=submit]');
      await this.page.waitForNavigation({ waitUntil: 'load' });
      await this.page.waitForSelector(
        '[data-testid="topbar-dropdown-header"]',
        {
          timeout: 10000,
        },
      );
      console.log('Вхід виконано!');
    } catch (e) {
      await writeToLogFile(`Вхід не виконано: ${e}`);
      console.error(`Вхід не виконано: ${e}`);
    }
  }

  async extractProductData(link: string): Promise<Product | null> {
    const PRODUCT_DATA_SELECTORS = [
      '[data-cy="ad-footer-bar-section"]',
      '[data-cy="ad-posted-at"]',
      '[data-cy="ad_title"]',
      '[data-testid="aside"]',
      '[data-cy="ad-contact-phone"]',
    ];
    try {
      await this.page.goto(link, { timeout: 60000 });
    } catch (e) {
      console.error('cant open page:', link);
      return null;
    }

    try {
      await this.page.waitForSelector(PRODUCT_DATA_SELECTORS.join(', '));
    } catch (e) {
      writeToLogFile(e);
    }

    try {
      // const id = await this.page.$eval(
      //   '[data-cy="ad-footer-bar-section"] > span:first-child',
      //   (el) => el.textContent?.split(':')[1].trim(),
      // );
      const aside = await this.page.$('[data-testid="aside"]');
      if (!aside) {
        return null;
      }
      const mainBlock = await this.page.$('[data-testid="main"');
      const date = await aside.$eval(
        '[data-cy="ad-posted-at"]',
        (el) => el.textContent?.trim() || '',
      );

      // Extract product data using page selectors and methods
      const title = await aside.$eval(
        '[data-cy="ad_title"] h4',
        (el) => el.textContent?.trim() || '',
      );
      const location = await aside.$eval(
        '[data-testid="aside"] section p>span',
        (el) => el.textContent?.trim() || '',
      );
      const user = await mainBlock?.$eval(
        'h4',
        (el) => el.textContent?.trim() || '',
      );
      let phones: string | null = null;
      try {
        // await this.page.$eval(
        //   'button[data-cy="ad-contact-phone"]',
        //   async (e): Promise<any> => e.click(),
        // );
        await aside.waitForSelector('button[data-cy="ad-contact-phone"]');
        await this.page.click('button[data-cy="ad-contact-phone"]');

        // const { captchas, filtered, solutions, solved, error } =
        //   await this.page.solveRecaptchas();
        // console.log(captchas, filtered, solutions, solved, error);
        await aside.waitForSelector('[data-testid="contact-phone"]', {
          timeout: 20000,
        });
        phones = await aside.$eval(
          '[data-testid="contact-phone"]',
          (el) => el.textContent?.trim() || '',
        );
        console.log('phones');
        console.log(phones);
      } catch (e) {
        writeToLogFile(e);
        console.log('No phones found');
      }

      const price = await this.page.$eval(
        '[data-testid="ad-price-container"] h3',
        (el) => el.textContent?.trim() || '',
      );
      const parameters: string[] | undefined = await mainBlock?.$$eval(
        'ul> li',
        (list) =>
          list.map((i) => {
            return i.textContent?.trim() || '';
          }),
      );
      const breadcrumbs: string[] = await this.page?.$$eval(
        '[data-testid="breadcrumbs"]>li>a',
        (list) =>
          list.map((i) => {
            return i.textContent?.trim() || '';
          }),
      );

      const saleType = breadcrumbs[3];
      const rooms =
        parameters
          ?.find((param) => param.search('Количество комнат') >= 0)
          ?.split(':')[1]
          ?.trim() || '';

      // if (
      //   parameters?.includes('Приватна особа') ||
      //   parameters?.includes('Продажа квартир')
      // ) {
      //   saleType = 'Продажа квартир';
      // } else if (
      //   parameters?.includes('Бізнес') ||
      //   parameters?.includes('Продажа домов')
      // ) {
      //   saleType = 'Продажа домов';
      // } else if (
      //   parameters?.includes('Бізнес') ||
      //   parameters?.includes('Бизнес')
      // ) {
      //   saleType = 'Бізнес';
      // }

      const description = await this.page.$eval(
        '[data-cy="ad_description"] div',
        (el) => el?.textContent?.trim() || '',
      );

      return new Product({
        // id,
        date,
        saleType,
        rooms,
        title,
        location,
        description,
        user,
        phones,
        price,
        link,
        parameters: parameters?.toString() || '',
      });
    } catch (error) {
      console.error(`Error extracting product data for ${link}:`, error);
      return null;
    }
  }
}

class ProductCatalog extends EventEmitter {
  private readonly baseUrl: string;

  private readonly catalogUrl: string;

  private browser: Browser | null = null;

  private serialNumber: number = 0;

  public isRunning: boolean = false;

  private paginationPage: number = 1;

  private paginationCount?: number = 0;

  private productsOnPaginationPage: number = 52;

  private filename: string;

  private readonly workbook: WorkBook;

  private readonly worksheet: WorkSheet;

  constructor(baseUrl: string, catalogUrl: string) {
    super();
    this.baseUrl = baseUrl;
    this.catalogUrl = catalogUrl;
    this.filename = '';

    this.worksheet = utils.json_to_sheet([]);
    this.worksheet['!cols'] = [
      { width: 10 },
      { width: 15 },
      { width: 8 },
      { width: 25 },
      { width: 15 },
      { width: 50 },
      { width: 8 },
      { width: 12 },
      { width: 12 },
      { width: 10 },
      { width: 50 },
    ];

    const header = [
      // 'Id',
      'Дата',
      'Оренда/Продажа',
      'Кол-во комнат',
      'Заголовок',
      'Місцезнаходження',
      'Опис',
      'Цена',
      'Продавец',
      'Номер',
      'Посилання',
      'Інші',
    ];

    utils.sheet_add_aoa(this.worksheet, [header], { cellStyles: true });

    this.workbook = utils.book_new();
    utils.book_append_sheet(this.workbook, this.worksheet, 'Products');
  }

  async startScraper(
    { email, password }: { email?: string; password?: string },
    {
      isShowingBrowser,
    }: {
      isShowingBrowser: boolean;
    },
  ): Promise<void> {
    writeToLogFile('start');

    this.filename = `output_${new Date()
      .toLocaleString()
      .replace(' ', '')
      .replace(/[^\w\s]/g, '-')}.xlsx`;
    this.isRunning = true;

    // Start a headless browser or visible browser based on the flag
    this.browser = await puppeteer.launch({
      executablePath: EDGE_PATH,
      headless: !isShowingBrowser,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-autofill'],
    });

    const [page] = await this.browser.pages();
    await page.setViewport({ width: 1280, height: 640, deviceScaleFactor: 1 });

    await page.goto(this.baseUrl);
    const productScraper = new ProductDetailsScraper(page);

    if (email && password) {
      await productScraper.login(email, password);
    }

    await page.goto(`${this.catalogUrl}`);

    const pageElements = await page.$$('.pagination-item a');
    const lastElement = pageElements[pageElements.length - 1];
    const textContent = await lastElement.getProperty('textContent');
    const jsonValue = await textContent.jsonValue();
    this.paginationCount = parseInt(jsonValue || '1', 10);
    // this.paginationCount = 2;

    // Iterate through each page
    while (this.paginationPage <= this.paginationCount && this.isRunning) {
      // Navigate to the current page
      // eslint-disable-next-line no-await-in-loop
      await this.goToPagination(this.paginationPage, page);

      // Emit progress update (progress is already calculated)

      // Extract product links from the current page
      // eslint-disable-next-line no-await-in-loop
      const productPageLinks = await page.$$eval(
        '[data-cy="l-card"] > a',
        (elements) => elements.map((element) => element.href),
      );

      this.productsOnPaginationPage = productPageLinks.length;

      // Process a limited number of product links for demonstration (modify as needed)
      // eslint-disable-next-line no-await-in-loop
      await this.processProductLinks(productScraper, productPageLinks);

      this.paginationPage += 1;
      console.log(`Сторінка: ${this.paginationPage}`);
    }

    this.isRunning = false; // Mark scraping as finished

    // Close the browser
    await this.browser.close();

    await writeToLogFile('Кінець!');
    console.log('Кінець!');
  }

  async writeFile({
    // id,
    date,
    saleType,
    rooms,
    title,
    location,
    description,
    user,
    phones,
    price,
    link,
    parameters,
  }: IProductData) {
    const row = [
      // id,
      date,
      saleType,
      rooms,
      title,
      location,
      description,
      price,
      user,
      phones,
      link,
      parameters,
    ];
    const ws = this.workbook.Sheets.Products;
    utils.sheet_add_aoa(ws, [row], {
      origin: -1,
      cellStyles: true,
    });

    try {
      await writeFileXLSX(this.workbook, this.filename);
    } catch (e) {
      await writeToLogFile(`Write File error: ${e}`);
    }
    await writeToLogFile('File *.xlsx Updated!');
    console.log('File *.xlsx Updated!');
  }

  async processProductLinks(
    productScraper: ProductDetailsScraper,
    productPageLinks: string[],
  ): Promise<void> {
    const estimatedTotalProducts = this.paginationCount
      ? this.paginationCount * this.productsOnPaginationPage
      : 0; // Handle cases with unknown page count

    // eslint-disable-next-line no-restricted-syntax
    for (const [, link] of productPageLinks.entries()) {
      this.emit('scraper-progress', {
        progress: (this.serialNumber / estimatedTotalProducts) * 100, // Convert to percentage
        isRunning: this.isRunning,
      });

      try {
        const product: IProductData | null =
          // eslint-disable-next-line no-await-in-loop
          await productScraper.extractProductData(link);

        if (product) {
          this.serialNumber += 1;
          // eslint-disable-next-line no-await-in-loop
          await this.writeFile(product);
        }
      } catch (err) {
        // eslint-disable-next-line no-await-in-loop
        await writeToLogFile(`Помилка при обробці посилання ${link}: ${err}`);
        console.warn(`Помилка при обробці посилання ${link}:`, err);
      }
    }

    // Await all promises outside the loop
  }

  async stopScraper(): Promise<void> {
    this.isRunning = false;
    this.serialNumber = 0;
    await this.browser?.close();
    this.emit('scraper-end', {
      fileName: this.filename,
    });
  }

  private async goToPagination(pageNumber: number, page: Page) {
    const url = new URL(this.catalogUrl);
    const params = url.searchParams;
    params.set('page', String(pageNumber));
    url.search = params.toString();

    await page.goto(url.toString());
  }
}

const queryParams = new URLSearchParams({
  currency: 'UAH',
  'search[private_business]': 'private',
});

const fullUrl = new URL(CATALOG_URL);
fullUrl.search = queryParams.toString();

// Export the ProductCatalog instance
const productCatalogScraper = new ProductCatalog(BASE_URL, fullUrl.href);

productCatalogScraper.on('start-scrapper', async (credentials, options) => {
  try {
    await productCatalogScraper.startScraper(credentials, options);
  } catch (e) {
    await writeToLogFile(e);
  }
});

productCatalogScraper.on('stop-scrapper', async () => {
  await productCatalogScraper.stopScraper();
});

export default productCatalogScraper;
