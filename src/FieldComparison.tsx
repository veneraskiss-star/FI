import type {ReactNode} from 'react';
export function FieldComparison({current,children}:{current:string;children:ReactNode}){
 return <div className="field-comparison"><section className="comparison-current"><h4>Сейчас</h4><p>{current||'Не указано'}</p></section><section className="comparison-next"><h4>Предлагается</h4>{children}</section></div>;
}
