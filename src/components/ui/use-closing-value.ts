import {useRef} from 'react';
// Keep dialog content stable until Radix finishes its exit animation.
export function useClosingValue<T>(value:T|null|undefined){const last=useRef(value);if(value!=null)last.current=value;return value??last.current;}
