import {
  Flame,
  Snowflake,
  Wind,
  Utensils,
  Zap,
  BedDouble,
  Armchair,
} from "lucide-react";
import type { HubFunction, HubStatus } from "./types";

export const FUNCS: Record<
  HubFunction,
  { label: string; Icon: React.ElementType; color: string; note: string }
> = {
  warming: {
    label: "Warming center",
    Icon: Flame,
    color: "#D9702A",
    note: "Heat during winter outages",
  },
  cooling: {
    label: "Cooling center",
    Icon: Snowflake,
    color: "#2E7FB8",
    note: "Relief during heat waves",
  },
  cleanair: {
    label: "Clean-air shelter",
    Icon: Wind,
    color: "#1F9E94",
    note: "Filtered air on wildfire-smoke days",
  },
  food: {
    label: "Food & water",
    Icon: Utensils,
    color: "#4F8F3A",
    note: "Meals and drinking water",
  },
  charging: {
    label: "Charging station",
    Icon: Zap,
    color: "#C49A1F",
    note: "Power for phones & devices",
  },
  beds: {
    label: "Overnight beds",
    Icon: BedDouble,
    color: "#7E57C2",
    note: "Place to sleep",
  },
  rest: {
    label: "Rest & gathering",
    Icon: Armchair,
    color: "#6B756D",
    note: "A warm, safe place to sit",
  },
};

export const STATUS: Record<
  HubStatus,
  { label: string; color: string }
> = {
  open: { label: "Open", color: "#3C8A4C" },
  limited: { label: "Limited space", color: "#C08A1A" },
  full: { label: "At capacity", color: "#B8472E" },
  closed: { label: "Closed now", color: "#8A847A" },
};

export const PIN_PRIORITY: HubFunction[] = [
  "beds",
  "warming",
  "cooling",
  "cleanair",
  "food",
  "charging",
  "rest",
];

export function primaryFunc(functions: HubFunction[], primary?: HubFunction | null): HubFunction {
  if (primary && functions.includes(primary)) return primary;
  return PIN_PRIORITY.find((f) => functions.includes(f)) ?? functions[0] ?? "rest";
}
