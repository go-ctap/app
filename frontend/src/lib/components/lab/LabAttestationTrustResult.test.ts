import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

import {
  AttestationTrustAssessment,
  AttestationTrustIssueCode,
  AttestationTrustStatus,
  AuthenticatorStatus,
} from "../../../../bindings/github.com/go-ctap/mds/model";

import LabAttestationTrustResult from "./LabAttestationTrustResult.svelte";

describe("Lab attestation trust result", () => {
  it("renders MDS chain trust and raw authenticator status signals", () => {
    render(LabAttestationTrustResult, {
      state: {
        phase: "ready",
        verification: new AttestationTrustAssessment({
          status: AttestationTrustStatus.AttestationTrustStatusUntrusted,
          metadataFound: true,
          certificateChainTrusted: true,
          authenticatorStatuses: [AuthenticatorStatus.AuthenticatorStatusRevoked],
          issues: [AttestationTrustIssueCode.AttestationTrustIssueAuthenticatorRevoked],
        }),
      },
      onRetry: vi.fn(),
    });

    expect(screen.getByText("MDS attestation trust")).toBeInTheDocument();
    expect(screen.getByText("Untrusted")).toBeInTheDocument();
    expect(screen.getByText(AuthenticatorStatus.AuthenticatorStatusRevoked)).toBeInTheDocument();
    expect(screen.getByText(
      AttestationTrustIssueCode.AttestationTrustIssueAuthenticatorRevoked,
    )).toBeInTheDocument();
  });
});
