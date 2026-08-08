import {
  FactID,
  FactOrigin,
  FactState,
  FactUnit,
  FactValueKind,
  type Assessment,
  type Fact,
} from "../../bindings/github.com/telesma-app/kit/model/inspect";

import type { OverviewRowStatus } from "$lib/overview-types.js";

export type OverviewFactLookup = ReadonlyMap<FactID, Fact>;

export function buildOverviewFactLookup(assessment: Assessment): OverviewFactLookup {
  return new Map(assessment.facts.map((fact) => [fact.id, fact]));
}

export function overviewFact(facts: OverviewFactLookup, id: FactID): Fact {
  const fact = facts.get(id);

  if (!fact) throw new Error(`Missing required Overview fact: ${id}`);

  return fact;
}

export function overviewFactStatus(fact: Fact): OverviewRowStatus {
  switch (fact.state) {
    case FactState.FactStateObserved:
    case FactState.FactStateRequired:
    case FactState.FactStateNotRequired:
      return "informational";
    case FactState.FactStateUnknown:
      return "unknown";
    case FactState.FactStateSupported:
      return "supported";
    case FactState.FactStateUnsupported:
      return "unsupported";
    case FactState.FactStateConfigured:
      return "configured";
    case FactState.FactStateNotConfigured:
      return "not configured";
    case FactState.FactStateEnabled:
      return "enabled";
    case FactState.FactStateDisabled:
      return "disabled";
    case FactState.FactStateWarning:
      return "warning";
    default:
      throw new Error(`Unexpected Overview fact state: ${fact.state}`);
  }
}

export function factBoolean(fact: Fact): boolean | undefined {
  if (fact.value.kind !== FactValueKind.FactValueBoolean) {
    throw new Error(`Overview fact ${fact.id} is not boolean`);
  }

  return fact.value.boolean ?? undefined;
}

export function factInteger(fact: Fact): number | undefined {
  if (fact.value.kind !== FactValueKind.FactValueInteger) {
    throw new Error(`Overview fact ${fact.id} is not integer`);
  }

  return fact.value.integer ?? undefined;
}

export function factText(fact: Fact): string | undefined {
  if (fact.value.kind !== FactValueKind.FactValueText) {
    throw new Error(`Overview fact ${fact.id} is not text`);
  }

  return fact.value.text ?? undefined;
}

export function factList(fact: Fact): readonly string[] | undefined {
  if (fact.value.kind !== FactValueKind.FactValueList) {
    throw new Error(`Overview fact ${fact.id} is not list`);
  }

  return fact.value.list ?? undefined;
}

export function factUsesSpecDefault(fact: Fact) {
  return fact.origin === FactOrigin.FactOriginSpecDefault;
}

export function factUnit(fact: Fact): "bytes" | "codePoints" | "" {
  if (fact.value.unit === FactUnit.FactUnitBytes) return "bytes";

  if (fact.value.unit === FactUnit.FactUnitCodePoints) return "codePoints";

  return "";
}

export { FactID, FactOrigin, FactState };
