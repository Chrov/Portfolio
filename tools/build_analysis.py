"""Rebuild portfolio evidence. Python 3.11+, see requirements-analysis.txt."""
from pathlib import Path
import io, json, hashlib, zipfile, sqlite3
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, roc_auc_score, brier_score_loss

ROOT = Path(__file__).resolve().parents[1]
plt.rcParams.update({'font.family':'DejaVu Sans','axes.spines.top':False,'axes.spines.right':False,'axes.titleweight':'bold','figure.facecolor':'#fdfbf7','axes.facecolor':'#fdfbf7','axes.prop_cycle':plt.cycler(color=['#4a5d4e','#b36439','#1c2d42'])})
def save_frame(frame, folder, name):
    frame.to_csv(folder / f'{name}.csv',index=False)
    return frame
def save_json(data,path):
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2,allow_nan=False),encoding='utf-8')
def chart(fig,folder):
    fig.tight_layout(pad=2)
    fig.savefig(folder/'evidence.png',dpi=150)
    plt.close(fig)
def evidence(folder, raw, metrics, source):
    save_json(metrics,folder/'metrics.json')
    save_json({'source':source,'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in raw},'built_utc':pd.Timestamp.now(tz='UTC').isoformat()},folder/'provenance.json')

def copper():
    folder=ROOT/'case-studies/copper-observatory'
    def numeric_file(name,col):
        raw=pd.read_excel(folder/name,header=None)
        year=pd.to_numeric(raw[0],errors='coerce')
        valid=year.between(1976,2024)
        return pd.DataFrame({'year':year[valid].astype(int),col:pd.to_numeric(raw.loc[valid,1],errors='raise')})
    prod=numeric_file('production-source.xlsx','production_kt')
    price=numeric_file('price-source.xlsx','price_us_cent_lb')
    raw=pd.read_excel(folder/'exports-source.xlsx',header=None)
    year=raw[0].map(lambda v: v.year if hasattr(v,'year') else pd.to_numeric(v,errors='coerce'))
    valid=year.between(1976,2024)
    exports=pd.DataFrame({'year':year[valid].astype(int),'exports_usd_m':pd.to_numeric(raw.loc[valid,1],errors='raise')})
    df=prod.merge(price,on='year',validate='one_to_one').merge(exports,on='year',validate='one_to_one').sort_values('year')
    assert len(df)==49 and df.notna().all().all() and df.year.tolist()==list(range(1976,2025))
    for c in ['production_kt','price_us_cent_lb','exports_usd_m']:
        df[c+'_index']=100*df[c]/df[c].iloc[0]
        df[c+'_yoy']=df[c].pct_change()*100
    save_frame(df,folder,'annual')
    last=df.iloc[-1]; prev=df.iloc[-2]
    corr=df[['price_us_cent_lb_yoy','exports_usd_m_yoy']].corr().iloc[0,1]
    fig,ax=plt.subplots(1,2,figsize=(13,4.8))
    for c,label in [('production_kt','Production'),('price_us_cent_lb','Nominal copper price'),('exports_usd_m','Nominal export value')]:ax[0].plot(df.year,df[c+'_index'],label=label)
    ax[0].set(title='Different scales, one reference year',ylabel='Index (1976 = 100)',xlabel='Year');ax[0].legend(fontsize=8)
    ax[1].scatter(df.price_us_cent_lb_yoy,df.exports_usd_m_yoy,alpha=.65)
    ax[1].axhline(0,color='#aaa',lw=.7);ax[1].axvline(0,color='#aaa',lw=.7)
    ax[1].set(title='Price changes and export value',xlabel='Nominal price change (%)',ylabel='Nominal export value change (%)')
    chart(fig,folder)
    metrics={'years':len(df),'latest_year':int(last.year),'production_kt':float(last.production_kt),'exports_usd_m':float(last.exports_usd_m),'price_us_cent_lb':float(last.price_us_cent_lb),'production_yoy_pct':float(last.production_kt_yoy),'exports_yoy_pct':float(last.exports_usd_m_yoy),'price_yoy_pct':float(last.price_us_cent_lb_yoy),'change_correlation':float(corr)}
    evidence(folder,list(folder.glob('*-source.xlsx')),metrics,'https://www.cochilco.cl/web/50-anios-de-la-mineria-en-cifras/')
    sql='''-- Annual grain. Prices and export values are nominal; never sum prices.
WITH prior AS (
 SELECT *, LAG(production_kt) OVER (ORDER BY year) AS previous_production,
 LAG(exports_usd_m) OVER (ORDER BY year) AS previous_exports FROM annual
)
SELECT year, production_kt, exports_usd_m,
 100.0 * (production_kt / previous_production - 1) AS production_yoy_pct,
 100.0 * (exports_usd_m / previous_exports - 1) AS exports_yoy_pct
FROM prior ORDER BY year;
'''
    (folder/'analysis.sql').write_text(sql)
    with sqlite3.connect(':memory:') as conn:
        df.to_sql('annual',conn,index=False)
        result=pd.read_sql_query(sql,conn)
        assert np.allclose(result.production_yoy_pct.iloc[1:],df.production_kt_yoy.iloc[1:])
    return metrics

def feria():
    folder=ROOT/'case-studies/feria-demand'
    rng=np.random.default_rng(20260907)
    dates=pd.date_range('2023-01-01','2025-12-31')
    frames=[]
    for i in range(1,129):
        base=rng.lognormal(1.6,.8)
        seasonal=1+.22*np.sin(2*np.pi*dates.dayofyear.to_numpy()/365.25+i/10)
        weekly=np.where(dates.dayofweek>=5,1.35,.9)
        intermittent=rng.random(len(dates))>.22 if i%4==0 else np.ones(len(dates),dtype=bool)
        demand=rng.poisson(base*seasonal*weekly)*intermittent
        frames.append(pd.DataFrame({'date':dates,'product_id':f'SKU-{i:03}','demand_units':demand}))
    df=pd.concat(frames,ignore_index=True)
    assert len(df)==128*len(dates) and not df.duplicated(['date','product_id']).any() and (df.demand_units>=0).all()
    save_frame(df.assign(date=df.date.dt.strftime('%Y-%m-%d')),folder,'demand')
    # Fixed-origin 28-day horizons. Every forecast uses only data before the origin.
    backtests=[]; preds=[]
    for origin in pd.to_datetime(['2025-08-01','2025-09-01','2025-10-01','2025-11-01','2025-12-01']):
        for sku,g in df.groupby('product_id',sort=False):
            train=g[g.date<origin];test=g[(g.date>=origin)&(g.date<origin+pd.Timedelta(days=28))]
            for model,days in [('seasonal_naive',7),('weekday_mean_8w',56)]:
                weekday=train.tail(days).groupby(train.tail(days).date.dt.dayofweek).demand_units.mean()
                prediction=test.date.dt.dayofweek.map(weekday).to_numpy()
                truth=test.demand_units.to_numpy()
                backtests.append({'origin':str(origin.date()),'product_id':sku,'model':model,'actual_units':int(truth.sum()),'absolute_error':float(np.abs(truth-prediction).sum()),'signed_error':float((prediction-truth).sum())})
                if origin.month==12:
                    preds.extend({'date':str(d.date()),'product_id':sku,'model':model,'actual_units':int(y),'forecast_units':float(p)} for d,y,p in zip(test.date,truth,prediction))
    folds=pd.DataFrame(backtests);save_frame(folds,folder,'backtest')
    aggregate=folds.groupby(['origin','model'],as_index=False)[['actual_units','absolute_error','signed_error']].sum()
    aggregate['wmape']=aggregate.absolute_error/aggregate.actual_units
    save_frame(aggregate,folder,'fold_metrics');save_frame(pd.DataFrame(preds),folder,'holdout_predictions')
    # Candidate selected on Aug-Nov only; December never used to choose a model.
    validation=folds[folds.origin<'2025-12-01'].groupby('model')[['absolute_error','actual_units']].sum()
    winner=(validation.absolute_error/validation.actual_units).idxmin()
    hold=aggregate[aggregate.origin=='2025-12-01'].set_index('model')
    monthly=df.assign(month=df.date.dt.strftime('%Y-%m')).groupby('month',as_index=False).demand_units.sum()
    save_frame(monthly,folder,'monthly')
    totals=df[df.date<'2025-12-01'].groupby('product_id',as_index=False).demand_units.sum().sort_values('demand_units',ascending=False)
    totals['cumulative_share']=totals.demand_units.cumsum()/totals.demand_units.sum()
    # Include the crossing item in class A/B using cumulative share before each item.
    before=totals.cumulative_share-totals.demand_units/totals.demand_units.sum()
    totals['volume_class']=np.select([before<.8,before<.95],['A','B'],default='C')
    save_frame(totals,folder,'product_priority')
    fig,ax=plt.subplots(1,2,figsize=(13,4.8))
    ax[0].plot(pd.to_datetime(monthly.month),monthly.demand_units)
    ax[0].set(title='Demand history — synthetic data',ylabel='Units / month');ax[0].tick_params(axis='x',rotation=30)
    for model,g in aggregate.groupby('model'):ax[1].plot(g.origin.str.slice(5),g.wmape,marker='o',label=model)
    ax[1].set(title='Fixed-origin, 28-day forecast error',ylabel='WMAPE',xlabel='2025 origin (December = hold-out)');ax[1].legend(fontsize=8)
    chart(fig,folder)
    metrics={'rows':len(df),'products':128,'days':len(dates),'selected_model':winner,'holdout_wmape':float(hold.loc[winner,'wmape']),'baseline_wmape':float(hold.loc['seasonal_naive','wmape']),'relative_error_reduction_pct':float(100*(1-hold.loc[winner,'wmape']/hold.loc['seasonal_naive','wmape'])),'class_a_products':int((totals.volume_class=='A').sum()),'seed':20260907}
    evidence(folder,[folder/'demand.csv'],metrics,'Synthetic data generated by tools/build_analysis.py; no client records or measured financial outcomes.')
    sql='''-- Historical units: volume priority, not revenue ABC (no prices are supplied).
WITH totals AS (SELECT product_id, SUM(demand_units) AS units FROM demand
 WHERE date < '2025-12-01' GROUP BY product_id), ranked AS (
 SELECT *, SUM(units) OVER (ORDER BY units DESC, product_id ROWS UNBOUNDED PRECEDING) AS cumulative,
 SUM(units) OVER () AS total FROM totals)
SELECT *, 1.0*cumulative/total AS cumulative_share FROM ranked ORDER BY units DESC, product_id;
'''
    (folder/'analysis.sql').write_text(sql)
    with sqlite3.connect(':memory:') as conn:
        df.to_sql('demand',conn,index=False)
        result=pd.read_sql_query(sql,conn)
        assert result.units.sum()==totals.demand_units.sum()
    return metrics

def bank():
    folder=ROOT/'case-studies/bank-campaign'
    with zipfile.ZipFile(folder/'source.zip') as z:
        inner=z.read('bank-additional.zip')
    with zipfile.ZipFile(io.BytesIO(inner)) as z:
        df=pd.read_csv(z.open('bank-additional/bank-additional-full.csv'),sep=';')
    # Preserve original order, documented by UCI as chronological. No fabricated dates.
    df.insert(0,'record_order',np.arange(len(df)))
    n=len(df);a=int(n*.6);b=int(n*.8)
    y=(df.y=='yes').astype(int)
    cols=['contact','month','day_of_week','pdays','previous','poutcome','emp.var.rate','cons.price.idx','cons.conf.idx','euribor3m','nr.employed']
    # Duration leaks call outcome; campaign count includes current contact. Demographics not used.
    cat=['contact','month','day_of_week','poutcome'];num=[c for c in cols if c not in cat]
    prep=ColumnTransformer([('cat',OneHotEncoder(handle_unknown='ignore'),cat),('num',StandardScaler(),num)])
    model=make_pipeline(prep,LogisticRegression(max_iter=2000,C=1.0))
    model.fit(df.iloc[:a][cols],y.iloc[:a])
    val=model.predict_proba(df.iloc[a:b][cols])[:,1]
    score=model.predict_proba(df.iloc[b:][cols])[:,1]
    truth=y.iloc[b:].to_numpy()
    order=np.argsort(-score,kind='stable')
    capacity=.2;k=int(np.ceil(len(truth)*capacity));positives=int(truth[order[:k]].sum())
    rows=[]
    for fraction in [.1,.2,.3,.4,.5,.6,.7,.8,.9,1.0]:
        kk=int(np.ceil(len(truth)*fraction)); captured=int(truth[order[:kk]].sum())
        rows.append({'contact_fraction':fraction,'contacts':kk,'observed_subscriptions':captured,'precision':captured/kk,'recall':captured/int(truth.sum()),'random_expected_subscriptions':kk*truth.mean()})
    capacity_df=save_frame(pd.DataFrame(rows),folder,'capacity_curve')
    records=pd.DataFrame({'record_order':df.iloc[b:].record_order.to_numpy(),'probability':score,'subscribed':truth,'selected_top20':np.isin(np.arange(len(truth)),order[:k]).astype(int)})
    save_frame(records,folder,'holdout_scores')
    # Retain complete source for reruns within its CC BY 4.0 license.
    save_frame(df,folder,'campaign_records')
    metrics={'records':n,'train_records':a,'validation_records':b-a,'holdout_records':n-b,'train_rate':float(y.iloc[:a].mean()),'validation_rate':float(y.iloc[a:b].mean()),'holdout_rate':float(truth.mean()),'validation_ap':float(average_precision_score(y.iloc[a:b],val)),'holdout_ap':float(average_precision_score(truth,score)),'holdout_auc':float(roc_auc_score(truth,score)),'brier':float(brier_score_loss(truth,score)),'contacts_top20':k,'subscriptions_top20':positives,'precision_top20':positives/k,'lift_top20':float((positives/k)/truth.mean()),'recall_top20':float(positives/truth.sum())}
    fig,ax=plt.subplots(1,2,figsize=(13,4.8))
    ax[0].plot(capacity_df.contact_fraction*100,capacity_df.recall*100,label='Logistic ranking')
    ax[0].plot([0,100],[0,100],ls='--',label='Random expectation')
    ax[0].set(title='Capacity versus observed capture',xlabel='Contact capacity (%)',ylabel='Observed subscribers captured (%)');ax[0].legend(fontsize=8)
    ax[1].bar(['Train','Validation','Hold-out'],[metrics['train_rate']*100,metrics['validation_rate']*100,metrics['holdout_rate']*100])
    ax[1].set(title='Chronological cohorts shift',ylabel='Observed subscription rate (%)')
    chart(fig,folder)
    evidence(folder,[folder/'source.zip'],metrics,'Moro, Rita & Cortez (2014), UCI Bank Marketing. DOI:10.24432/C5K306. CC BY 4.0. https://archive.ics.uci.edu/dataset/222/bank+marketing')
    sql='''-- Fixed held-out cohort. This is descriptive capture, not causal uplift.
SELECT selected_top20, COUNT(*) AS contacts, SUM(subscribed) AS subscriptions,
 AVG(1.0*subscribed) AS observed_rate FROM holdout_scores GROUP BY selected_top20;
'''
    (folder/'analysis.sql').write_text(sql)
    with sqlite3.connect(':memory:') as conn:
        records.to_sql('holdout_scores',conn,index=False)
        result=pd.read_sql_query(sql,conn)
        assert int(result.loc[result.selected_top20==1,'subscriptions'].iloc[0])==positives
    return metrics

def prepare_excel_data():
    folder=ROOT/'case-studies/feria-demand'
    demand=pd.read_csv(folder/'demand.csv')
    monthly=demand.assign(month=demand.date.str[:7]).groupby(['month','product_id'],as_index=False).demand_units.sum()
    save_frame(monthly,folder,'monthly_products')
    for slug,filename in [('copper-observatory','annual'),('feria-demand','monthly_products'),('bank-campaign','holdout_scores')]:
        folder=ROOT/'case-studies'/slug
        data=pd.read_csv(folder/(filename+'.csv'))
        if slug=='copper-observatory': data=data.iloc[:,:4]
        data.to_json(folder/'excel-data.json',orient='split',index=False)

if __name__=='__main__':
    summary={'copper-observatory':copper(),'feria-demand':feria(),'bank-campaign':bank()}
    save_json(summary,ROOT/'case-studies/summary.json')
    prepare_excel_data()
    print(json.dumps(summary,indent=2))
