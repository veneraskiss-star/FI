import {ThinkingOrb} from 'thinking-orbs';
export function AnalysisProgress(){
 return <section className="analysis-progress" role="status" aria-live="polite"><ThinkingOrb state="working" size={64} speed={0.75} theme="auto" aria-hidden="true"/><div><h2>Анализируем информацию</h2><p>Готовим предложения по событиям, задачам и карточке клиента.</p></div></section>;
}
