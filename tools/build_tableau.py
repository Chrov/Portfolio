"""Build a portable TWBX using the user's existing Tableau-authored template."""
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile, copy
import pandas as pd
import tableau_workbook_base as t
R=Path(__file__).resolve().parents[1]
case=R/'case-studies/feria-demand';out=case/'tableau';out.mkdir(exist_ok=True)
data=out/'Data';data.mkdir(exist_ok=True)
monthly=pd.read_csv(case/'monthly.csv').rename(columns={'month':'date'});monthly.date+='-01';monthly.to_csv(data/'monthly.csv',index=False)
fold=pd.read_csv(case/'fold_metrics.csv').rename(columns={'origin':'date'})
fold.wmape*=100
fold.to_csv(data/'folds.csv',index=False)
pd.read_csv(case/'product_priority.csv').to_csv(data/'priority.csv',index=False)
t.DATA=str(data);t.DATA_DIR='Data';t.EXTRACTS=str(out/'Data');t.TEMPLATE=str(R/'tools/tableau-template.twb');t.OUT=str(out/'Demand.twb')
t.FORCE_DIMENSION.update({'product_id','volume_class','model'})
t.SHEETS=[
dict(name='Demand / Demanda',source='monthly.csv',mark='Line',title='Synthetic demand / Demanda simulada (units)',cols=('date','Day-Trunc'),rows=('demand_units','Sum')),
dict(name='Forecast / Pronóstico',source='folds.csv',mark='Line',title='WMAPE %: naive (blue/azul), 8w mean (orange/naranja)',cols=('date','Day-Trunc'),rows=('wmape','Avg'),color=('model','None-n')),
dict(name='Priority / Prioridad',source='priority.csv',mark='Bar',title='Volume priority / Prioridad por unidades',cols=('volume_class','None-n'),rows=('demand_units','Sum')),
dict(name='Products / Productos',source='priority.csv',mark='Bar',title='Product count / Cantidad de productos',cols=('volume_class','None-n'),rows=('product_id','Count')),
]
t.DERIV['Count']=('cnt','qk','quantitative','Count')
t.GRID=[['Demand / Demanda','Forecast / Pronóstico'],['Priority / Prioridad','Products / Productos']]
t.main()
tree=ET.parse(t.OUT)
for dashboard in tree.findall('.//dashboard'):
    dashboard.attrib.pop('enable-sort-zone-taborder',None)
tree.getroot().find('dashboards/dashboard').set('name','Demanda simulada / Synthetic demand')
dashboard=tree.find('dashboards/dashboard')
zones=dashboard.find('zones')
zones.clear()
for i,sheet in enumerate(t.SHEETS):
    zone=ET.SubElement(zones,'zone',{'id':str(i+1),'name':sheet['name'],'x':str(1000+(i%2)*50000),'y':str(1000+(i//2)*50000),'w':'48000','h':'48000'})
for connection in tree.findall('.//extract/connection'):
    connection.set('dbname','Data/'+Path(connection.get('dbname')).name)
for ds in tree.findall('datasources/datasource'):
    # Read the packaged Hyper table directly; do not retain stale logical-table
    # identifiers from the original multi-source CSV template.
    direct=copy.deepcopy(ds.find('extract/connection'))
    for tag in ['connection','extract','object-graph']:
        child=ds.find(tag)
        if child is not None: ds.remove(child)
    ds.insert(0,direct)
tree.write(t.OUT,encoding='utf-8',xml_declaration=True)
with zipfile.ZipFile(case/'dashboard.twbx','w',zipfile.ZIP_DEFLATED) as z:
    z.write(t.OUT,'Demand.twb')
    for p in sorted(data.glob('*')):z.write(p,'Data/'+p.name)
print(case/'dashboard.twbx')
