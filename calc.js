
"use strict";
const LIMITS={edad:[18,100],qtd:[0,200],tpe:[40,200],fevi:[20,80],rwt:[0.10,1.00],dosis:[0,1000]};
function finite(v){return typeof v==="number"&&Number.isFinite(v);}
function validateRange(v,min,max,label){
 if(!finite(v)) return `${label}: valor ausente o no numérico.`;
 if(v<min||v>max) return `${label}: fuera del rango permitido (${min}–${max}).`;
 return null;
}
function eligibility(e){
 const reasons=[];
 if(e.sexo!=="mujer") reasons.push("La cohorte descrita incluye mujeres.");
 if(!e.cancerMama) reasons.push("No consta cáncer de mama.");
 if(!e.indicacionAntraciclina) reasons.push("No existe indicación de tratamiento con antraciclinas.");
 if(e.avmPrevia) reasons.push("Antecedente de AVM antes de iniciar antraciclinas.");
 if(e.feviBasalExclusion) reasons.push("FEVI basal <50 %: criterio de exclusión de la cohorte.");
 if(e.miocardiopatia) reasons.push("Miocardiopatía dilatada o hipertrófica establecida.");
 if(e.marcapasosDai) reasons.push("Marcapasos o DAI previo al seguimiento.");
 if(e.dialisis) reasons.push("Enfermedad renal terminal con diálisis.");
 if(e.embarazoLactancia) reasons.push("Embarazo o lactancia durante la inclusión.");
 if(e.antraciclinasPrevias) reasons.push("Exposición previa a antraciclinas.");
 if(e.esperanzaMenor6) reasons.push("Esperanza de vida estimada <6 meses que impide completar seguimiento.");
 if(e.edad<18) reasons.push("Edad inferior a 18 años.");
 if(!e.consentimiento) reasons.push("Falta consentimiento informado.");
 if(!e.datosBasales) reasons.push("No están disponibles los datos cardiovasculares basales requeridos.");
 if(!e.seguimiento) reasons.push("No puede garantizarse el seguimiento programado.");
 return {eligible:reasons.length===0,reasons};
}
function predictorValues(d){
 return {
  edad65:d.edad>=65?1:0, hta:d.hta?1:0, dm:d.dm?1:0,
  dosis240:d.dosis>=240?1:0, qtd50:d.qtd>50?1:0,
  tpe100:d.tpe>100?1:0, fevi50:d.fevi<50?1:0, rwt042:d.rwt<=0.42?1:0
 };
}
function validateData(d){
 const errors=[];
 for(const [v,lim,label] of [["edad",LIMITS.edad,"Edad"],["qtd",LIMITS.qtd,"Dispersión QT"],["tpe",LIMITS.tpe,"Tp-Te"],["fevi",LIMITS.fevi,"FEVI"],["rwt",LIMITS.rwt,"RWT"],["dosis",LIMITS.dosis,"Dosis acumulada"]]){
  const err=validateRange(d[v],lim[0],lim[1],label); if(err)errors.push(err);
 }
 return errors;
}
function riskFromModel(data,model){
 const errors=validateData(data); if(errors.length)return {ok:false,errors};
 const vals=predictorValues(data);
 const ps=model.predictores||[];
 if(model.status==="demo" || !model.riskMethod){
  return {ok:false,demo:true,reason:"Modelo sin calibración: no se calcula riesgo ni puntuación clínica."};
 }
 let risk=null,lp=null,score=null,contrib=[];
 if(model.riskMethod==="cox"){
  if(model.baselineSurvival24==null||model.lpCentrado==null||ps.some(p=>p.beta==null||!finite(p.beta))){
   return {ok:false,demo:true,reason:"Faltan coeficientes β, S0(24) o LP de centrado. No se calcula riesgo."};
  }
  if(!(model.baselineSurvival24>0&&model.baselineSurvival24<=1))return {ok:false,errors:["Supervivencia basal inválida."]};
  lp=0;
  for(const p of ps){const x=vals[p.id]||0; const c=p.beta*x; lp+=c; contrib.push({id:p.id,nombre:p.nombre,valor:x,contribucion:c});}
  risk=1-Math.pow(model.baselineSurvival24,Math.exp(lp-model.lpCentrado));
  if(ps.every(p=>finite(p.puntos))) score=ps.reduce((s,p)=>s+(p.puntos*(vals[p.id]||0)),0);
 } else if(model.riskMethod==="points"){
  if(ps.some(p=>!finite(p.puntos))||!Array.isArray(model.tablaPuntosRiesgo)){
   return {ok:false,demo:true,reason:"Faltan puntos o tabla puntos→riesgo calibrada. No se calcula riesgo."};
  }
  score=ps.reduce((s,p)=>s+(p.puntos*(vals[p.id]||0)),0);
  const row=model.tablaPuntosRiesgo.find(r=>r.puntos===score);
  if(!row||!finite(row.riesgo24))return {ok:false,errors:["No existe correspondencia calibrada para este puntaje."]};
  risk=row.riesgo24/100;
  for(const p of ps)contrib.push({id:p.id,nombre:p.nombre,valor:vals[p.id]||0,contribucion:p.puntos*(vals[p.id]||0)});
 } else return {ok:false,errors:["Método de riesgo no definido en model.json."]};
 if(!finite(risk)||risk<0||risk>1)return {ok:false,errors:["El riesgo calculado está fuera de [0,1]."]};
 const cat=(model.categorias||[]).find(c=>risk*100>=c.min&&risk*100<c.max) || (risk===1?(model.categorias||[]).slice(-1)[0]:null);
 return {ok:true,risk,riskPercent:risk*100,lp,score,category:cat,contrib,values:vals};
}
function calculateDose(rows,factors){
 let total=0;
 for(const r of rows){if(!finite(r.mg)||r.mg<0||!finite(r.factor)||r.factor<=0)throw new Error("Comprueba dosis y factor de equivalencia.");total+=r.mg*r.factor;}
 return total;
}
function calculateRWT(posteriorWall,lvEndDiastolic){
 if(!finite(posteriorWall)||!finite(lvEndDiastolic)||posteriorWall<=0||lvEndDiastolic<=0)throw new Error("Las medidas deben ser números positivos.");
 return (2*posteriorWall)/lvEndDiastolic;
}
if(typeof module!=="undefined")module.exports={LIMITS,eligibility,predictorValues,validateData,riskFromModel,calculateDose,calculateRWT};
