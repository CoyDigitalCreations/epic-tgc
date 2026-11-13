/**
 * Filtros SVG compartidos por el arte dibujado en código. Los tres filtros de iluminación (`metal`, `esmalte`, `piedra`)
 * levantan relieve a partir de la forma (desenfoque del alfa) más un ruido, y lo iluminan con una luz que viene de arriba
 * a la izquierda (`feDiffuseLighting` para el volumen, `feSpecularLighting` para el brillo): así un degradado liso pasa a
 * verse como metal martillado, esmalte abombado o piedra. Cada uso recibe un prefijo único para que los ids no choquen.
 */
export function FiltrosMetal({ p }: { p: string }) {
  return (
    <>
      <filter id={`${p}-grano`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 -0.12" />
      </filter>
      <filter id={`${p}-manchas`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves="4" seed="9" />
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.4 0 0 0 -0.45" />
      </filter>
      <filter id={`${p}-brillo`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3.5" />
      </filter>
      <filter id={`${p}-brillo-fino`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.2" />
      </filter>

      {/* Metal biselado y martillado (bordes, marcos, aros) */}
      <filter id={`${p}-metal`} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="7" result="rn" />
        <feColorMatrix in="rn" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" result="ruido" />
        <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="b1" />
        <feComposite in="b1" in2="ruido" operator="arithmetic" k1="0" k2="1" k3="0.35" k4="0" result="alto" />
        <feDiffuseLighting in="alto" surfaceScale="5" diffuseConstant="1.05" lightingColor="#ffffff" result="dif">
          <feDistantLight azimuth="235" elevation="52" />
        </feDiffuseLighting>
        <feSpecularLighting in="alto" surfaceScale="5" specularConstant="1.25" specularExponent="26" lightingColor="#fff6e8" result="esp">
          <feDistantLight azimuth="235" elevation="48" />
        </feSpecularLighting>
        <feComposite in="SourceGraphic" in2="dif" operator="arithmetic" k1="1.15" k2="0" k3="0" k4="0" result="mult" />
        <feComposite in="mult" in2="esp" operator="arithmetic" k1="0" k2="1" k3="0.85" k4="0" result="suma" />
        <feComposite in="suma" in2="SourceAlpha" operator="in" />
      </filter>

      {/* Esmalte y cristal abombados: relieve suave y brillo contenido */}
      <filter id={`${p}-esmalte`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.7 0.9" numOctaves="3" seed="12" result="rn" />
        <feColorMatrix in="rn" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 -0.1" result="ruido" />
        <feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="b1" />
        <feComposite in="b1" in2="ruido" operator="arithmetic" k1="0" k2="1" k3="0.05" k4="0" result="alto" />
        <feDiffuseLighting in="alto" surfaceScale="5" diffuseConstant="1" lightingColor="#ffffff" result="dif">
          <feDistantLight azimuth="235" elevation="58" />
        </feDiffuseLighting>
        <feSpecularLighting in="alto" surfaceScale="5" specularConstant="0.4" specularExponent="20" lightingColor="#ffffff" result="esp">
          <feDistantLight azimuth="235" elevation="50" />
        </feSpecularLighting>
        <feComposite in="SourceGraphic" in2="dif" operator="arithmetic" k1="1.1" k2="0" k3="0" k4="0" result="mult" />
        <feComposite in="mult" in2="esp" operator="arithmetic" k1="0" k2="1" k3="0.45" k4="0" result="suma" />
        <feComposite in="suma" in2="SourceAlpha" operator="in" />
      </filter>

      {/* Piedra y bronce mates, con martillado grueso (placas, franjas) */}
      <filter id={`${p}-piedra`} x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.12 0.2" numOctaves="4" seed="21" result="rn" />
        <feColorMatrix in="rn" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 -0.1" result="ruido" />
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="b1" />
        <feComposite in="b1" in2="ruido" operator="arithmetic" k1="0" k2="1" k3="0.55" k4="0" result="alto" />
        <feDiffuseLighting in="alto" surfaceScale="4" diffuseConstant="1.1" lightingColor="#ffffff" result="dif">
          <feDistantLight azimuth="235" elevation="55" />
        </feDiffuseLighting>
        <feSpecularLighting in="alto" surfaceScale="4" specularConstant="0.5" specularExponent="12" lightingColor="#ffe9c9" result="esp">
          <feDistantLight azimuth="235" elevation="45" />
        </feSpecularLighting>
        <feComposite in="SourceGraphic" in2="dif" operator="arithmetic" k1="1.2" k2="0" k3="0" k4="0" result="mult" />
        <feComposite in="mult" in2="esp" operator="arithmetic" k1="0" k2="1" k3="0.5" k4="0" result="suma" />
        <feComposite in="suma" in2="SourceAlpha" operator="in" />
      </filter>
    </>
  )
}
