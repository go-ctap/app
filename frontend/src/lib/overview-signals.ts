import { Option } from "../../bindings/github.com/go-ctap/ctap/protocol";

import type { InspectOptions } from "./overview-dto-types.js";
import { m } from "./overview-i18n.js";
import type { OverviewContext, OverviewHeroSignal, OverviewHeroSignalGroup, OverviewHeroSignalId, OverviewRowStatus } from "./overview-types.js";

type SignalConfig = {
  title: string;
  tooltip: string;
  trueStatus: OverviewRowStatus;
  trueLabel: string;
  falseStatus: OverviewRowStatus;
  falseLabel: string;
  absentStatus: OverviewRowStatus;
  absentLabel: string;
  absentNote?: string;
};

type OverviewOptionKey = Option;
type OverviewOptionSignalId = Exclude<OverviewHeroSignalId, "pinUvAuthToken"> | "pinUvAuthToken";

const optionKey = {
  alwaysUv: Option.OptionAlwaysUv,
  authnrCfg: Option.OptionAuthenticatorConfig,
  clientPin: Option.OptionClientPIN,
  credMgmt: Option.OptionCredentialManagement,
  largeBlobs: Option.OptionLargeBlobs,
  pinUvAuthToken: Option.OptionPinUvAuthToken,
  rk: Option.OptionResidentKeys,
  setMinPINLength: Option.OptionSetMinPINLength,
  up: Option.OptionUserPresence,
  uv: Option.OptionUserVerification,
} as const satisfies Record<OverviewOptionSignalId, OverviewOptionKey>;

export function buildOverviewHeroSignalGroups(context: OverviewContext = {}): OverviewHeroSignalGroup[] {
  const options = context.info?.options;
  const optionsKnown = options !== undefined;

  return [
    {
      id: "authentication",
      title: m.overview_signal_group_authentication(),
      signals: [
        upSignal(options, optionsKnown),
        signal("clientPin", optionKey.clientPin, options, optionsKnown, {
          title: m.overview_signal_client_pin_title(),
          tooltip: m.overview_signal_client_pin_tooltip(),
          trueStatus: "configured",
          trueLabel: m.pin_set(),
          falseStatus: "not configured",
          falseLabel: m.pin_not_set(),
          absentStatus: "unsupported",
          absentLabel: m.status_unsupported(),
        }),
        signal("uv", optionKey.uv, options, optionsKnown, {
          title: m.overview_signal_uv_title(),
          tooltip: m.overview_signal_uv_tooltip(),
          trueStatus: "configured",
          trueLabel: m.status_configured(),
          falseStatus: "not configured",
          falseLabel: m.status_not_configured(),
          absentStatus: "unsupported",
          absentLabel: m.status_unsupported(),
        }),
        defaultFalseSignal("pinUvAuthToken", optionKey.pinUvAuthToken, options, optionsKnown, m.overview_signal_pin_uv_auth_token_title(), m.overview_signal_pin_uv_auth_token_tooltip()),
        defaultFalseSignal("alwaysUv", optionKey.alwaysUv, options, optionsKnown, m.overview_signal_always_uv_title(), m.overview_signal_always_uv_tooltip(), {
          trueStatus: "enabled",
          trueLabel: m.status_enabled(),
          falseStatus: "disabled",
          falseLabel: m.status_disabled(),
          absentStatus: "unsupported",
          absentLabel: m.status_unsupported(),
        }),
      ],
    },
    {
      id: "credentials-management",
      title: m.overview_signal_group_credentials_management(),
      signals: [
        defaultFalseSignal("rk", optionKey.rk, options, optionsKnown, m.overview_signal_rk_title(), m.overview_signal_rk_tooltip()),
        defaultFalseSignal("credMgmt", optionKey.credMgmt, options, optionsKnown, m.overview_signal_cred_mgmt_title(), m.overview_signal_cred_mgmt_tooltip()),
        defaultFalseSignal("largeBlobs", optionKey.largeBlobs, options, optionsKnown, m.overview_signal_large_blobs_title(), m.overview_signal_large_blobs_tooltip()),
        defaultFalseSignal("authnrCfg", optionKey.authnrCfg, options, optionsKnown, m.overview_signal_authnr_cfg_title(), m.overview_signal_authnr_cfg_tooltip()),
        defaultFalseSignal("setMinPINLength", optionKey.setMinPINLength, options, optionsKnown, m.overview_signal_set_min_pin_length_title(), m.overview_signal_set_min_pin_length_tooltip()),
      ],
    },
  ];
}

function upSignal(options: InspectOptions | undefined, optionsKnown: boolean): OverviewHeroSignal {
  return signal("up", optionKey.up, options, optionsKnown, {
    title: m.overview_signal_up_title(),
    tooltip: m.overview_signal_up_tooltip(),
    trueStatus: "supported",
    trueLabel: m.status_supported(),
    falseStatus: "unsupported",
    falseLabel: m.status_unsupported(),
    absentStatus: "supported",
    absentLabel: m.status_supported(),
    absentNote: "default true",
  });
}

function defaultFalseSignal(
  id: OverviewOptionSignalId,
  key: OverviewOptionKey,
  options: InspectOptions | undefined,
  optionsKnown: boolean,
  title: string,
  tooltip: string,
  overrides: Partial<Pick<SignalConfig, "trueStatus" | "trueLabel" | "falseStatus" | "falseLabel" | "absentStatus" | "absentLabel">> = {},
): OverviewHeroSignal {
  return signal(id, key, options, optionsKnown, {
    title,
    tooltip,
    trueStatus: overrides.trueStatus ?? "supported",
    trueLabel: overrides.trueLabel ?? m.status_supported(),
    falseStatus: overrides.falseStatus ?? "unsupported",
    falseLabel: overrides.falseLabel ?? m.status_unsupported(),
    absentStatus: overrides.absentStatus ?? overrides.falseStatus ?? "unsupported",
    absentLabel: overrides.absentLabel ?? overrides.falseLabel ?? m.status_unsupported(),
  });
}

function signal(id: OverviewOptionSignalId, key: OverviewOptionKey, options: InspectOptions | undefined, optionsKnown: boolean, config: SignalConfig): OverviewHeroSignal {
  const option = optionValue(options, key);
  const base = { id, flag: id, title: config.title, tooltip: config.tooltip };

  if (!optionsKnown) {
    return { ...base, value: m.not_reported(), status: "unknown", statusLabel: m.state_unknown() };
  }
  if (option === true) {
    return { ...base, value: "true", status: config.trueStatus, statusLabel: config.trueLabel };
  }
  if (option === false) {
    return { ...base, value: "false", status: config.falseStatus, statusLabel: config.falseLabel };
  }
  return {
    ...base,
    value: m.overview_signal_value_absent(),
    valueNote: config.absentNote,
    status: config.absentStatus,
    statusLabel: config.absentLabel,
  };
}

function optionValue(options: InspectOptions | undefined, key: OverviewOptionKey): boolean | undefined {
  if (!options || !Object.prototype.hasOwnProperty.call(options, key)) return undefined;
  const value = options[key];
  if (value === true) return true;
  if (value === false) return false;
  return undefined;
}
