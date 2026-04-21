import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Rank } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRankFromPoints(points: number): Rank {
  if (points >= 4000) return 'legend';
  if (points >= 2000) return 'phoenix';
  if (points >= 1000) return 'dragon';
  if (points >= 500) return 'lion';
  if (points >= 250) return 'tiger';
  if (points >= 100) return 'eagle';
  return 'worm';
}
