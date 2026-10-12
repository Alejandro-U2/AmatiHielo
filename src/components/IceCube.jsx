import iceCubeImage from '../assets/amati-ice-cube.png'
import './iceCube.css'

const SIZE_ALIASES = {
  small: 'avatar',
  regular: 'regular',
}

const STATE_ALIASES = {
  idle: 'normal',
  responded: 'responding',
}
const VALID_SIZES = new Set(['hero', 'avatar', 'floating', 'compact', 'regular'])
const VALID_STATES = new Set(['normal', 'processing', 'responding', 'error'])

/**
 * Reusable visual identity for the AMATI assistant.
 * `onHover` receives `(isHovered, event)`; `onAnimationComplete` fires after
 * the one-shot response animation. Supplying `onClick` makes it keyboard-focusable.
 */
export function IceCubeAssistant({
  size = 'avatar',
  state = 'normal',
  alt = 'Asistente AMATI',
  ariaLabel,
  onClick,
  onHover,
  onAnimationComplete,
  className = '',
  interactive = false,
}) {
  const requestedSize = String(size).toLowerCase()
  const requestedState = String(state).toLowerCase()
  const sizeAlias = SIZE_ALIASES[requestedSize] || requestedSize
  const stateAlias = STATE_ALIASES[requestedState] || requestedState
  const normalizedSize = VALID_SIZES.has(sizeAlias) ? sizeAlias : 'avatar'
  const normalizedState = VALID_STATES.has(stateAlias) ? stateAlias : 'normal'
  const accessibleLabel = ariaLabel || alt
  const isInteractive = Boolean(onClick || interactive)
  const classes = [
    'ice-cube',
    `ice-cube--${normalizedSize}`,
    `ice-cube--${normalizedState}`,
    isInteractive ? 'ice-cube--interactive' : '',
    className,
  ].filter(Boolean).join(' ')

  const handleAnimationEnd = (event) => {
    if (event.animationName === 'ice-character-response') {
      onAnimationComplete?.(event)
    }
  }

  const visual = (
    <span
      className={classes}
      role="img"
      aria-label={accessibleLabel}
      onMouseEnter={!isInteractive ? (event) => onHover?.(true, event) : undefined}
      onMouseLeave={!isInteractive ? (event) => onHover?.(false, event) : undefined}
      onAnimationEnd={handleAnimationEnd}
    >
      <img className="ice-cube__image" src={iceCubeImage} alt="" draggable="false" />
    </span>
  )

  if (!isInteractive) return visual

  return (
    <button
      type="button"
      onClick={onClick}
      className="ice-cube-button"
      aria-label={accessibleLabel}
      onMouseEnter={(event) => onHover?.(true, event)}
      onMouseLeave={(event) => onHover?.(false, event)}
    >
      <span className={classes} aria-hidden="true" onAnimationEnd={handleAnimationEnd}>
        <img className="ice-cube__image" src={iceCubeImage} alt="" draggable="false" />
      </span>
    </button>
  )
}

export { IceCubeAssistant as IceCube }
export default IceCubeAssistant
