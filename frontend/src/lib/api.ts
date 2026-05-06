import { AuthenticatorService } from "../../bindings/changeme";

const service: any = AuthenticatorService;

export type Envelope = {
  operationId?: string;
  selectedDevice?: any;
  result?: any;
  error?: { category?: string; message: string; hint?: string };
};

export type Discovery = {
  devices: any[];
  selectedSelector?: string;
  selectedDevice?: any;
  error?: { category?: string; message: string; hint?: string };
};

export const api = {
  discover: (transport = "auto"): Promise<Discovery> => service.Discover({ transport }),
  select: (selector: string): Promise<Discovery> => service.Select(selector),
  cancelOperation: (operationId: string): Promise<boolean> => service.CancelOperation(operationId),
  resolveInteraction: (answer: any): Promise<boolean> => service.ResolveInteraction(answer),
  inspect: (selector: string): Promise<Envelope> => service.Inspect({ selector }),
  listCredentials: (selector: string): Promise<Envelope> => service.ListCredentials({ selector }),
  deleteCredential: (request: any): Promise<Envelope> => service.DeleteCredential(request),
  updateCredentialUser: (request: any): Promise<Envelope> => service.UpdateCredentialUser(request),
  listLargeBlobs: (selector: string): Promise<Envelope> => service.ListLargeBlobs({ selector }),
  readLargeBlob: (request: any): Promise<Envelope> => service.ReadLargeBlob(request),
  writeLargeBlob: (request: any): Promise<Envelope> => service.WriteLargeBlob(request),
  deleteLargeBlob: (request: any): Promise<Envelope> => service.DeleteLargeBlob(request),
  configStatus: (selector: string): Promise<Envelope> => service.ConfigStatus({ selector }),
  setPIN: (request: any): Promise<Envelope> => service.SetPIN(request),
  changePIN: (request: any): Promise<Envelope> => service.ChangePIN(request),
  setAlwaysUV: (request: any): Promise<Envelope> => service.SetAlwaysUV(request),
  setMinPINLength: (request: any): Promise<Envelope> => service.SetMinPINLength(request),
  bioSensorInfo: (selector: string): Promise<Envelope> => service.BioSensorInfo({ selector }),
  bioList: (selector: string): Promise<Envelope> => service.BioList({ selector }),
  bioEnroll: (request: any): Promise<Envelope> => service.BioEnroll(request),
  bioRename: (request: any): Promise<Envelope> => service.BioRename(request),
  bioRemove: (request: any): Promise<Envelope> => service.BioRemove(request),
  resetFactory: (request: any): Promise<Envelope> => service.ResetFactory(request),
  makeCredential: (request: any): Promise<Envelope> => service.MakeCredential(request),
  getAssertion: (request: any): Promise<Envelope> => service.GetAssertion(request),
};

export function bytesFromText(value: string): number[] {
  return Array.from(new TextEncoder().encode(value));
}

export function bytesFromJSON(value: unknown): number[] {
  return bytesFromText(JSON.stringify(value));
}

export function parseHexLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((credentialIDHex) => ({ type: "public-key", credentialIDHex }));
}

export function operationFailed(envelope: Envelope | undefined | null): string | null {
  if (!envelope?.error) return null;
  return envelope.error.hint ? `${envelope.error.message} ${envelope.error.hint}` : envelope.error.message;
}
