/**
 * Handlers de reemplazos anti-destrucción (ADR-15).
 *
 * Registra efectos prevent_destroy que pueden ser activados por cartas
 * controladas por el jugador cuando CUALQUIER carta sería destruida.
 *
 * Ejemplo: Rowena FB-018 — "Cuando un Vínculo que controles fuera a ser
 * destruido, puedes enviar esta carta a tu exilio previniendo la destrucción
 * de ese vínculo."
 */
import { registrarReemplazoGlobal } from '../replacements'
import { esVinculo, getCardMeta } from '../cards'

/**
 * Registra todos los reemplazos anti-destrucción de cartas.
 * Llamado desde handlers/index.ts.
 */
export function registrarReemplazos(): void {
  // ─── FB-018: Rowena, Vínculo Eterno ──────────────────────────────
  // "Cuando un Vínculo que controles fuera a ser destruido puedes enviar
  // esta carta a tu exilio previniendo la destrucción de ese vínculo."
  registrarReemplazoGlobal({
    cardId: 'FB-018',
    trigger: 'cuando_vinculo_seria_destruido',
    efecto: 'prevent_destroy',
    check: (s, _inst, cardInstanceId, _causa) => {
      // Verificar que el objetivo sea un Vínculo
      const targetInst = s.instances[cardInstanceId]
      if (!targetInst) return false
      const targetMeta = targetInst.cardId ? getCardMeta(targetInst.cardId) : null
      if (!targetMeta || !esVinculo(targetMeta)) return false

      // Rowena ya está en campo (el caller ya verificó que existe)
      return true
    },
    handler: (s, _ctx, inst, _cardInstanceId, _causa) => {
      // Costo: exile_self → exiliar a Rowena
      const p = s.players[inst.owner as 'A' | 'B']
      const rowenaSlot = p.campo.campeones.indexOf(inst.cardInstanceId)
      if (rowenaSlot === -1) return false // Rowena ya no está en campo

      // Remover del campo y agregar al exilio
      p.campo.campeones[rowenaSlot] = null
      p.exilio.push(inst.cardInstanceId)

      // Prevenir la destrucción del Vínculo
      return true
    },
  })
}
