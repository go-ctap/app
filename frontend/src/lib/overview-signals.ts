import { m, value } from "./overview-i18n.js";
import type { OverviewContext, OverviewHeroSignal, OverviewHeroSignalGroup, OverviewHeroSignalId, OverviewRowStatus } from "./overview-types.js";
import { boolOption, hasOwn, objectValue } from "./overview-utils.js";

type SignalConfig = {
  title: string;
  tooltip: string;
  trueStatus: OverviewRowStatus;
  trueLabel: string;
  falseStatus: OverviewRowStatus;
  falseLabel: string;
  absentStatus: OverviewRowStatus;
  absentLabel: string;
  absentValue?: string;
};

export function buildOverviewHeroSignalGroups(context: OverviewContext = {}): OverviewHeroSignalGroup[] {
  const info = objectValue(context.info);
  const options = objectValue(info.options);
  const optionsKnown = hasOwn(info, "options");

  return [
    {
      id: "authentication",
      title: m.overview_signal_group_authentication(),
      signals: [
        upSignal(options, optionsKnown),
        signal("clientPin", options, optionsKnown, {
          title: m.overview_signal_client_pin_title(),
          tooltip: m.overview_signal_client_pin_tooltip(),
          trueStatus: "configured",
          trueLabel: m.pin_set(),
          falseStatus: "not configured",
          falseLabel: m.pin_not_set(),
          absentStatus: "unsupported",
          absentLabel: m.status_unsupported(),
        }),
        signal("uv", options, optionsKnown, {
          title: m.overview_signal_uv_title(),
          tooltip: m.overview_signal_uv_tooltip(),
          trueStatus: "configured",
          trueLabel: m.status_configured(),
          falseStatus: "not configured",
          falseLabel: m.status_not_configured(),
          absentStatus: "unsupported",
          absentLabel: m.status_unsupported(),
        }),
        defaultFalseSignal("pinUvAuthToken", options, optionsKnown, m.overview_signal_pin_uv_auth_token_title(), m.overview_signal_pin_uv_auth_token_tooltip()),
        signal("alwaysUv", options, optionsKnown, {
          title: m.overview_signal_always_uv_title(),
          tooltip: m.overview_signal_always_uv_tooltip(),
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
        defaultFalseSignal("rk", options, optionsKnown, m.overview_signal_rk_title(), m.overview_signal_rk_tooltip()),
        defaultFalseSignal("credMgmt", options, optionsKnown, m.overview_signal_cred_mgmt_title(), m.overview_signal_cred_mgmt_tooltip()),
        defaultFalseSignal("largeBlobs", options, optionsKnown, m.overview_signal_large_blobs_title(), m.overview_signal_large_blobs_tooltip()),
        defaultFalseSignal("authnrCfg", options, optionsKnown, m.overview_signal_authnr_cfg_title(), m.overview_signal_authnr_cfg_tooltip()),
        defaultFalseSignal("setMinPINLength", options, optionsKnown, m.overview_signal_set_min_pin_length_title(), m.overview_signal_set_min_pin_length_tooltip()),
      ],
    },
  ];
}

function upSignal(options: Record<string, unknown>, optionsKnown: boolean): OverviewHeroSignal {
  return signal("up", options, optionsKnown, {
    title: m.overview_signal_up_title(),
    tooltip: m.overview_signal_up_tooltip(),
    trueStatus: "supported",
    trueLabel: m.status_supported(),
    falseStatus: "unsupported",
    falseLabel: m.status_unsupported(),
    absentStatus: "supported",
    absentLabel: m.status_supported(),
    absentValue: value.defaultTrue(),
  });
}

function defaultFalseSignal(id: OverviewHeroSignalId, options: Record<string, unknown>, optionsKnown: boolean, title: string, tooltip: string): OverviewHeroSignal {
  return signal(id, options, optionsKnown, {
    title,
    tooltip,
    trueStatus: "supported",
    trueLabel: m.status_supported(),
    falseStatus: "unsupported",
    falseLabel: m.status_unsupported(),
    absentStatus: "unsupported",
    absentLabel: m.status_unsupported(),
    absentValue: value.defaultFalse(),
  });
}

function signal(id: OverviewHeroSignalId, options: Record<string, unknown>, optionsKnown: boolean, config: SignalConfig): OverviewHeroSignal {
  const option = boolOption(options, id);
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
  return { ...base, value: config.absentValue ?? value.absent(), status: config.absentStatus, statusLabel: config.absentLabel };
}
