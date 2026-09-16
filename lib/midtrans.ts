import 'server-only';
import midtransClient from 'midtrans-client';

export class MidtransConfigurationError extends Error {
  code = 'MIDTRANS_CONFIGURATION_ERROR';
}

export function midtransConfig() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  if (!serverKey || !clientKey)
    throw new MidtransConfigurationError('Midtrans belum dikonfigurasi.');
  return {
    serverKey,
    clientKey,
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  };
}

export function midtransSnap() {
  return new midtransClient.Snap(midtransConfig());
}

export function publicMidtransConfig() {
  const config = midtransConfig();
  return {
    clientKey: config.clientKey,
    isProduction: config.isProduction,
    scriptUrl: config.isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js',
  };
}
