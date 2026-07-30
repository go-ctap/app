import Content from "$lib/components/ui/tooltip/tooltip-content.svelte";
import Portal from "$lib/components/ui/tooltip/tooltip-portal.svelte";
import Provider from "$lib/components/ui/tooltip/tooltip-provider.svelte";
import Trigger from "$lib/components/ui/tooltip/tooltip-trigger.svelte";
import Root from "$lib/components/ui/tooltip/tooltip.svelte";

export {
  Root,
  Trigger,
  Content,
  Provider,
  Portal,
  //
  Root as Tooltip,
  Content as TooltipContent,
  Trigger as TooltipTrigger,
  Provider as TooltipProvider,
  Portal as TooltipPortal,
};
