let lifecycleEpoch = 0;
let overviewEpoch = 0;
let mdsEpoch = 0;
let passkeysEpoch = 0;

export function beginLifecycleEpoch() {
  lifecycleEpoch += 1;
  return lifecycleEpoch;
}

export function isCurrentLifecycleEpoch(epoch: number) {
  return epoch === lifecycleEpoch;
}

export function bumpOverviewEpoch() {
  overviewEpoch += 1;
}

export function bumpMDSEpoch() {
  mdsEpoch += 1;
}

export function bumpPasskeysEpoch() {
  passkeysEpoch += 1;
}

export function beginOverviewEpoch() {
  overviewEpoch += 1;
  return overviewEpoch;
}

export function isCurrentOverviewEpoch(epoch: number) {
  return epoch === overviewEpoch;
}

export function beginMDSEpoch() {
  mdsEpoch += 1;
  return mdsEpoch;
}

export function isCurrentMDSEpoch(epoch: number) {
  return epoch === mdsEpoch;
}

export function beginPasskeysEpoch() {
  passkeysEpoch += 1;
  return passkeysEpoch;
}

export function isCurrentPasskeysEpoch(epoch: number) {
  return epoch === passkeysEpoch;
}
