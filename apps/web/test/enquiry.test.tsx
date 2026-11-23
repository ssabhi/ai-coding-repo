import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { categories, products } from './fixtures';
import { mockApi, type Routes } from './mockApi';
import { renderApp } from './renderApp';

const productRoutes: Routes = {
  'GET /api/categories': { body: { categories } },
  'GET /api/products/1': { body: { product: products.monitor } },
};

async function openEnquiryForm(user: UserEvent) {
  await user.click(await screen.findByRole('button', { name: 'Enquire' }));
}

async function fillInContactDetails(user: UserEvent) {
  await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada Lovelace');
  await user.type(screen.getByRole('textbox', { name: 'Email' }), 'ada@example.com');
  await user.type(screen.getByRole('textbox', { name: 'Message (optional)' }), 'Is it curved?');
}

describe('Enquiry', () => {
  it('GIVEN I am viewing a product WHEN I submit the enquiry form THEN it is sent and I am thanked', async () => {
    const calls = mockApi({
      ...productRoutes,
      'POST /api/enquiries': { status: 201, body: { reference: 'ENQ-1234ABCD' } },
    });
    const { user } = renderApp('/products/1');

    await openEnquiryForm(user);
    await fillInContactDetails(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    const thanks = await screen.findByRole('heading', { name: 'Thank you' });
    expect(thanks).toHaveFocus();
    expect(screen.getByText('ENQ-1234ABCD')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send enquiry' })).not.toBeInTheDocument();

    expect(calls.find((call) => call.method === 'POST')).toEqual({
      method: 'POST',
      path: '/api/enquiries',
      body: {
        productId: '1',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        message: 'Is it curved?',
      },
    });
  });

  it('shows the server’s field errors next to the fields', async () => {
    mockApi({
      ...productRoutes,
      'POST /api/enquiries': {
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'The request is invalid',
            details: { email: ['Please enter a valid email address'] },
          },
        },
      },
    });
    const { user } = renderApp('/products/1');

    await openEnquiryForm(user);
    await fillInContactDetails(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    const email = screen.getByRole('textbox', { name: 'Email' });
    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Please enter a valid email address');
    expect(screen.queryByRole('heading', { name: 'Thank you' })).not.toBeInTheDocument();
  });

  it('does not thank the customer when the email could not be sent, and keeps what they typed', async () => {
    mockApi({
      ...productRoutes,
      'POST /api/enquiries': {
        status: 502,
        body: { error: { code: 'EMAIL_DELIVERY_FAILED', message: 'Could not send' } },
      },
    });
    const { user } = renderApp('/products/1');

    await openEnquiryForm(user);
    await fillInContactDetails(user);
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Sorry, we couldn't send your enquiry just now. Please try again.",
    );
    expect(screen.queryByRole('heading', { name: 'Thank you' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ada Lovelace');
  });
});
