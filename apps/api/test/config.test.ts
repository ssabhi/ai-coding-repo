import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('provides working defaults so the API starts with no configuration', () => {
    const config = loadConfig({});

    expect(config.port).toBe(4000);
    expect(config.catalogue.source).toBe('fakestore');
    // No silent fallback unless asked for: an outage should be visible.
    expect(config.catalogue.fakeStore.fallback).toBe('none');
    expect(config.catalogue.topRatedIds).toEqual(['1', '5', '11', '17', '19']);
    expect(config.email.transport).toBe('console');
  });

  it('reads the chosen top rated products from a comma-separated list', () => {
    const config = loadConfig({ TOP_RATED_PRODUCT_IDS: ' 3, 7 ,, 9 ' });
    expect(config.catalogue.topRatedIds).toEqual(['3', '7', '9']);
  });

  it('treats blank variables as unset', () => {
    const config = loadConfig({ PORT: '', SMTP_USER: '' });
    expect(config.port).toBe(4000);
    expect(config.email.smtp.user).toBeUndefined();
  });

  it('normalises base URLs so they can be joined with paths', () => {
    const config = loadConfig({ PUBLIC_WEB_URL: 'http://localhost:8080/' });
    expect(config.enquiries.publicWebUrl).toBe('http://localhost:8080');
  });

  it('fails fast, naming every invalid variable', () => {
    expect(() =>
      loadConfig({ PRODUCT_SOURCE: 'database', ENQUIRY_TO_EMAIL: 'not-an-email' }),
    ).toThrow(/PRODUCT_SOURCE[\s\S]*ENQUIRY_TO_EMAIL/);
  });
});
