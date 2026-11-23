import { type FormEvent, useEffect, useId, useRef } from 'react';
import { ApiError } from '../api/client';
import { useSubmitEnquiry } from '../api/queries';
import type { FieldErrors } from '../api/types';

interface EnquiryFormProps {
  productId: string;
  productTitle: string;
}

function failureMessage(error: Error): string {
  if (error instanceof ApiError) {
    if (error.code === 'RATE_LIMITED') {
      return "You've sent a few enquiries recently. Please wait a little while and try again.";
    }
    if (error.code === 'VALIDATION_FAILED') return 'Please check the details below.';
  }
  return "Sorry, we couldn't send your enquiry just now. Please try again.";
}

export function EnquiryForm({ productId, productTitle }: EnquiryFormProps) {
  const enquiry = useSubmitEnquiry();
  const thankYouHeading = useRef<HTMLHeadingElement>(null);

  // Move focus to the confirmation so screen reader users hear it.
  useEffect(() => {
    if (enquiry.isSuccess) thankYouHeading.current?.focus();
  }, [enquiry.isSuccess]);

  if (enquiry.isSuccess) {
    return (
      <section className="enquiry enquiry--sent" aria-labelledby="enquiry-thanks">
        <h2 id="enquiry-thanks" ref={thankYouHeading} tabIndex={-1}>
          Thank you
        </h2>
        <p>
          We've received your enquiry about <strong>{productTitle}</strong> and our sales team will
          be in touch soon.
        </p>
        <p>
          Your reference is <strong>{enquiry.data.reference}</strong>.
        </p>
      </section>
    );
  }

  const fieldErrors: FieldErrors =
    enquiry.error instanceof ApiError ? enquiry.error.fieldErrors : {};

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? '').trim();

    enquiry.mutate({
      productId,
      name: value('name'),
      email: value('email'),
      phone: value('phone') || undefined,
      message: value('message') || undefined,
    });
  }

  return (
    <section className="enquiry" aria-labelledby="enquiry-heading">
      <h2 id="enquiry-heading">Enquire about this product</h2>
      <p className="enquiry__intro">Leave your details and our sales team will get back to you.</p>

      <form onSubmit={handleSubmit}>
        <Field
          name="name"
          label="Name"
          autoComplete="name"
          maxLength={100}
          required
          autoFocus
          errors={fieldErrors.name}
        />
        <Field
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          errors={fieldErrors.email}
        />
        <Field
          name="phone"
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          maxLength={30}
          errors={fieldErrors.phone}
        />
        <Field
          name="message"
          label="Message (optional)"
          multiline
          maxLength={2000}
          errors={fieldErrors.message}
        />

        {enquiry.isError && (
          <p role="alert" className="form-error">
            {failureMessage(enquiry.error)}
          </p>
        )}

        <button type="submit" className="button" disabled={enquiry.isPending}>
          {enquiry.isPending ? 'Sending…' : 'Send enquiry'}
        </button>
      </form>
    </section>
  );
}

interface FieldProps {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  maxLength: number;
  required?: boolean;
  autoFocus?: boolean;
  multiline?: boolean;
  errors?: string[];
}

function Field({ name, label, multiline, errors, ...inputProps }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const invalid = Boolean(errors?.length);
  const shared = {
    id,
    name,
    'aria-invalid': invalid || undefined,
    'aria-describedby': invalid ? errorId : undefined,
    ...inputProps,
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {multiline ? <textarea rows={4} {...shared} /> : <input {...shared} />}
      {invalid && (
        <p id={errorId} className="field__error">
          {errors?.join(' ')}
        </p>
      )}
    </div>
  );
}
