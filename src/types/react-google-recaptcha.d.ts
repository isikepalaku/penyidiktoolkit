declare module 'react-google-recaptcha' {
  import React from 'react';

  export interface ReCAPTCHAProps {
    sitekey: string;
    onChange?: (token: string | null) => void;
    onExpired?: () => void;
    ref?: React.RefObject<ReCAPTCHA>;
  }

  export default class ReCAPTCHA extends React.Component<ReCAPTCHAProps> {
    reset(): void;
    execute(): Promise<string>;
    getValue(): string | null;
    getResponse(): string | null;
  }
}