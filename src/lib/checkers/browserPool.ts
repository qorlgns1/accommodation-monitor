import type { Browser } from 'puppeteer';

import { getEnvNumber } from '@/lib/env';

import { createBrowser } from './browser';

type Waiter = {
  resolve: (browser: Browser) => void;
  reject: (error: Error) => void;
};

const POOL_SIZE = Math.max(1, getEnvNumber('BROWSER_POOL_SIZE', 2));

const state = {
  poolSize: POOL_SIZE,
  browsers: new Set<Browser>(),
  idle: [] as Browser[],
  waiters: [] as Waiter[],
  creating: 0,
  shuttingDown: false,
};

function isBrowserHealthy(browser: Browser): boolean {
  return browser.isConnected();
}

async function destroyBrowser(browser: Browser): Promise<void> {
  if (state.browsers.has(browser)) {
    state.browsers.delete(browser);
  }
  await browser.close().catch(() => {});
}

async function createAndRegisterBrowser(): Promise<Browser> {
  const browser = await createBrowser();
  state.browsers.add(browser);
  return browser;
}

async function fulfillWaiterIfNeeded(): Promise<void> {
  if (state.waiters.length === 0) return;
  if (state.browsers.size + state.creating >= state.poolSize) return;

  state.creating++;
  try {
    const browser = await createAndRegisterBrowser();
    const waiter = state.waiters.shift();
    if (waiter) {
      waiter.resolve(browser);
    } else {
      state.idle.push(browser);
    }
  } catch (error) {
    const waiter = state.waiters.shift();
    if (waiter) {
      waiter.reject(error as Error);
    }
  } finally {
    state.creating--;
  }
}

export async function acquireBrowser(): Promise<Browser> {
  if (state.shuttingDown) {
    throw new Error('Browser pool is shutting down');
  }

  while (state.idle.length > 0) {
    const browser = state.idle.pop();
    if (!browser) break;
    if (isBrowserHealthy(browser)) {
      return browser;
    }
    await destroyBrowser(browser);
  }

  if (state.browsers.size + state.creating < state.poolSize) {
    state.creating++;
    try {
      return await createAndRegisterBrowser();
    } finally {
      state.creating--;
    }
  }

  return new Promise((resolve, reject) => {
    state.waiters.push({ resolve, reject });
  });
}

export async function releaseBrowser(browser: Browser): Promise<void> {
  if (state.shuttingDown) {
    await destroyBrowser(browser);
    return;
  }

  if (!isBrowserHealthy(browser)) {
    await destroyBrowser(browser);
    await fulfillWaiterIfNeeded();
    return;
  }

  const waiter = state.waiters.shift();
  if (waiter) {
    waiter.resolve(browser);
    return;
  }

  state.idle.push(browser);
}

export async function closeBrowserPool(): Promise<void> {
  state.shuttingDown = true;

  const browsers = Array.from(state.browsers);
  state.browsers.clear();
  state.idle = [];

  while (state.waiters.length > 0) {
    const waiter = state.waiters.shift();
    if (waiter) {
      waiter.reject(new Error('Browser pool closed'));
    }
  }

  await Promise.all(browsers.map((browser) => browser.close().catch(() => {})));
}
