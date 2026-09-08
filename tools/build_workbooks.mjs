import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'outputs/portfolio-20260907');
await fs.mkdir(out,{recursive:true});
const cases=[
 {id:'copper-observatory',title:'Cobre chileno / Chilean copper',group:0,value:1,headers:['Year','Production (kt)'],source:'COCHILCO, 50 años de la minería en cifras. Annual 1976–2024. Nominal values.',labels:['2024 production (kt)','2024 exports (USD m)','2024 LME (US cents/lb)'],formulas:["=Data!B50","=Data!D50","=Data!C50"],note:'Production, prices and export values have different units. No causal attribution.'},
 {id:'feria-demand',title:'Demanda de feria / Market demand',group:0,value:2,headers:['Month','Demand (units)'],source:'Synthetic simulation. Seed 20260907. 128 products; 2023–2025. No observed client impact.',labels:['Demand units','Product count','Months'],formulas:['=SUM(Data!C2:C4609)','=128','=36'],note:'Units are not revenue. Forecast results: see fold_metrics.csv and README.'},
 {id:'bank-campaign',title:'Campañas bancarias / Bank campaigns',group:3,value:2,headers:['Selected top 20%','Observed subscriptions'],source:'UCI Bank Marketing (Moro, Rita & Cortez, 2014), DOI 10.24432/C5K306. CC BY 4.0.',labels:['Held-out records','Observed subscribers','Observed response rate'],formulas:['=COUNTA(Data!A2:A8239)','=SUM(Data!C2:C8239)','=E5/B5'],note:'Model rejected: AUC 0.458. Captured subscriptions are not causal uplift.'}
];
for(const c of cases){
 const data=JSON.parse(await fs.readFile(path.join(root,'case-studies',c.id,'excel-data.json'),'utf8'));
 if(c.id==='copper-observatory'){data.columns=data.columns.slice(0,4);data.data=data.data.map(r=>r.slice(0,4));}
 const wb=Workbook.create();const dash=wb.worksheets.add('Dashboard'),summary=wb.worksheets.add('Summary'),raw=wb.worksheets.add('Data');
 for(const s of [dash,summary,raw]){s.showGridLines=false;s.getRange('A1:N60').format.font={name:'Arial',size:11};s.getRange('A1:N60').format.columnWidth=14;}
 raw.getRangeByIndexes(0,0,1,data.columns.length).values=[data.columns];
 raw.getRangeByIndexes(1,0,data.data.length,data.columns.length).values=data.data;
 raw.tables.add(raw.getRangeByIndexes(0,0,data.data.length+1,data.columns.length).address??`A1:${String.fromCharCode(64+data.columns.length)}${data.data.length+1}`,true,'SourceData');
 raw.getRangeByIndexes(0,0,1,data.columns.length).format={fill:'#1c2d42',font:{bold:true,color:'#ffffff'}};
 raw.freezePanes.freezeRows(1);raw.getRange('A1:D60').format.columnWidth=23;
 raw.getRangeByIndexes(1,1,data.data.length,data.columns.length-1).setNumberFormat(c.id==='copper-observatory'?'#,##0.0':'#,##0');
 if(c.id==='bank-campaign')raw.getRange(`B2:B${data.data.length+1}`).setNumberFormat('0.0000%');
 const sourceCol=data.columns.length+1;raw.getCell(0,sourceCol).values=[['Source / Fuente']];raw.getCell(1,sourceCol).values=[[c.source]];
 raw.getCell(1,sourceCol).format.columnWidth=100;
 const keys=[...new Set(data.data.map(r=>r[c.group]))];
 summary.getRange('A1:B1').values=[c.headers];
 summary.getRange(`A2:A${keys.length+1}`).values=keys.map(v=>[v]);
 const group=String.fromCharCode(65+c.group),value=String.fromCharCode(65+c.value),end=data.data.length+1;
 summary.getRange(`B2:B${keys.length+1}`).formulas=keys.map((_,i)=>[`=SUMIFS(Data!$${value}$2:$${value}$${end},Data!$${group}$2:$${group}$${end},A${i+2})`]);
 summary.getRange('A1:B1').format={fill:'#1c2d42',font:{bold:true,color:'#ffffff'}};summary.getRange('A1:B60').format.columnWidth=27;
 dash.getRange('B2').values=[[c.title]];dash.getRange('B2').format.font={name:'Arial',size:17,bold:true,color:'#1c2d42'};
 for(let i=0;i<3;i++){const col=['B','E','H'][i];dash.getRange(`${col}4`).values=[[c.labels[i]]];dash.getRange(`${col}5`).formulas=[[c.formulas[i]]];dash.getRange(`${col}5`).format.font={size:17,bold:true,color:'#4a5d4e'};dash.getRange(`${col}5`).setNumberFormat(c.id==='bank-campaign'&&i===2?'0.0%':'#,##0.0');}
 dash.getRange('B7').values=[[c.note]];dash.getRange('B7').format.font={size:10,color:'#6e6459'};
 const ch=dash.charts.add(c.id==='bank-campaign'?'bar':'line',summary.getRange(`A1:B${keys.length+1}`));
 ch.title=c.headers[1];ch.setPosition('B10','M28');ch.hasLegend=false;ch.titleTextStyle.typeface='Arial';ch.titleTextStyle.fontSize=14;
 ch.xAxis={axisType:'textAxis',textStyle:{typeface:'Arial',fontSize:10}};ch.yAxis={numberFormatCode:'#,##0',numberFormatSourceLinked:false,textStyle:{typeface:'Arial',fontSize:10}};
 ch.series.items[0].fill='#4a5d4e';ch.series.items[0].line={fill:'#4a5d4e',style:'solid',width:2};
 dash.getRange('B30').values=[['ES: Datos y resumen editables. Tabla dinámica en Pivot al abrir la versión final.']];
 dash.getRange('B31').values=[['EN: Editable source and summary. Native PivotTable on Pivot in the final workbook.']];
 wb.recalculate();
 console.log(c.id,(await wb.inspect({kind:'region',sheetId:'Dashboard',range:'B4:I5',maxChars:1000})).ndjson);
 console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!',options:{useRegex:true,maxResults:10},maxChars:500})).ndjson);
 for(const [s,r] of [['Dashboard','A1:N32'],['Summary','A1:D12'],['Data','A1:F12']]){
  try{const image=await wb.render({sheetName:s,range:r,scale:1.5,format:'png'});await fs.writeFile(path.join(out,`${c.id}-${s}.png`),new Uint8Array(await image.arrayBuffer()));}catch(e){console.log('render issue',s,String(e).slice(0,200));}
 }
 await(await SpreadsheetFile.exportXlsx(wb)).save(path.join(out,`${c.id}.xlsx`));
}
