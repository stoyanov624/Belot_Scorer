import { Link, type LinkProps } from 'react-router';
import { preloadRoute } from './routes';

/** Link that starts loading a lazy screen on hover or focus (roadmap: preload on intent). */
export function PreloadLink({ onPointerEnter, onFocus, ...props }: LinkProps) {
  const path = typeof props.to === 'string' ? props.to : (props.to.pathname ?? '');
  return (
    <Link
      {...props}
      onPointerEnter={(event) => {
        preloadRoute(path);
        onPointerEnter?.(event);
      }}
      onFocus={(event) => {
        preloadRoute(path);
        onFocus?.(event);
      }}
    />
  );
}
