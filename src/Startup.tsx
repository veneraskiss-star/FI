import {useEffect,useState,type PropsWithChildren} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {motionTokens,tween,useMotionPreference} from './components/ui/motion';
import brandIcon from '../assets/fi-water-mark.png';

// The workspace loads behind the intro; startup never waits for network or data.
export function Startup({children}:PropsWithChildren){
 const reduced=useMotionPreference();const [visible,setVisible]=useState(true);const [loaded,setLoaded]=useState(false);
 useEffect(()=>{const timer=setTimeout(()=>setVisible(false),reduced?0:motionTokens.startup.hold);return()=>clearTimeout(timer);},[reduced]);
 return <><motion.div className="startup-workspace" inert={visible} aria-hidden={visible||undefined} initial={false} animate={{opacity:visible?0:1}} transition={reduced?{duration:0}:tween(motionTokens.startup.reveal)}>{children}</motion.div><AnimatePresence>{visible&&<motion.div key="startup" className="startup-screen" role="status" aria-label="Запуск FI" initial={{opacity:1}} exit={{opacity:0}} transition={reduced?{duration:0}:tween(motionTokens.startup.exit)}><motion.img className="startup-mark" src={brandIcon} alt="" draggable={false} onLoad={()=>setLoaded(true)} onError={()=>setVisible(false)} initial={{opacity:0,scale:.88,y:6,rotate:-5}} animate={loaded?{opacity:1,scale:1,y:0,rotate:0}:undefined} transition={reduced?{duration:0}:{...motionTokens.spring,stiffness:150,damping:24,opacity:tween(.3)}}/></motion.div>}</AnimatePresence></>;
}
