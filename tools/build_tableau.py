"""Build a portable TWBX using the user's existing Tableau-authored template."""
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile
import pandas as pd
import tableau_workbook_base as t
R=Path(__file__).resolve().parents[1]
case=R/'case-studies/feria-demand';out=case/'tableau';out.mkdir(exist_ok=True)
data=out/'Data';data.mkdir(exist_ok=True)
monthly=pd.read_csv(case/'monthly.csv').rename(columns={'month':'date'});monthly.date+='-01';monthly.to_csv(data/'monthly.csv',index=False)
fold=pd.read_csv(case/'fold_metrics.csv').rename(columns={'origin':'date'});fold.to_csv(data/'folds.csv',index=False)
pd.read_csv(case/'product_priority.csv').to_csv(data/'priority.csv',index=False)
t.DATA=str(data);t.DATA_DIR='Data';t.EXTRACTS=str(out/'Data');t.TEMPLATE=str(R/'tools/tableau-template.twb');t.OUT=str(out/'Demand.twb')
t.FORCE_DIMENSION.update({'product_id','volume_class','model'})
t.SHEETS=[
dict(name='Demand / Demanda',source='monthly.csv',mark='Line',title='Synthetic demand / Demanda simulada (units)',cols=('date','Day-Trunc'),rows=('demand_units','Sum')),
dict(name='Forecast / Pronóstico',source='folds.csv',mark='Line',title='28-day WMAPE / Error a 28 días',cols=('date','Day-Trunc'),rows=('wmape','Avg'),color=('model','None-n')),
dict(name='Priority / Prioridad',source='priority.csv',mark='Bar',title='Volume priority / Prioridad por unidades',cols=('volume_class','None-n'),rows=('demand_units','Sum')),
dict(name='Products / Productos',source='priority.csv',mark='Bar',title='Product count / Cantidad de productos',cols=('volume_class','None-n'),rows=('product_id','Count')),
]
t.DERIV['Count']=('cnt','qk','quantitative','Count')
t.GRID=[['Demand / Demanda','Forecast / Pronóstico'],['Priority / Prioridad','Products / Productos']]
t.main()
tree=ET.parse(t.OUT)
tree.getroot().find('dashboards/dashboard').set('name','Demanda simulada / Synthetic demand')
for connection in tree.findall('.//extract/connection'):
    connection.set('dbname','Data/'+Path(connection.get('dbname')).name)
tree.write(t.OUT,encoding='utf-8',xml_declaration=True)
with zipfile.ZipFile(case/'dashboard.twbx','w',zipfile.ZIP_DEFLATED) as z:
    z.write(t.OUT,'Demand.twb')
    for p in sorted(data.glob('*')):z.write(p,'Data/'+p.name)
print(case/'dashboard.twbx')
