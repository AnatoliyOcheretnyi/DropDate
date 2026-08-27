import type { Suggestion } from "./release";
import type { ListType } from "../types/releases";

/**
 * Drops titles the user already has in any of their lists.
 *
 * Discovery blocks exist to show something new: a title already sitting in
 * "Хочу подивитись" or "Переглянуто" takes a slot without adding a choice.
 * `follow` counts too — it is still a list the user put the title in.
 */
export function excludeSaved(
  items: Suggestion[],
  getListTypes: (suggestion: Suggestion) => ListType[]
): Suggestion[] {
  return items.filter((item) => getListTypes(item).length === 0);
}
