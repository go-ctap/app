type FollowTailParameters = {
  enabled: boolean;
  version: number;
};

export function followLogTail(node: HTMLElement, parameters: FollowTailParameters) {
  function scroll(parameters: FollowTailParameters) {
    if (!parameters.enabled || parameters.version === 0) return;
    queueMicrotask(() => {
      const viewport = node.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    });
  }

  scroll(parameters);
  return {
    update(next: FollowTailParameters) {
      scroll(next);
    },
  };
}
