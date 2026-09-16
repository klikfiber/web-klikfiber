declare module 'midtrans-client' {
  type Config = {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  };

  export class Snap {
    constructor(config: Config);
    createTransaction(parameters: Record<string, unknown>): Promise<{
      token: string;
      redirect_url: string;
    }>;
    transaction: {
      notification(payload: Record<string, unknown>): Promise<Record<string, any>>;
      status(orderId: string): Promise<Record<string, any>>;
    };
  }

  const client: { Snap: typeof Snap };
  export default client;
}
