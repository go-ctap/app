import { FactID, FactOrigin, FactState } from "../../bindings/github.com/go-ctap/kit/model/inspect";

import {
  factBoolean,
  overviewFact,
  overviewFactStatus,
  type OverviewFactLookup,
} from "./overview-facts.js";
import { m, overviewStatusLabel } from "./overview-i18n.js";
import type {
  OverviewHeroSignal,
  OverviewHeroSignalGroup,
  OverviewHeroSignalId,
} from "./overview-types.js";

type SignalConfig = {
  id: OverviewHeroSignalId;
  factID: FactID;
  title: string;
  tooltip: string;
  defaultNote?: string;
};

export function buildOverviewHeroSignalGroups(facts: OverviewFactLookup): OverviewHeroSignalGroup[] {
  return [
    {
      id: "authentication",
      title: m.overview_signal_group_authentication(),
      signals: [
        buildSignal(facts, {
          id: "up",
          factID: FactID.FactIDUserPresence,
          title: m.overview_signal_up_title(),
          tooltip: m.overview_signal_up_tooltip(),
          defaultNote: "default true",
        }),
        buildSignal(facts, {
          id: "clientPin",
          factID: FactID.FactIDClientPIN,
          title: m.overview_signal_client_pin_title(),
          tooltip: m.overview_signal_client_pin_tooltip(),
        }),
        buildSignal(facts, {
          id: "uv",
          factID: FactID.FactIDUserVerification,
          title: m.overview_signal_uv_title(),
          tooltip: m.overview_signal_uv_tooltip(),
        }),
        buildSignal(facts, {
          id: "pinUvAuthToken",
          factID: FactID.FactIDPinUvAuthToken,
          title: m.overview_signal_pin_uv_auth_token_title(),
          tooltip: m.overview_signal_pin_uv_auth_token_tooltip(),
        }),
        buildSignal(facts, {
          id: "alwaysUv",
          factID: FactID.FactIDAlwaysUV,
          title: m.overview_signal_always_uv_title(),
          tooltip: m.overview_signal_always_uv_tooltip(),
        }),
      ],
    },
    {
      id: "credentials-management",
      title: m.overview_signal_group_credentials_management(),
      signals: [
        buildSignal(facts, {
          id: "rk",
          factID: FactID.FactIDResidentCredentials,
          title: m.overview_signal_rk_title(),
          tooltip: m.overview_signal_rk_tooltip(),
        }),
        buildSignal(facts, {
          id: "credMgmt",
          factID: FactID.FactIDCredentialManagement,
          title: m.overview_signal_cred_mgmt_title(),
          tooltip: m.overview_signal_cred_mgmt_tooltip(),
        }),
        buildSignal(facts, {
          id: "largeBlobs",
          factID: FactID.FactIDLargeBlobs,
          title: m.overview_signal_large_blobs_title(),
          tooltip: m.overview_signal_large_blobs_tooltip(),
        }),
        buildSignal(facts, {
          id: "authnrCfg",
          factID: FactID.FactIDAuthenticatorConfig,
          title: m.overview_signal_authnr_cfg_title(),
          tooltip: m.overview_signal_authnr_cfg_tooltip(),
        }),
        buildSignal(facts, {
          id: "setMinPINLength",
          factID: FactID.FactIDSetMinPINLength,
          title: m.overview_signal_set_min_pin_length_title(),
          tooltip: m.overview_signal_set_min_pin_length_tooltip(),
        }),
      ],
    },
  ];
}

function buildSignal(facts: OverviewFactLookup, config: SignalConfig): OverviewHeroSignal {
  const fact = overviewFact(facts, config.factID);
  const status = overviewFactStatus(fact);
  const base = {
    id: config.id,
    flag: config.id,
    title: config.title,
    tooltip: config.tooltip,
    status,
    statusLabel: overviewStatusLabel(status),
  };

  if (fact.state === FactState.FactStateUnknown) {
    return { ...base, value: m.not_reported() };
  }

  if (fact.origin === FactOrigin.FactOriginSpecDefault) {
    return {
      ...base,
      value: m.overview_signal_value_absent(),
      valueNote: config.defaultNote,
    };
  }

  return { ...base, value: String(factBoolean(fact)) };
}
