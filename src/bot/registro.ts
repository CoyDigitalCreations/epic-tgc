import type { Bot } from './arena'
import { botBase } from './base'

/** Todos los bots que la arena sabe enfrentar, por nombre. */
export const BOTS: Record<string, Bot> = {
  'base-facil': botBase('facil'),
  'base-medio': botBase('medio'),
  'base-dificil': botBase('dificil'),
}
