import Content from "$lib/components/ui/select/select-content.svelte";
import Group from "$lib/components/ui/select/select-group.svelte";
import Item from "$lib/components/ui/select/select-item.svelte";
import Portal from "$lib/components/ui/select/select-portal.svelte";
import ScrollDownButton from "$lib/components/ui/select/select-scroll-down-button.svelte";
import ScrollUpButton from "$lib/components/ui/select/select-scroll-up-button.svelte";
import Trigger from "$lib/components/ui/select/select-trigger.svelte";
import Root from "$lib/components/ui/select/select.svelte";

export {
  Root,
  Group,
  Item,
  Content,
  Trigger,
  ScrollDownButton,
  ScrollUpButton,
  Portal,
  //
  Root as Select,
  Group as SelectGroup,
  Item as SelectItem,
  Content as SelectContent,
  Trigger as SelectTrigger,
  ScrollDownButton as SelectScrollDownButton,
  ScrollUpButton as SelectScrollUpButton,
  Portal as SelectPortal,
};
