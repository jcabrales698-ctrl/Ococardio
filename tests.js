
"use strict";
const assert=require("node:assert/strict");
const c=require("./calc.js");
const base={edad:45,hta:false,dm:false,dosis:0,qtd:20,tpe:70,fevi:60,rwt:0.50};
const demo={status:"demo",baselineSurvival24:null,lpCentrado:null,riskMethod:null,predictores:[]};
const e={sexo:"mujer",cancerMama:true,indicacionAntraciclina:true,avmPrevia:false,feviBasalExclusion:false,miocardiopatia:false,marcapasosDai:false,dialisis:false,embarazoLactancia:false,antraciclinasPrevias:false,esperanzaMenor6:false,edad:45,consentimiento:true,datosBasales:true,seguimiento:true};
const synthetic={status:"validado_interno",riskMethod:"cox",baselineSurvival24:0.99,lpCentrado:0,predictores:[
{id:"edad65",nombre:"Edad",beta:0.2,puntos:1},{id:"hta",nombre:"HTA",beta:0.3,puntos:1},{id:"dm",nombre:"DM",beta:0.4,puntos:1},{id:"dosis240",nombre:"Dosis",beta:0.5,puntos:1},{id:"qtd50",nombre:"QTd",beta:0.6,puntos:1},{id:"tpe100",nombre:"TpTe",beta:0.7,puntos:1},{id:"fevi50",nombre:"FEVI",beta:0.8,puntos:1},{id:"rwt042",nombre:"RWT",beta:0.9,puntos:1}
],categorias:[{min:0,max:5,label:"Bajo"},{min:5,max:10,label:"Moderado"},{min:10,max:20,label:"Alto"},{min:20,max:100,label:"Muy alto"}]};
const cases=[];
function test(name,fn){try{fn();cases.push({name,resultado:"PASS"});console.log("PASS",name)}catch(err){cases.push({name,resultado:"FAIL",error:err.message});console.error("FAIL",name,err);process.exitCode=1;}}
test("1. Caso DEMO: plantilla sin parámetros no entrega riesgo ni puntaje",()=>{const r=c.riskFromModel(base,demo);assert.equal(r.ok,false);assert.equal(r.demo,true);});
test("2. Caso de bajo riesgo (fixture sintético DEMO): cálculo finito",()=>{const r=c.riskFromModel(base,synthetic);assert.equal(r.ok,true);assert.ok(r.risk>=0&&r.risk<=1);assert.ok(Math.abs(r.risk-0.01)<1e-10);});
test("3. Caso de muy alto riesgo (fixture sintético DEMO): mayor que bajo",()=>{const high={...base,edad:70,hta:true,dm:true,dosis:300,qtd:80,tpe:130,fevi:40,rwt:0.35};const lo=c.riskFromModel(base,synthetic),hi=c.riskFromModel(high,synthetic);assert.ok(hi.risk>lo.risk);assert.ok(Math.abs(hi.risk-0.5589550960232452)<1e-10);});
test("4. Datos faltantes y valores fuera de rango bloquean",()=>{assert.ok(c.validateData({...base,edad:null}).length);assert.ok(c.validateData({...base,qtd:250}).length);});
test("5. Elegibilidad y monotonía: exclusión bloquea; añadir predictor adverso no reduce LP/riesgo",()=>{assert.equal(c.eligibility({...e,avmPrevia:true}).eligible,false);const a=c.riskFromModel(base,synthetic),b=c.riskFromModel({...base,hta:true},synthetic);assert.ok(b.risk>a.risk);});
test("6. Cox funciona sin puntos y la modalidad puntos no exige S0(24)",()=>{const cox={...synthetic,predictores:synthetic.predictores.map(p=>({...p,puntos:null}))};const a=c.riskFromModel(base,cox);assert.equal(a.ok,true);assert.equal(a.score,null);const pts={status:"derivado",riskMethod:"points",baselineSurvival24:null,lpCentrado:null,predictores:synthetic.predictores.map(p=>({...p,beta:null})),tablaPuntosRiesgo:Array.from({length:9},(_,i)=>({puntos:i,riesgo24:i*2})),categorias:synthetic.categorias};assert.equal(c.riskFromModel(base,pts).ok,true);});
console.log("\\nResumen de pruebas DEMO:",cases);
