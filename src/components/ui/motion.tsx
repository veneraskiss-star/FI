import {useEffect,useContext,type PropsWithChildren} from 'react';
import {LayoutGroup,MotionConfig,MotionConfigContext,motion,useIsPresent,useReducedMotion,type Transition} from 'motion/react';

export const motionTokens={
 startup:{hold:780,exit:.22,reveal:.28},
 duration:{fast:.14,ui:.22,surface:.3,page:.18,exit:.07},
 ease:[.2,.75,.25,1] as const,
 spring:{type:'spring',stiffness:430,damping:38,mass:.8} satisfies Transition,
};
export const tween=(duration=motionTokens.duration.ui):Transition=>({duration,ease:[...motionTokens.ease]});
export function useMotionPreference(){const preference=useContext(MotionConfigContext).reducedMotion;const system=useReducedMotion();return preference==='always'||(preference!=='never'&&!!system);}
export function MotionProvider({children,reducedMotion='user'}:PropsWithChildren<{reducedMotion?:'user'|'always'|'never'}>){
 const system=useReducedMotion();const reduced=reducedMotion==='always'||(reducedMotion==='user'&&!!system);
 useEffect(()=>{document.documentElement.dataset.motionReduced=String(reduced);},[reduced]);
 useEffect(()=>{const root=document.documentElement;for(const key of ['fast','ui','surface'] as const)root.style.setProperty('--motion-'+key,motionTokens.duration[key]*1000+'ms');root.style.setProperty('--ease-standard',`cubic-bezier(${motionTokens.ease.join(',')})`);},[]);
 return <MotionConfig reducedMotion={reducedMotion} transition={tween()}><LayoutGroup id="fi-workspace">{children}</LayoutGroup></MotionConfig>;
}
export function ActiveNavIndicator(){const reduced=useMotionPreference();return <motion.span aria-hidden="true" className="nav-active-indicator" layoutId="active-section" initial={false} transition={reduced?{duration:0}:motionTokens.spring}/>;}
export function Workspace({children}:PropsWithChildren){const reduced=useMotionPreference();const present=useIsPresent();return <motion.main className="workspace-motion" inert={!present} aria-hidden={!present||undefined} initial={{opacity:reduced?1:.85,y:reduced?0:3}} animate={{opacity:1,y:0}} exit={{opacity:reduced?1:.85,y:0,transition:{duration:reduced?0:motionTokens.duration.exit}}} transition={reduced?{duration:0}:tween(motionTokens.duration.page)}>{children}</motion.main>;}

export function FilterChip({selected,group,children,...props}:PropsWithChildren<{selected:boolean;group:string}&import('react').ButtonHTMLAttributes<HTMLButtonElement>>){const reduced=useMotionPreference();return <button {...props} aria-pressed={selected} className={'chip motion-chip'+(selected?' selected':'')} >{selected&&<motion.span aria-hidden="true" className="chip-active-indicator" layoutId={'filter-'+group} initial={false} transition={reduced?{duration:0}:motionTokens.spring}/>} {children}</button>;}
export function TableRow({children,...props}:import('react').ComponentPropsWithoutRef<typeof motion.tr>){const reduced=useMotionPreference();return <motion.tr {...props} layout={reduced?false:'position'} initial={{opacity:reduced?1:.7}} animate={{opacity:1}} transition={reduced?{duration:0}:{layout:motionTokens.spring,opacity:tween(.14)}}>{children}</motion.tr>;}
