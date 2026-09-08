"""Portable PBIP snapshot: rerun after build_analysis.py to refresh source data."""
from pathlib import Path
import json,base64,hashlib,uuid
R=Path(__file__).resolve().parents[1]
out=R/'case-studies/copper-observatory/powerbi';out.mkdir(exist_ok=True)
S='https://developer.microsoft.com/json-schemas/fabric/'
def write(p,v):
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,indent=2),encoding='utf-8')
report=out/'Copper.Report';model=out/'Copper.SemanticModel'
for directory,kind in [(report,'Report'),(model,'SemanticModel')]:
    write(directory/'.platform',{'$schema':S+'gitIntegration/platformProperties/2.0.0/schema.json','metadata':{'type':kind,'displayName':'Copper'},'config':{'version':'2.0','logicalId':str(uuid.uuid5(uuid.NAMESPACE_URL,'Chrov/copper/'+kind))}})
write(out/'Copper.pbip',{'$schema':S+'pbip/pbipProperties/1.0.0/schema.json','version':'1.0','artifacts':[{'report':{'path':'Copper.Report'}}],'settings':{'enableAutoRecovery':True}})
write(report/'definition.pbir',{'$schema':S+'item/report/definitionProperties/2.0.0/schema.json','version':'4.0','datasetReference':{'byPath':{'path':'../Copper.SemanticModel'}}})
write(model/'definition.pbism',{'$schema':S+'item/semanticModel/definitionProperties/1.0.0/schema.json','version':'4.2','settings':{'qnaEnabled':False}})
definition=model/'definition';(definition/'tables').mkdir(parents=True,exist_ok=True)
(definition/'database.tmdl').write_text('database\n\tcompatibilityLevel: 1600\n')
(definition/'model.tmdl').write_text('model Model\n\tculture: en-US\n\tdefaultPowerBIDataSourceVersion: powerBI_V3\n\tsourceQueryCulture: en-US\n\nref table Annual\n')
cols=['year','production_kt','price_us_cent_lb','exports_usd_m']
import pandas as pd
df=pd.read_csv(R/'case-studies/copper-observatory/annual.csv')[cols]
encoded=base64.b64encode(df.to_csv(index=False).encode()).decode()
text='table Annual\n'
for col in cols:
    text+=f'\tcolumn {col}\n\t\tdataType: '+('int64' if col=='year' else 'double')+f'\n\t\tsourceColumn: {col}\n\t\tsummarizeBy: '+('none' if col=='year' else 'sum')+'\n\n'
for name,expr in [('Production kt','SUM(Annual[production_kt])'),('Exports USD m','SUM(Annual[exports_usd_m])'),('Price cents lb','AVERAGE(Annual[price_us_cent_lb])')]:
    text+=f"\tmeasure '{name}' = {expr}\n\t\tformatString: #,0.0\n\n"
text+='\tpartition Annual = m\n\t\tmode: import\n\t\tsource =\n'
lines=['let',f' Source = Csv.Document(Binary.FromText("{encoded}", BinaryEncoding.Base64),[Delimiter=",",Columns=4,Encoding=65001,QuoteStyle=QuoteStyle.Csv]),',' Headers = Table.PromoteHeaders(Source,[PromoteAllScalars=true]),',' Typed = Table.TransformColumnTypes(Headers,{{"year",Int64.Type},{"production_kt",type number},{"price_us_cent_lb",type number},{"exports_usd_m",type number}})','in Typed']
text+='\n'.join('\t\t\t'+l for l in lines)+'\n'
(definition/'tables/Annual.tmdl').write_text(text,encoding='utf-8')
d=report/'definition'
write(d/'version.json',{'$schema':S+'item/report/definition/versionMetadata/1.0.0/schema.json','version':'2.0.0'})
write(d/'report.json',{'$schema':S+'item/report/definition/report/3.3.0/schema.json','themeCollection':{}})
pages=['a'*20,'b'*20]
write(d/'pages/pages.json',{'$schema':S+'item/report/definition/pagesMetadata/1.0.0/schema.json','pageOrder':pages,'activePageName':pages[0]})
for lang,p in zip(['ES','EN'],pages):
    page=d/'pages'/p
    write(page/'page.json',{'$schema':S+'item/report/definition/page/2.1.0/schema.json','name':p,'displayName':('Cobre: volumen y valor' if lang=='ES' else 'Copper: volume and value'),'displayOption':'FitToPage','height':720,'width':1280})
    for i,(measure,x,y,w,h,title) in enumerate([
        ('Exports USD m',25,20,1230,300,'Exportaciones nominales (USD millones)' if lang=='ES' else 'Nominal exports (USD million)'),
        ('Production kt',25,355,590,330,'Producción (miles de toneladas)' if lang=='ES' else 'Production (thousand tonnes)'),
        ('Price cents lb',665,355,590,330,'Precio LME nominal (centavos USD/libra)' if lang=='ES' else 'Nominal LME price (US cents/lb)')]):
        name=hashlib.sha256(f'{lang}{i}'.encode()).hexdigest()[:20]
        projection={'field':{'Measure':{'Expression':{'SourceRef':{'Entity':'Annual'}},'Property':measure}},'queryRef':f'Annual.{measure}','nativeQueryRef':title}
        cat={'field':{'Column':{'Expression':{'SourceRef':{'Entity':'Annual'}},'Property':'year'}},'queryRef':'Annual.year','nativeQueryRef':'Year'}
        visual={'$schema':S+'item/report/definition/visualContainer/2.9.0/schema.json','name':name,'position':{'x':x,'y':y,'width':w,'height':h,'z':i*1000,'tabOrder':i*1000},'visual':{'visualType':'lineChart','query':{'queryState':{'Category':{'projections':[cat]},'Y':{'projections':[projection]}}}}}
        def literal(value): return {'expr':{'Literal':{'Value':value}}}
        visual['visual']['visualContainerObjects']={'title':[{'properties':{
            'show':literal('true'),'text':literal("'"+title+"'"),
            'fontSize':literal('14D'),
            'fontColor':{'solid':{'color':literal("'#1C2D42'")}}
        }}]}
        write(page/'visuals'/name/'visual.json',visual)
print(out/'Copper.pbip')
